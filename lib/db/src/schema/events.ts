import { pgTable, serial, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { camerasTable } from "./cameras";

export const eventTypes = ["vehicle", "car", "motorcycle", "truck", "person", "motion", "line_cross", "zone_enter", "zone_exit", "vehicle_stopped"] as const;
export const eventSources = ["cloud_events", "edge_ai", "onvif"] as const;
export type EventType = typeof eventTypes[number];
export type EventSource = typeof eventSources[number];

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  cameraId: integer("camera_id").notNull().references(() => camerasTable.id, { onDelete: "cascade" }),
  type: text("type").$type<EventType>().notNull(),
  confidence: real("confidence"),
  snapshotUrl: text("snapshot_url"),
  metadata: jsonb("metadata"),
  source: text("source").$type<EventSource>().notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
