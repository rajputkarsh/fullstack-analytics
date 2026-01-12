import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { analyticsEventsTable, websitesTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trackingId = String(body?.trackingId || "").trim();
    const url = typeof body?.url === "string" ? body.url : "";

    if (!trackingId) {
      return NextResponse.json(
        { error: "Tracking ID is required." },
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

    let pathname: string | undefined;
    if (url) {
      try {
        pathname = new URL(url).pathname;
      } catch {
        pathname = undefined;
      }
    }

    await db.insert(analyticsEventsTable).values({
      userId: website[0].userId,
      trackingId,
      eventType: "pageview",
      pathname,
      referrer: request.headers.get("referer") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Unable to process tracking event." },
      { status: 500, headers: corsHeaders },
    );
  }
}

