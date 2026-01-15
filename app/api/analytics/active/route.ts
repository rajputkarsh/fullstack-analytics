import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { analyticsEventsTable, websitesTable } from "@/configs/schema";

const DEFAULT_ACTIVE_MINUTES = 5;
const MAX_ACTIVE_MINUTES = 30;

function normalizeDevice(value: string | null) {
  if (!value) return undefined;
  if (value === "mobile" || value === "desktop" || value === "tablet") {
    return value;
  }
  return undefined;
}

function normalizeBrowser(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) return undefined;
  if (!/^[\w .+()/-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeCountry(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeMinutes(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_ACTIVE_MINUTES;
  const rounded = Math.floor(parsed);
  if (rounded < 1) return DEFAULT_ACTIVE_MINUTES;
  if (rounded > MAX_ACTIVE_MINUTES) return MAX_ACTIVE_MINUTES;
  return rounded;
}

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 });
  }

  const website = await db
    .select({ trackingId: websitesTable.trackingId })
    .from(websitesTable)
    .where(and(eq(websitesTable.id, websiteId), eq(websitesTable.userId, user.id)))
    .limit(1);

  if (website.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const minutes = normalizeMinutes(searchParams.get("minutes"));
  const deviceType = normalizeDevice(searchParams.get("device"));
  const browser = normalizeBrowser(searchParams.get("browser"));
  const country = normalizeCountry(searchParams.get("country"));

  const conditions = [
    sql`${analyticsEventsTable.trackingId} = ${website[0].trackingId}`,
    sql`${analyticsEventsTable.eventType} = 'page_view'`,
  ];
  if (deviceType) {
    conditions.push(sql`${analyticsEventsTable.deviceType} = ${deviceType}`);
  }
  if (browser) {
    conditions.push(sql`${analyticsEventsTable.browserName} = ${browser}`);
  }
  if (country) {
    conditions.push(sql`${analyticsEventsTable.country} = ${country}`);
  }

  const eventTimeSql = sql`coalesce(${analyticsEventsTable.eventTimestamp}, ${analyticsEventsTable.createdAt})`;
  const intervalLiteral = sql.raw(`interval '${minutes} minutes'`);
  const whereSql = sql.join(conditions, sql` AND `);

  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT ${analyticsEventsTable.sessionId})::int AS active_users
    FROM ${analyticsEventsTable}
    WHERE ${whereSql}
      AND ${eventTimeSql} >= (now() - ${intervalLiteral});
  `);

  const activeUsers = result.rows?.[0]?.active_users;

  return NextResponse.json(
    {
      activeUsers: typeof activeUsers === "number" ? activeUsers : Number(activeUsers ?? 0),
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

