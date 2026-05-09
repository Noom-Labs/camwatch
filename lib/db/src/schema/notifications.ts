import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const notificationChannelTypes = ["telegram", "whatsapp", "email", "webhook", "push"] as const;
export type NotificationChannelType = typeof notificationChannelTypes[number];

export const notificationChannelsTable = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<NotificationChannelType>().notNull(),
  config: jsonb("config").notNull(),
  active: boolean("active").notNull().default(true),
  triggerTypes: text("trigger_types").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNotificationChannelSchema = createInsertSchema(notificationChannelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotificationChannel = z.infer<typeof insertNotificationChannelSchema>;
export type NotificationChannel = typeof notificationChannelsTable.$inferSelect;
