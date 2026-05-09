import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, edgeAgentsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

router.get("/edge-agents", requireAuth, async (req, res): Promise<void> => {
  const agents = await db
    .select()
    .from(edgeAgentsTable)
    .where(eq(edgeAgentsTable.tenantId, req.user!.tenantId));

  res.json(agents.map(formatAgent));
});

router.post("/edge-agents", requireAuth, async (req, res): Promise<void> => {
  const { name, platform, cameraIds, config } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const token = uuidv4();

  const [agent] = await db.insert(edgeAgentsTable).values({
    tenantId: req.user!.tenantId,
    name,
    token,
    platform: platform ?? null,
    status: "unknown",
    cameraIds: cameraIds ?? [],
    config: config ?? null,
  }).returning();

  res.status(201).json(formatAgent(agent));
});

router.patch("/edge-agents/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, platform, version, cameraIds, config } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (platform !== undefined) updates.platform = platform;
  if (version !== undefined) updates.version = version;
  if (cameraIds !== undefined) updates.cameraIds = cameraIds;
  if (config !== undefined) updates.config = config;

  const [agent] = await db
    .update(edgeAgentsTable)
    .set(updates)
    .where(and(eq(edgeAgentsTable.id, id), eq(edgeAgentsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!agent) {
    res.status(404).json({ error: "Edge agent not found" });
    return;
  }

  res.json(formatAgent(agent));
});

router.delete("/edge-agents/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [agent] = await db
    .delete(edgeAgentsTable)
    .where(and(eq(edgeAgentsTable.id, id), eq(edgeAgentsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!agent) {
    res.status(404).json({ error: "Edge agent not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/edge-agents/:id/heartbeat", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [agent] = await db
    .update(edgeAgentsTable)
    .set({ status: "online", lastHeartbeatAt: new Date() })
    .where(and(eq(edgeAgentsTable.id, id), eq(edgeAgentsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!agent) {
    res.status(404).json({ error: "Edge agent not found" });
    return;
  }

  res.json(formatAgent(agent));
});

function formatAgent(a: typeof edgeAgentsTable.$inferSelect) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    name: a.name,
    token: a.token,
    platform: a.platform,
    version: a.version,
    status: a.status,
    lastHeartbeatAt: a.lastHeartbeatAt,
    cameraIds: a.cameraIds,
    config: a.config,
    createdAt: a.createdAt,
  };
}

export default router;
