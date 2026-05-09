import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { camerasTable } from "./cameras";

export const zoneTypes = ["polygon", "line", "rectangle"] as const;
export type ZoneType = typeof zoneTypes[number];

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  cameraId: integer("camera_id").notNull().references(() => camerasTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<ZoneType>().notNull(),
  points: jsonb("points").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
