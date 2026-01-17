import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { websitesTable } from "@/configs/schema";
import WebsiteManager from "./website-manager";
import { createWebsite, deleteWebsite, updateWebsite } from "./actions";

function getBaseUrl() {
  const requestHeaders = headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

export default async function WebsitesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const websites = await db
    .select()
    .from(websitesTable)
    .where(eq(websitesTable.userId, user.id))
    .orderBy(desc(websitesTable.createdAt));

  return (
    <WebsiteManager
      baseUrl={getBaseUrl()}
      actions={{ createWebsite, updateWebsite, deleteWebsite }}
      websites={websites.map((website) => ({
        ...website,
        createdAt: website.createdAt.toISOString(),
        updatedAt: website.updatedAt.toISOString(),
      }))}
    />
  );
}

