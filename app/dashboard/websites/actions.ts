"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/configs/db";
import { eventsTable, sessionsTable, websitesTable } from "@/configs/schema";
import crypto from "crypto";

export type ActionResult = {
  success: boolean;
  error?: string;
};

const DOMAIN_REGEX =
  /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withProtocol = trimmed.startsWith("http")
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();
    const host = parsed.host.toLowerCase();
    const isLocalhost =
      hostname === "localhost" || hostname.endsWith(".localhost");

    if (!isLocalhost && !DOMAIN_REGEX.test(hostname)) {
      return null;
    }

    return host;
  } catch {
    return null;
  }
}

async function requireUserId(): Promise<string> {
  const user = await currentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user.id;
}

function generateTrackingId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function formatDbError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("unique") || message.includes("duplicate")) {
      return "A website with this domain already exists.";
    }
    return error.message;
  }
  return "Unexpected error. Please try again.";
}

export async function createWebsite(formData: FormData): Promise<ActionResult> {

  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") || "").trim();
    const domainInput = String(formData.get("domain") || "");
    const domain = normalizeDomain(domainInput);

    if (!name) {
      return { success: false, error: "Website name is required." };
    }

    if (!domain) {
      return { success: false, error: "Enter a valid domain." };
    }

    const existing = await db
      .select({ id: websitesTable.id })
      .from(websitesTable)
      .where(and(eq(websitesTable.userId, userId), eq(websitesTable.domain, domain)))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "A website with this domain already exists.",
      };
    }

    let trackingId = generateTrackingId();
    let inserted = false;

    for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
      try {
        await db.insert(websitesTable).values({
          userId,
          name,
          domain,
          trackingId,
        });
        inserted = true;
      } catch (error) {
        if (attempt < 2) {
          trackingId = generateTrackingId();
          continue;
        }
        throw error;
      }
    }

    revalidatePath("/dashboard/websites");
    return { success: true };
  } catch (error) {
    return { success: false, error: formatDbError(error) };
  }
}

export async function updateWebsite(formData: FormData): Promise<ActionResult> {

  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") || "");
    const name = String(formData.get("name") || "").trim();
    const domainInput = String(formData.get("domain") || "");
    const domain = normalizeDomain(domainInput);

    if (!id) {
      return { success: false, error: "Website not found." };
    }

    if (!name) {
      return { success: false, error: "Website name is required." };
    }

    if (!domain) {
      return { success: false, error: "Enter a valid domain." };
    }

    const duplicate = await db
      .select({ id: websitesTable.id })
      .from(websitesTable)
      .where(
        and(
          eq(websitesTable.userId, userId),
          eq(websitesTable.domain, domain),
          ne(websitesTable.id, id),
        ),
      )
      .limit(1);

    if (duplicate.length > 0) {
      return {
        success: false,
        error: "A website with this domain already exists.",
      };
    }

    const result = await db
      .update(websitesTable)
      .set({ name, domain, updatedAt: new Date() })
      .where(and(eq(websitesTable.id, id), eq(websitesTable.userId, userId)));

    if (!result.rowCount) {
      return { success: false, error: "Website not found." };
    }

    revalidatePath("/dashboard/websites");
    return { success: true };
  } catch (error) {
    return { success: false, error: formatDbError(error) };
  }
}

export async function deleteWebsite(formData: FormData): Promise<ActionResult> {

  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") || "");

    if (!id) {
      return { success: false, error: "Website not found." };
    }

    const website = await db
      .select({ id: websitesTable.id })
      .from(websitesTable)
      .where(and(eq(websitesTable.id, id), eq(websitesTable.userId, userId)))
      .limit(1);

    if (website.length === 0) {
      return { success: false, error: "Website not found." };
    }

    await db.delete(eventsTable).where(eq(eventsTable.websiteId, website[0].id));
    await db.delete(sessionsTable).where(eq(sessionsTable.websiteId, website[0].id));

    await db
      .delete(websitesTable)
      .where(and(eq(websitesTable.id, id), eq(websitesTable.userId, userId)));

    revalidatePath("/dashboard/websites");
    return { success: true };
  } catch (error) {
    return { success: false, error: formatDbError(error) };
  }
}

