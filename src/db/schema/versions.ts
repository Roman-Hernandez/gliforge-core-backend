import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { projects } from "./projects.ts";

export const versionTypeEnum = pgEnum("version_type", ["major", "minor", "patch"]);
export const versionStatusEnum = pgEnum("version_status", ["pending", "building", "published", "failed"]);

export const versions = pgTable(
  "versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 50 }).notNull(),
    type: versionTypeEnum("type").notNull(),
    changelog: text("changelog"),
    iconCount: integer("icon_count").notNull().default(0),
    status: versionStatusEnum("status").notNull().default("pending"),
    npmUrl: varchar("npm_url", { length: 500 }),
    buildLog: text("build_log"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectVersionUnique: unique().on(table.projectId, table.version),
  }),
);

export const versionsRelations = relations(versions, ({ one }) => ({
  project: one(projects, {
    fields: [versions.projectId],
    references: [projects.id],
  }),
}));


