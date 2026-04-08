import { relations, sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.ts";

export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    packageName: varchar("package_name", { length: 255 }).notNull(),
    description: text("description"),
    frameworks: jsonb("frameworks")
      .$type<Array<"react" | "vue" | "svelte">>()
      .notNull()
      .default(sql`'["react"]'::jsonb`),
    latestVersion: varchar("latest_version", { length: 50 }),
    status: projectStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPackageNameUnique: unique().on(table.userId, table.packageName),
  }),
);

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));


