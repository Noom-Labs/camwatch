import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, eventsTable, camerasTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { broadcastToTenant } from "../lib/websocket";

const router: IRouter = Router();

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  const { cameraId, type, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(eventsTable.tenantId, req.user!.tenantId)];
  if (cameraId) conditions.push(eq(eventsTable.cameraId, parseInt(cameraId, 10)));
  if (type) conditions.push(eq(eventsTable.type, type as never));

  const events = await db
    .select({
      event: eventsTable,
      cameraName: camerasTable.name,
    })
    .from(eventsTable)
    .leftJoin(camerasTable, eq(eventsTable.cameraId, camerasTable.id))
    .where(and(...conditions))
    .orderBy(desc(eventsTable.detectedAt))
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));

  res.json(events.map(({ event, cameraName }) => formatEvent(event, cameraName)));
});

router.post("/events", requireAuth, async (req, res): Promise<void> => {
  const { cameraId, type, confidence, snapshotUrl, metadata, source, detectedAt } = req.body;

  if (!cameraId || !type || !source) {
    res.status(400).json({ error: "cameraId, type, and source are required" });
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

  const [event] = await db.insert(eventsTable).values({
    tenantId: req.user!.tenantId,
    cameraId,
    type,
    confidence: confidence ?? null,
    snapshotUrl: snapshotUrl ?? null,
    metadata: metadata ?? null,
    source,
    detectedAt: detectedAt ? new Date(detectedAt) : new Date(),
  }).returning();

  const formatted = formatEvent(event, camera.name);

  broadcastToTenant(req.user!.tenantId, {
    type: "new_event",
    event: formatted,
  });

  res.status(201).json(formatted);
});

router.get("/events/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [row] = await db
    .select({ event: eventsTable, cameraName: camerasTable.name })
    .from(eventsTable)
    .leftJoin(camerasTable, eq(eventsTable.cameraId, camerasTable.id))
    .where(and(eq(eventsTable.id, id), eq(eventsTable.tenantId, req.user!.tenantId)));

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(formatEvent(row.event, row.cameraName));
});

router.delete("/events/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [event] = await db
    .delete(eventsTable)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

function formatEvent(e: typeof eventsTable.$inferSelect, cameraName: string | null | undefined) {
  return {
    id: e.id,
    tenantId: e.tenantId,
    cameraId: e.cameraId,
    cameraName: cameraName ?? null,
    type: e.type,
    confidence: e.confidence,
    snapshotUrl: e.snapshotUrl,
    metadata: e.metadata,
    source: e.source,
    detectedAt: e.detectedAt,
    createdAt: e.createdAt,
  };
}

export default router;
