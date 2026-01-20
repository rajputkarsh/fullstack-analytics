import { NextRequest, NextResponse } from "next/server";
import {
  getWebsiteByTrackingId,
  insertEvents,
  upsertSession,
  type EventInsert,
  type SessionUpsert,
} from "@/lib/analytics/repository";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BODY_BYTES = 8 * 1024;
const MAX_EVENTS_PER_REQUEST = 25;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 120;
const trackingBuckets = new Map<string, { count: number; resetAt: number }>();

type TrackEventPayload = {
  tracking_id: string;
  session_id?: string;
  event_type: string;
  event_payload: {
    page: {
      url?: string;
      pathname?: string;
      title?: string;
    };
    device: {
      user_agent?: string;
      device_type?: "mobile" | "tablet" | "desktop";
      os_name?: string;
      browser_name?: string;
    };
    referrer?: string;
    timestamp?: string;
  };
};

function rateLimit(trackingId: string) {
  const now = Date.now();
  const bucket = trackingBuckets.get(trackingId);
  if (!bucket || bucket.resetAt <= now) {
    trackingBuckets.set(trackingId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function pruneRateLimitBuckets() {
  if (trackingBuckets.size < 1000) return;
  const now = Date.now();
  for (const [key, bucket] of trackingBuckets.entries()) {
    if (bucket.resetAt <= now) {
      trackingBuckets.delete(key);
    }
  }
}

function toSafeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

function toSafeCountry(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function resolveCountry(request: NextRequest) {
  const headerCountry =
    toSafeCountry(request.headers.get("x-vercel-ip-country")) ||
    toSafeCountry(request.headers.get("cf-ipcountry")) ||
    toSafeCountry(request.headers.get("x-country")) ||
    toSafeCountry(request.headers.get("x-geo-country"));

  if (headerCountry) return headerCountry;

  if (process.env.NODE_ENV === "development") {
    return (
      toSafeCountry(process.env.TRACKING_DEV_COUNTRY) ||
      toSafeCountry(request.headers.get("x-dev-country")) ||
      undefined
    );
  }

  return undefined;
}

function normalizeDeviceType(value: unknown) {
  if (value === "mobile" || value === "tablet" || value === "desktop") {
    return value;
  }
  return undefined;
}

function toEventPayload(value: unknown): TrackEventPayload | null {
  if (!value || typeof value !== "object") return null;
  return value as TrackEventPayload;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413, headers: corsHeaders },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload." },
        { status: 400, headers: corsHeaders },
      );
    }
    const payloads = Array.isArray(rawBody) ? rawBody : [rawBody];
    if (payloads.length === 0 || payloads.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: "Invalid batch size." },
        { status: 400, headers: corsHeaders },
      );
    }

    const normalizedPayloads = payloads
      .map(toEventPayload)
      .filter((value): value is TrackEventPayload => Boolean(value));

    if (normalizedPayloads.length !== payloads.length) {
      return NextResponse.json(
        { error: "Invalid event payload." },
        { status: 400, headers: corsHeaders },
      );
    }

    const trackingId = toSafeString(normalizedPayloads[0]?.tracking_id, 64);
    if (!trackingId) {
      return NextResponse.json(
        { error: "Tracking ID is required." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!normalizedPayloads.every((event) => event.tracking_id === trackingId)) {
      return NextResponse.json(
        { error: "Mixed tracking IDs are not allowed." },
        { status: 400, headers: corsHeaders },
      );
    }

    pruneRateLimitBuckets();
    if (!rateLimit(trackingId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: corsHeaders },
      );
    }

    const website = await getWebsiteByTrackingId(trackingId);
    if (!website) {
      return NextResponse.json(
        { error: "Tracking ID not found." },
        { status: 404, headers: corsHeaders },
      );
    }

    const country = resolveCountry(request);
    const events: EventInsert[] = [];
    const sessions = new Map<string, SessionUpsert>();

    for (const event of normalizedPayloads) {
      const eventType = toSafeString(event.event_type, 50);
      const payload = event.event_payload;
      const sessionId = toSafeString(event.session_id, 64);

      if (!eventType || !payload || !sessionId) {
        return NextResponse.json(
          { error: "Invalid event payload." },
          { status: 400, headers: corsHeaders },
        );
      }

      const pageUrl = toSafeString(payload?.page?.url, 1000);
      const pagePath = toSafeString(payload?.page?.pathname, 1000);
      const pageTitle = toSafeString(payload?.page?.title, 500);
      const referrer = toSafeString(payload?.referrer, 500);
      const deviceType = normalizeDeviceType(payload?.device?.device_type) ?? "unknown";
      const browser = toSafeString(payload?.device?.browser_name, 100) ?? "Unknown";
      const os = toSafeString(payload?.device?.os_name, 100) ?? "Unknown";
      const observedAt = new Date();

      if (!pageUrl && !pagePath) {
        return NextResponse.json(
          { error: "Page data is required." },
          { status: 400, headers: corsHeaders },
        );
      }

      events.push({
        websiteId: website.id,
        trackingId,
        sessionId,
        eventType,
        pageUrl,
        pagePath,
        pageTitle,
        referrer,
        deviceType,
        browser,
        os,
        country,
        createdAt: observedAt,
      });

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          id: sessionId,
          websiteId: website.id,
          firstSeenAt: observedAt,
          lastSeenAt: observedAt,
          deviceType,
          browser,
          os,
          country,
        });
      } else {
        const existing = sessions.get(sessionId)!;
        existing.lastSeenAt = observedAt;
      }
    }

    await Promise.all([...sessions.values()].map((session) => upsertSession(session)));
    await insertEvents(events);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Unable to process tracking event." },
      { status: 500, headers: corsHeaders },
    );
  }
}

