import { sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { eventsTable, sessionsTable, websitesTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

export type WebsiteLookup = {
  id: string;
  trackingId: string;
};

export async function getWebsiteByTrackingId(
  trackingId: string,
): Promise<WebsiteLookup | null> {
  const result = await db
    .select({ id: websitesTable.id, trackingId: websitesTable.trackingId })
    .from(websitesTable)
    .where(eq(websitesTable.trackingId, trackingId))
    .limit(1);
  return result[0] ?? null;
}

export type EventInsert = typeof eventsTable.$inferInsert;

export async function insertEvents(events: EventInsert[]) {
  if (events.length === 0) return;
  await db.insert(eventsTable).values(events);
}

export type SessionUpsert = {
  id: string;
  websiteId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  deviceType: string;
  browser: string;
  os: string;
  country?: string | null;
};

export async function upsertSession(session: SessionUpsert) {
  await db
    .insert(sessionsTable)
    .values({
      id: session.id,
      websiteId: session.websiteId,
      // Use DB time to avoid app/server clock skew affecting "active users".
      firstSeenAt: sql`now()`,
      lastSeenAt: sql`now()`,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      country: session.country ?? null,
    })
    .onConflictDoUpdate({
      target: sessionsTable.id,
      set: {
        lastSeenAt: sql`now()`,
        deviceType: sql`COALESCE(EXCLUDED.device_type, ${sessionsTable.deviceType})`,
        browser: sql`COALESCE(EXCLUDED.browser, ${sessionsTable.browser})`,
        os: sql`COALESCE(EXCLUDED.os, ${sessionsTable.os})`,
        country: sql`COALESCE(EXCLUDED.country, ${sessionsTable.country})`,
      },
    });
}

