import {
    index,
    integer,
    pgTable,
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

export const analyticsEventsTable = pgTable(
    "analytics_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        trackingId: varchar("tracking_id", { length: 64 }).notNull(),
        eventType: varchar("event_type", { length: 50 }).notNull(),
        pathname: varchar({ length: 500 }),
        referrer: varchar({ length: 500 }),
        userAgent: varchar("user_agent", { length: 500 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        trackingIdIndex: index("analytics_events_tracking_id_idx").on(
            table.trackingId,
        ),
        userIdIndex: index("analytics_events_user_id_idx").on(table.userId),
    }),
);