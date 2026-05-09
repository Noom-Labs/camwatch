import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const agentPlatforms = ["linux", "windows", "docker", "raspberry_pi"] as const;
export const agentStatuses = ["online", "offline", "unknown"] as const;
export type AgentPlatform = typeof agentPlatforms[number];
export type AgentStatus = typeof agentStatuses[number];

export const edgeAgentsTable = pgTable("edge_agents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").$type<AgentPlatform>(),
  version: text("version"),
  status: text("status").$type<AgentStatus>().notNull().default("unknown"),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  cameraIds: integer("camera_ids").array().notNull().default([]),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEdgeAgentSchema = createInsertSchema(edgeAgentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEdgeAgent = z.infer<typeof insertEdgeAgentSchema>;
export type EdgeAgent = typeof edgeAgentsTable.$inferSelect;
