import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/configs/db";
import { analyticsEventsTable, websitesTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const ipBucket = new Map<string, { count: number; resetAt: number }>();

type TrackEventPayload = {
  tracking_id: string;
  session_id?: string;
  event_type: "page_view";
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

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }
  return request.ip ?? undefined;
}

function getRateLimitKey(ip: string | undefined) {
  if (!ip) {
    return "anonymous";
  }
  const salt = process.env.TRACKING_IP_HASH_SALT ?? "tracking-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function rateLimit(key: string) {
  const now = Date.now();
  const bucket = ipBucket.get(key);
  if (!bucket || bucket.resetAt <= now) {
    ipBucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function pruneRateLimitBuckets() {
  if (ipBucket.size < 1000) return;
  const now = Date.now();
  for (const [key, bucket] of ipBucket.entries()) {
    if (bucket.resetAt <= now) {
      ipBucket.delete(key);
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

function toSafeTimestamp(value: unknown) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
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

    pruneRateLimitBuckets();
    const rateKey = getRateLimitKey(getClientIp(request));
    if (!rateLimit(rateKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: corsHeaders },
      );
    }

    let body: TrackEventPayload;
    try {
      body = (await request.json()) as TrackEventPayload;
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload." },
        { status: 400, headers: corsHeaders },
      );
    }
    const trackingId = toSafeString(body?.tracking_id, 64);
    const eventType = body?.event_type;
    const payload = body?.event_payload;

    if (!trackingId) {
      return NextResponse.json(
        { error: "Tracking ID is required." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (eventType !== "page_view" || !payload) {
      return NextResponse.json(
        { error: "Invalid event payload." },
        { status: 400, headers: corsHeaders },
      );
    }

    const website = await db
      .select({ userId: websitesTable.userId })
      .from(websitesTable)
      .where(eq(websitesTable.trackingId, trackingId))
      .limit(1);

    if (website.length === 0) {
      return NextResponse.json(
        { error: "Tracking ID not found." },
        { status: 404, headers: corsHeaders },
      );
    }

    const pageUrl = toSafeString(payload?.page?.url, 1000);
    const pathname = toSafeString(payload?.page?.pathname, 500);
    const pageTitle = toSafeString(payload?.page?.title, 500);
    const referrer = toSafeString(payload?.referrer, 500);
    const userAgent =
      toSafeString(payload?.device?.user_agent, 500) ??
      toSafeString(request.headers.get("user-agent"), 500);
    const deviceType = payload?.device?.device_type;
    const osName = toSafeString(payload?.device?.os_name, 100);
    const browserName = toSafeString(payload?.device?.browser_name, 100);
    const eventTimestamp = toSafeTimestamp(payload?.timestamp);
    const sessionId = toSafeString(body?.session_id, 64);

    if (!pageUrl && !pathname) {
      return NextResponse.json(
        { error: "Page data is required." },
        { status: 400, headers: corsHeaders },
      );
    }

    await db.insert(analyticsEventsTable).values({
      userId: website[0].userId,
      trackingId,
      sessionId,
      eventType: "page_view",
      pageUrl,
      pathname,
      pageTitle,
      referrer,
      userAgent,
      deviceType,
      osName,
      browserName,
      eventTimestamp,
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Unable to process tracking event." },
      { status: 500, headers: corsHeaders },
    );
  }
}

