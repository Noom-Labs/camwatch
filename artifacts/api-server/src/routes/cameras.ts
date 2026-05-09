import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, camerasTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/cameras", requireAuth, async (req, res): Promise<void> => {
  const cameras = await db
    .select()
    .from(camerasTable)
    .where(eq(camerasTable.tenantId, req.user!.tenantId));

  res.json(cameras.map(formatCamera));
});

router.post("/cameras", requireAuth, async (req, res): Promise<void> => {
  const { name, rtspUrl, ip, username, password, manufacturer, model, onvifEnabled, mode, location, notes } = req.body;

  if (!name || !mode) {
    res.status(400).json({ error: "name and mode are required" });
    return;
  }

  const [camera] = await db.insert(camerasTable).values({
    tenantId: req.user!.tenantId,
    name,
    rtspUrl: rtspUrl ?? null,
    ip: ip ?? null,
    username: username ?? null,
    passwordEncrypted: password ?? null,
    manufacturer: manufacturer ?? null,
    model: model ?? null,
    onvifEnabled: onvifEnabled ?? false,
    mode: mode ?? "cloud_events",
    status: "unknown",
    location: location ?? null,
    notes: notes ?? null,
  }).returning();

  res.status(201).json(formatCamera(camera));
});

router.get("/cameras/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [camera] = await db
    .select()
    .from(camerasTable)
    .where(and(eq(camerasTable.id, id), eq(camerasTable.tenantId, req.user!.tenantId)));

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  res.json(formatCamera(camera));
});

router.patch("/cameras/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { name, rtspUrl, ip, username, password, manufacturer, model, onvifEnabled, mode, location, notes } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (rtspUrl !== undefined) updates.rtspUrl = rtspUrl;
  if (ip !== undefined) updates.ip = ip;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.passwordEncrypted = password;
  if (manufacturer !== undefined) updates.manufacturer = manufacturer;
  if (model !== undefined) updates.model = model;
  if (onvifEnabled !== undefined) updates.onvifEnabled = onvifEnabled;
  if (mode !== undefined) updates.mode = mode;
  if (location !== undefined) updates.location = location;
  if (notes !== undefined) updates.notes = notes;

  const [camera] = await db
    .update(camerasTable)
    .set(updates)
    .where(and(eq(camerasTable.id, id), eq(camerasTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  res.json(formatCamera(camera));
});

router.delete("/cameras/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [camera] = await db
    .delete(camerasTable)
    .where(and(eq(camerasTable.id, id), eq(camerasTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/cameras/:id/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const [camera] = await db
    .update(camerasTable)
    .set({ status, lastSeenAt: status === "online" ? new Date() : undefined })
    .where(and(eq(camerasTable.id, id), eq(camerasTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  res.json(formatCamera(camera));
});

function formatCamera(c: typeof camerasTable.$inferSelect) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    name: c.name,
    rtspUrl: c.rtspUrl,
    ip: c.ip,
    username: c.username,
    manufacturer: c.manufacturer,
    model: c.model,
    onvifEnabled: c.onvifEnabled,
    mode: c.mode,
    status: c.status,
    location: c.location,
    notes: c.notes,
    lastSeenAt: c.lastSeenAt,
    createdAt: c.createdAt,
  };
}

export default router;
