import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { projects } from "./projects.ts";

export const iconStatusEnum = pgEnum("icon_status", ["pending", "optimized", "error"]);

export const icons = pgTable(
  "icons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    fileSizeOriginal: integer("file_size_original").notNull(),
    fileSizeOptimized: integer("file_size_optimized"),
    svgContent: text("svg_content"),
    status: iconStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIconNameUnique: unique().on(table.projectId, table.name),
  }),
);

export const iconsRelations = relations(icons, ({ one }) => ({
  project: one(projects, {
    fields: [icons.projectId],
    references: [projects.id],
  }),
}));


