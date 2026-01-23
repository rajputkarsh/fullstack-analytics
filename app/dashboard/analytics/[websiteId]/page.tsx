import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { websitesTable } from "@/configs/schema";
import AnalyticsDashboard from "./analytics-dashboard";
import {
  getFilterOptions,
  getOverviewMetrics,
  getTimeSeries,
  getDeviceTypeBreakdown,
  getBrowserBreakdown,
  getCountryBreakdown,
  getTopPages,
  getOSBreakdown,
  getReferrerBreakdown,
  type AnalyticsFilters,
  type AnalyticsGranularity,
} from "./queries";

type PageProps = {
  params:
    | { websiteId: string }
    | Promise<{ websiteId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 90;
const DEFAULT_GRANULARITY: AnalyticsGranularity = "daily";
const ACTIVE_MINUTES = 5;

function parseDateParam(value?: string | string[]) {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUTC(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDevice(value?: string | string[]) {
  if (typeof value !== "string") return undefined;
  if (value === "mobile" || value === "desktop" || value === "tablet") {
    return value;
  }
  return undefined;
}

function normalizeBrowser(value?: string | string[]) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) return undefined;
  if (!/^[\w .+()/-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeCountry(value?: string | string[]) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeGranularity(
  value?: string | string[],
): AnalyticsGranularity {
  if (value === "weekly" || value === "monthly" || value === "daily") {
    return value;
  }
  return DEFAULT_GRANULARITY;
}

function normalizeRange(fromParam?: string | string[], toParam?: string | string[]) {
  const today = new Date();
  const defaultTo = endOfDayUTC(today);
  const defaultFrom = startOfDayUTC(addDays(today, -(DEFAULT_RANGE_DAYS - 1)));

  let from = parseDateParam(fromParam) ?? defaultFrom;
  let to = parseDateParam(toParam) ?? defaultTo;

  from = startOfDayUTC(from);
  to = endOfDayUTC(to);

  if (to > defaultTo) {
    to = defaultTo;
  }

  if (from > to) {
    from = defaultFrom;
    to = defaultTo;
  }

  const rangeDays =
    Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    to = endOfDayUTC(addDays(from, MAX_RANGE_DAYS - 1));
  }

  return { from, to };
}

export default async function AnalyticsPage({ params, searchParams }: PageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const websiteId = resolvedParams.websiteId;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const website = await db
    .select({
      id: websitesTable.id,
      name: websitesTable.name,
      domain: websitesTable.domain,
      trackingId: websitesTable.trackingId,
    })
    .from(websitesTable)
    .where(and(eq(websitesTable.id, websiteId), eq(websitesTable.userId, user.id)))
    .limit(1);

  if (website.length === 0) {
    notFound();
  }

  const range = normalizeRange(resolvedSearchParams?.from, resolvedSearchParams?.to);
  const filters: AnalyticsFilters = {
    from: range.from,
    to: range.to,
    deviceType: normalizeDevice(resolvedSearchParams?.device),
    browser: normalizeBrowser(resolvedSearchParams?.browser),
    country: normalizeCountry(resolvedSearchParams?.country),
  };
  const granularity = normalizeGranularity(resolvedSearchParams?.granularity);

  const [
    overview,
    timeSeries,
    filterOptions,
    deviceTypeBreakdown,
    browserBreakdown,
    countryBreakdown,
    topPages,
    osBreakdown,
    referrerBreakdown,
  ] = await Promise.all([
    getOverviewMetrics(website[0].id, filters, ACTIVE_MINUTES),
    getTimeSeries(website[0].id, filters, granularity),
    getFilterOptions(website[0].id, filters),
    getDeviceTypeBreakdown(website[0].id, filters),
    getBrowserBreakdown(website[0].id, filters),
    getCountryBreakdown(website[0].id, filters),
    getTopPages(website[0].id, filters),
    getOSBreakdown(website[0].id, filters),
    getReferrerBreakdown(website[0].id, filters),
  ]);

  return (
    <AnalyticsDashboard
      website={{ id: website[0].id, name: website[0].name, domain: website[0].domain }}
      overview={overview}
      timeSeries={timeSeries}
      granularity={granularity}
      filters={{
        from: toDateInputValue(range.from),
        to: toDateInputValue(range.to),
        deviceType: filters.deviceType,
        browser: filters.browser,
        country: filters.country,
      }}
      filterOptions={filterOptions}
      activeMinutes={ACTIVE_MINUTES}
      deviceTypeBreakdown={deviceTypeBreakdown}
      browserBreakdown={browserBreakdown}
      countryBreakdown={countryBreakdown}
      topPages={topPages}
      osBreakdown={osBreakdown}
      referrerBreakdown={referrerBreakdown}
    />
  );
}

