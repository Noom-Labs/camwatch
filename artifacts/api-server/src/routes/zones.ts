import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, zonesTable, camerasTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/zones", requireAuth, async (req, res): Promise<void> => {
  const { cameraId } = req.query as Record<string, string>;

  const conditions = [eq(zonesTable.tenantId, req.user!.tenantId)];
  if (cameraId) conditions.push(eq(zonesTable.cameraId, parseInt(cameraId, 10)));

  const zones = await db.select().from(zonesTable).where(and(...conditions));
  res.json(zones);
});

router.post("/zones", requireAuth, async (req, res): Promise<void> => {
  const { cameraId, name, type, points, active } = req.body;

  if (!cameraId || !name || !type || !points) {
    res.status(400).json({ error: "cameraId, name, type, and points are required" });
    return;
  }

  const [camera] = await db
    .select()
    .from(camerasTable)
    .where(and(eq(camerasTable.id, cameraId), eq(camerasTable.tenantId, req.user!.tenantId)));

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  const [zone] = await db.insert(zonesTable).values({
    tenantId: req.user!.tenantId,
    cameraId,
    name,
    type,
    points,
    active: active ?? true,
  }).returning();

  res.status(201).json(zone);
});

router.patch("/zones/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, type, points, active } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (points !== undefined) updates.points = points;
  if (active !== undefined) updates.active = active;

  const [zone] = await db
    .update(zonesTable)
    .set(updates)
    .where(and(eq(zonesTable.id, id), eq(zonesTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!zone) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }

  res.json(zone);
});

router.delete("/zones/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [zone] = await db
    .delete(zonesTable)
    .where(and(eq(zonesTable.id, id), eq(zonesTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!zone) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
