import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { websitesTable } from "@/configs/schema";
import { getActiveUsers, type ActiveFilters } from "@/lib/analytics/queries";

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
    .select({ id: websitesTable.id })
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

  const filters: ActiveFilters = {
    deviceType,
    browser,
    country,
  };
  const activeUsers = await getActiveUsers(website[0].id, filters, minutes);

  return NextResponse.json(
    {
      activeUsers,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

