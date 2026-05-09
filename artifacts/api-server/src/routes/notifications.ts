import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationChannelsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const channels = await db
    .select()
    .from(notificationChannelsTable)
    .where(eq(notificationChannelsTable.tenantId, req.user!.tenantId));

  res.json(channels);
});

router.post("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { name, type, config, active, triggerTypes } = req.body;

  if (!name || !type || !config) {
    res.status(400).json({ error: "name, type, and config are required" });
    return;
  }

  const [channel] = await db.insert(notificationChannelsTable).values({
    tenantId: req.user!.tenantId,
    name,
    type,
    config,
    active: active ?? true,
    triggerTypes: triggerTypes ?? [],
  }).returning();

  res.status(201).json(channel);
});

router.patch("/notifications/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, config, active, triggerTypes } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (config !== undefined) updates.config = config;
  if (active !== undefined) updates.active = active;
  if (triggerTypes !== undefined) updates.triggerTypes = triggerTypes;

  const [channel] = await db
    .update(notificationChannelsTable)
    .set(updates)
    .where(and(eq(notificationChannelsTable.id, id), eq(notificationChannelsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!channel) {
    res.status(404).json({ error: "Notification channel not found" });
    return;
  }

  res.json(channel);
});

router.delete("/notifications/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [channel] = await db
    .delete(notificationChannelsTable)
    .where(and(eq(notificationChannelsTable.id, id), eq(notificationChannelsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!channel) {
    res.status(404).json({ error: "Notification channel not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
