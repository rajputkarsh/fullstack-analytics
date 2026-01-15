import "server-only";

import { cache } from "react";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/configs/db";
import { analyticsEventsTable } from "@/configs/schema";

export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export type AnalyticsFilters = {
  from: Date;
  to: Date;
  deviceType?: "mobile" | "desktop" | "tablet";
  browser?: string;
  country?: string;
};

export type OverviewMetrics = {
  visitors: number;
  pageViews: number;
  sessions: number;
  activeUsers: number;
};

export type TimeSeriesPoint = {
  bucket: string;
  visitors: number;
  pageViews: number;
  sessions: number;
};

export type FilterOptions = {
  browsers: string[];
  countries: string[];
};

const eventTimeSql = sql`coalesce(${analyticsEventsTable.eventTimestamp}, ${analyticsEventsTable.createdAt})`;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) return Number(value);
  return 0;
}

function toIsoString(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function buildConditions(
  trackingId: string,
  filters: AnalyticsFilters,
  exclude: Array<"browser" | "country"> = [],
) {
  const conditions: SQL[] = [
    sql`${analyticsEventsTable.trackingId} = ${trackingId}`,
    sql`${analyticsEventsTable.eventType} = 'page_view'`,
    sql`${eventTimeSql} >= ${filters.from}`,
    sql`${eventTimeSql} <= ${filters.to}`,
  ];

  if (filters.deviceType) {
    conditions.push(sql`${analyticsEventsTable.deviceType} = ${filters.deviceType}`);
  }
  if (!exclude.includes("browser") && filters.browser) {
    conditions.push(sql`${analyticsEventsTable.browserName} = ${filters.browser}`);
  }
  if (!exclude.includes("country") && filters.country) {
    conditions.push(sql`${analyticsEventsTable.country} = ${filters.country}`);
  }

  return conditions;
}

function buildActiveConditions(trackingId: string, filters: AnalyticsFilters) {
  const conditions: SQL[] = [
    sql`${analyticsEventsTable.trackingId} = ${trackingId}`,
    sql`${analyticsEventsTable.eventType} = 'page_view'`,
  ];

  if (filters.deviceType) {
    conditions.push(sql`${analyticsEventsTable.deviceType} = ${filters.deviceType}`);
  }
  if (filters.browser) {
    conditions.push(sql`${analyticsEventsTable.browserName} = ${filters.browser}`);
  }
  if (filters.country) {
    conditions.push(sql`${analyticsEventsTable.country} = ${filters.country}`);
  }

  return conditions;
}

function joinConditions(conditions: SQL[]) {
  return sql.join(conditions, sql` AND `);
}

export const getOverviewMetrics = cache(
  async (
    trackingId: string,
    filters: AnalyticsFilters,
    activeMinutes: number,
  ): Promise<OverviewMetrics> => {
    const whereSql = joinConditions(buildConditions(trackingId, filters));
    const activeWhere = joinConditions(buildActiveConditions(trackingId, filters));
    const activeInterval = sql.raw(`interval '${activeMinutes} minutes'`);

    const [overviewResult, activeResult] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS page_views,
          COUNT(DISTINCT ${analyticsEventsTable.sessionId})::int AS sessions,
          COUNT(
            DISTINCT COALESCE(
              ${analyticsEventsTable.sessionId},
              ${analyticsEventsTable.userAgent}
            )
          )::int AS visitors
        FROM ${analyticsEventsTable}
        WHERE ${whereSql};
      `),
      db.execute(sql`
        SELECT
          COUNT(DISTINCT ${analyticsEventsTable.sessionId})::int AS active_users
        FROM ${analyticsEventsTable}
        WHERE ${activeWhere}
          AND ${eventTimeSql} >= (now() - ${activeInterval});
      `),
    ]);

    const overviewRow = overviewResult.rows?.[0] ?? {};
    const activeRow = activeResult.rows?.[0] ?? {};

    return {
      pageViews: toNumber(overviewRow.page_views),
      sessions: toNumber(overviewRow.sessions),
      visitors: toNumber(overviewRow.visitors),
      activeUsers: toNumber(activeRow.active_users),
    };
  },
);

export const getTimeSeries = cache(
  async (
    trackingId: string,
    filters: AnalyticsFilters,
    granularity: AnalyticsGranularity,
  ): Promise<TimeSeriesPoint[]> => {
    const whereSql = joinConditions(buildConditions(trackingId, filters));
    const truncUnit =
      granularity === "weekly" ? "week" : granularity === "monthly" ? "month" : "day";
    const intervalUnit =
      granularity === "weekly"
        ? "1 week"
        : granularity === "monthly"
          ? "1 month"
          : "1 day";
    const truncLiteral = sql.raw(`'${truncUnit}'`);
    const intervalLiteral = sql.raw(`interval '${intervalUnit}'`);

    const result = await db.execute(sql`
      WITH series AS (
        SELECT generate_series(
          date_trunc(${truncLiteral}, ${filters.from}::timestamptz),
          date_trunc(${truncLiteral}, ${filters.to}::timestamptz),
          ${intervalLiteral}
        ) AS bucket
      ),
      aggregated AS (
        SELECT
          date_trunc(${truncLiteral}, ${eventTimeSql}) AS bucket,
          COUNT(*)::int AS page_views,
          COUNT(DISTINCT ${analyticsEventsTable.sessionId})::int AS sessions,
          COUNT(
            DISTINCT COALESCE(
              ${analyticsEventsTable.sessionId},
              ${analyticsEventsTable.userAgent}
            )
          )::int AS visitors
        FROM ${analyticsEventsTable}
        WHERE ${whereSql}
        GROUP BY 1
      )
      SELECT
        series.bucket AS bucket,
        COALESCE(aggregated.page_views, 0)::int AS page_views,
        COALESCE(aggregated.sessions, 0)::int AS sessions,
        COALESCE(aggregated.visitors, 0)::int AS visitors
      FROM series
      LEFT JOIN aggregated ON aggregated.bucket = series.bucket
      ORDER BY series.bucket;
    `);

    return (result.rows ?? []).map((row) => ({
      bucket: toIsoString(row.bucket),
      pageViews: toNumber(row.page_views),
      sessions: toNumber(row.sessions),
      visitors: toNumber(row.visitors),
    }));
  },
);

export const getFilterOptions = cache(
  async (trackingId: string, filters: AnalyticsFilters): Promise<FilterOptions> => {
    const browserWhere = joinConditions(
      buildConditions(trackingId, filters, ["browser"]),
    );
    const countryWhere = joinConditions(
      buildConditions(trackingId, filters, ["country"]),
    );

    const [browserResult, countryResult] = await Promise.all([
      db.execute(sql`
        SELECT ${analyticsEventsTable.browserName} AS value, COUNT(*)::int AS total
        FROM ${analyticsEventsTable}
        WHERE ${browserWhere}
          AND ${analyticsEventsTable.browserName} IS NOT NULL
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 12;
      `),
      db.execute(sql`
        SELECT ${analyticsEventsTable.country} AS value, COUNT(*)::int AS total
        FROM ${analyticsEventsTable}
        WHERE ${countryWhere}
          AND ${analyticsEventsTable.country} IS NOT NULL
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 12;
      `),
    ]);

    const browsers = (browserResult.rows ?? [])
      .map((row) => row.value)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const countries = (countryResult.rows ?? [])
      .map((row) => row.value)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return { browsers, countries };
  },
);

