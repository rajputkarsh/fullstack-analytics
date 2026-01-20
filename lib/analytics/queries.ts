import "server-only";

import { cache } from "react";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/configs/db";
import { eventsTable, sessionsTable } from "@/configs/schema";

export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export type AnalyticsFilters = {
  from: Date;
  to: Date;
  deviceType?: "mobile" | "desktop" | "tablet";
  browser?: string;
  country?: string;
};

export type ActiveFilters = Pick<
  AnalyticsFilters,
  "deviceType" | "browser" | "country"
>;

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

function buildEventConditions(
  websiteId: string,
  filters: AnalyticsFilters,
  exclude: Array<"browser" | "country"> = [],
) {
  const conditions: SQL[] = [
    sql`${eventsTable.websiteId} = ${websiteId}`,
    sql`${eventsTable.eventType} = 'page_view'`,
    sql`${eventsTable.createdAt} >= ${filters.from}`,
    sql`${eventsTable.createdAt} <= ${filters.to}`,
  ];

  if (filters.deviceType) {
    conditions.push(sql`${eventsTable.deviceType} = ${filters.deviceType}`);
  }
  if (!exclude.includes("browser") && filters.browser) {
    conditions.push(sql`${eventsTable.browser} = ${filters.browser}`);
  }
  if (!exclude.includes("country") && filters.country) {
    conditions.push(sql`${eventsTable.country} = ${filters.country}`);
  }

  return conditions;
}

function buildActiveEventConditions(websiteId: string, filters: ActiveFilters) {
  const conditions: SQL[] = [
    sql`${eventsTable.websiteId} = ${websiteId}`,
    sql`${eventsTable.eventType} = 'page_view'`,
  ];

  if (filters.deviceType) {
    conditions.push(sql`${eventsTable.deviceType} = ${filters.deviceType}`);
  }
  if (filters.browser) {
    conditions.push(sql`${eventsTable.browser} = ${filters.browser}`);
  }
  if (filters.country) {
    conditions.push(sql`${eventsTable.country} = ${filters.country}`);
  }

  return conditions;
}

function buildSessionConditions(websiteId: string, filters: ActiveFilters) {
  const conditions: SQL[] = [sql`${sessionsTable.websiteId} = ${websiteId}`];

  if (filters.deviceType) {
    conditions.push(sql`${sessionsTable.deviceType} = ${filters.deviceType}`);
  }
  if (filters.browser) {
    conditions.push(sql`${sessionsTable.browser} = ${filters.browser}`);
  }
  if (filters.country) {
    conditions.push(sql`${sessionsTable.country} = ${filters.country}`);
  }

  return conditions;
}

function joinConditions(conditions: SQL[]) {
  return sql.join(conditions, sql` AND `);
}

export const getOverviewMetrics = cache(
  async (
    websiteId: string,
    filters: AnalyticsFilters,
    activeMinutes: number,
  ): Promise<OverviewMetrics> => {
    const whereSql = joinConditions(buildEventConditions(websiteId, filters));
    const sessionWhere = joinConditions(buildSessionConditions(websiteId, filters));
    const activeEventWhere = joinConditions(buildActiveEventConditions(websiteId, filters));
    const activeInterval = sql.raw(`interval '${activeMinutes} minutes'`);

    const [overviewResult, activeResult] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS page_views,
          COUNT(DISTINCT ${eventsTable.sessionId})::int AS sessions,
          COUNT(DISTINCT ${eventsTable.sessionId})::int AS visitors
        FROM ${eventsTable}
        WHERE ${whereSql};
      `),
      db.execute(sql`
        WITH session_active AS (
          SELECT COUNT(DISTINCT ${sessionsTable.id})::int AS total
          FROM ${sessionsTable}
          WHERE ${sessionWhere}
            AND ${sessionsTable.lastSeenAt} >= (now() - ${activeInterval})
        ),
        event_active AS (
          SELECT COUNT(DISTINCT ${eventsTable.sessionId})::int AS total
          FROM ${eventsTable}
          WHERE ${activeEventWhere}
            AND ${eventsTable.createdAt} >= (now() - ${activeInterval})
        )
        SELECT COALESCE(NULLIF(session_active.total, 0), event_active.total, 0) AS active_users
        FROM session_active
        CROSS JOIN event_active;
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
    websiteId: string,
    filters: AnalyticsFilters,
    granularity: AnalyticsGranularity,
  ): Promise<TimeSeriesPoint[]> => {
    const whereSql = joinConditions(buildEventConditions(websiteId, filters));
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
          date_trunc(${truncLiteral}, ${eventsTable.createdAt}) AS bucket,
          COUNT(*)::int AS page_views,
          COUNT(DISTINCT ${eventsTable.sessionId})::int AS sessions,
          COUNT(DISTINCT ${eventsTable.sessionId})::int AS visitors
        FROM ${eventsTable}
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
  async (websiteId: string, filters: AnalyticsFilters): Promise<FilterOptions> => {
    const browserWhere = joinConditions(
      buildEventConditions(websiteId, filters, ["browser"]),
    );
    const countryWhere = joinConditions(
      buildEventConditions(websiteId, filters, ["country"]),
    );

    const [browserResult, countryResult] = await Promise.all([
      db.execute(sql`
        SELECT ${eventsTable.browser} AS value, COUNT(*)::int AS total
        FROM ${eventsTable}
        WHERE ${browserWhere}
          AND ${eventsTable.browser} IS NOT NULL
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 12;
      `),
      db.execute(sql`
        SELECT ${eventsTable.country} AS value, COUNT(*)::int AS total
        FROM ${eventsTable}
        WHERE ${countryWhere}
          AND ${eventsTable.country} IS NOT NULL
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

export async function getActiveUsers(
  websiteId: string,
  filters: ActiveFilters,
  activeMinutes: number,
) {
  const whereSql = joinConditions(buildSessionConditions(websiteId, filters));
  const eventWhereSql = joinConditions(buildActiveEventConditions(websiteId, filters));
  const activeInterval = sql.raw(`interval '${activeMinutes} minutes'`);

  const result = await db.execute(sql`
    WITH session_active AS (
      SELECT COUNT(DISTINCT ${sessionsTable.id})::int AS total
      FROM ${sessionsTable}
      WHERE ${whereSql}
        AND ${sessionsTable.lastSeenAt} >= (now() - ${activeInterval})
    ),
    event_active AS (
      SELECT COUNT(DISTINCT ${eventsTable.sessionId})::int AS total
      FROM ${eventsTable}
      WHERE ${eventWhereSql}
        AND ${eventsTable.createdAt} >= (now() - ${activeInterval})
    )
    SELECT COALESCE(NULLIF(session_active.total, 0), event_active.total, 0) AS active_users
    FROM session_active
    CROSS JOIN event_active;
  `);

  return toNumber(result.rows?.[0]?.active_users);
}

