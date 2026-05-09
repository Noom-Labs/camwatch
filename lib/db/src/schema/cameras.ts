import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const cameraModes = ["cloud_events", "edge_ai"] as const;
export const cameraStatuses = ["online", "offline", "unknown"] as const;
export type CameraMode = typeof cameraModes[number];
export type CameraStatus = typeof cameraStatuses[number];

export const camerasTable = pgTable("cameras", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rtspUrl: text("rtsp_url"),
  ip: text("ip"),
  username: text("username"),
  passwordEncrypted: text("password_encrypted"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  onvifEnabled: boolean("onvif_enabled").notNull().default(false),
  mode: text("mode").$type<CameraMode>().notNull().default("cloud_events"),
  status: text("status").$type<CameraStatus>().notNull().default("unknown"),
  location: text("location"),
  notes: text("notes"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCameraSchema = createInsertSchema(camerasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type Camera = typeof camerasTable.$inferSelect;
