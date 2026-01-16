import {
    index,
    integer,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});

export const websitesTable = pgTable(
    "websites",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        name: varchar({ length: 255 }).notNull(),
        domain: varchar({ length: 255 }).notNull(),
        trackingId: varchar("tracking_id", { length: 64 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        userIdIndex: index("websites_user_id_idx").on(table.userId),
        trackingIdIndex: uniqueIndex("websites_tracking_id_uq").on(
            table.trackingId,
        ),
        userDomainIndex: uniqueIndex("websites_user_domain_uq").on(
            table.userId,
            table.domain,
        ),
    }),
);

// Analytics ingestion tables optimized for high-write workloads.
export const eventsTable = pgTable(
    "events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        websiteId: uuid("website_id").notNull(),
        trackingId: varchar("tracking_id", { length: 64 }).notNull(),
        sessionId: varchar("session_id", { length: 64 }).notNull(),
        eventType: varchar("event_type", { length: 50 }).notNull(),
        pageUrl: text("page_url"),
        pagePath: text("page_path"),
        pageTitle: text("page_title"),
        referrer: text("referrer"),
        deviceType: varchar("device_type", { length: 50 }).notNull(),
        browser: varchar("browser", { length: 100 }).notNull(),
        os: varchar("os", { length: 100 }).notNull(),
        country: varchar("country", { length: 2 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        // Composite index accelerates time-bound dashboards per website.
        websiteCreatedIndex: index("events_website_created_idx").on(
            table.websiteId,
            table.createdAt,
        ),
        // Composite index optimizes session-scoped aggregations.
        websiteSessionIndex: index("events_website_session_idx").on(
            table.websiteId,
            table.sessionId,
        ),
        trackingIdIndex: index("events_tracking_id_idx").on(table.trackingId),
        sessionIdIndex: index("events_session_id_idx").on(table.sessionId),
        eventTypeIndex: index("events_event_type_idx").on(table.eventType),
    }),
);

export const sessionsTable = pgTable(
    "sessions",
    {
        id: varchar("id", { length: 64 }).primaryKey(),
        websiteId: uuid("website_id").notNull(),
        firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
        lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
        deviceType: varchar("device_type", { length: 50 }).notNull(),
        browser: varchar("browser", { length: 100 }).notNull(),
        os: varchar("os", { length: 100 }).notNull(),
        country: varchar("country", { length: 2 }),
    },
    (table) => ({
        websiteIndex: index("sessions_website_id_idx").on(table.websiteId),
        lastSeenIndex: index("sessions_last_seen_idx").on(table.lastSeenAt),
    }),
);

export const analyticsEventsTable = pgTable(
    "analytics_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        trackingId: varchar("tracking_id", { length: 64 }).notNull(),
        sessionId: varchar("session_id", { length: 64 }),
        eventType: varchar("event_type", { length: 50 }).notNull(),
        pageUrl: varchar("page_url", { length: 1000 }),
        pathname: varchar({ length: 500 }),
        pageTitle: varchar("page_title", { length: 500 }),
        referrer: varchar({ length: 500 }),
        userAgent: varchar("user_agent", { length: 500 }),
        deviceType: varchar("device_type", { length: 50 }),
        osName: varchar("os_name", { length: 100 }),
        browserName: varchar("browser_name", { length: 100 }),
        country: varchar("country", { length: 2 }),
        eventTimestamp: timestamp("event_timestamp", { withTimezone: true })
            .defaultNow(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        trackingIdIndex: index("analytics_events_tracking_id_idx").on(
            table.trackingId,
        ),
        userIdIndex: index("analytics_events_user_id_idx").on(table.userId),
        trackingTimeIndex: index("analytics_events_tracking_time_idx").on(
            table.trackingId,
            table.eventTimestamp,
        ),
        trackingCreatedIndex: index("analytics_events_tracking_created_idx").on(
            table.trackingId,
            table.createdAt,
        ),
        trackingSessionIndex: index("analytics_events_tracking_session_idx").on(
            table.trackingId,
            table.sessionId,
        ),
        trackingDeviceIndex: index("analytics_events_tracking_device_idx").on(
            table.trackingId,
            table.deviceType,
        ),
        trackingBrowserIndex: index("analytics_events_tracking_browser_idx").on(
            table.trackingId,
            table.browserName,
        ),
        trackingCountryIndex: index("analytics_events_tracking_country_idx").on(
            table.trackingId,
            table.country,
        ),
    }),
);