import { Router, type IRouter } from "express";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db, camerasTable, eventsTable, edgeAgentsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [cameras, events, eventsToday, edgeAgents] = await Promise.all([
    db.select().from(camerasTable).where(eq(camerasTable.tenantId, tenantId)),
    db.select().from(eventsTable).where(eq(eventsTable.tenantId, tenantId)),
    db.select().from(eventsTable).where(and(eq(eventsTable.tenantId, tenantId), gte(eventsTable.detectedAt, todayStart))),
    db.select().from(edgeAgentsTable).where(eq(edgeAgentsTable.tenantId, tenantId)),
  ]);

  const camerasOnline = cameras.filter(c => c.status === "online").length;
  const edgeAgentsOnline = edgeAgents.filter(a => a.status === "online").length;

  const eventsByType: Record<string, number> = {};
  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
  }

  res.json({
    totalEvents: events.length,
    eventsToday: eventsToday.length,
    camerasTotal: cameras.length,
    camerasOnline,
    edgeAgentsOnline,
    eventsByType,
  });
});

router.get("/dashboard/recent-events", requireAuth, async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const limit = parseInt((req.query.limit as string) ?? "20", 10);

  const events = await db
    .select({
      event: eventsTable,
      cameraName: camerasTable.name,
    })
    .from(eventsTable)
    .leftJoin(camerasTable, eq(eventsTable.cameraId, camerasTable.id))
    .where(eq(eventsTable.tenantId, tenantId))
    .orderBy(desc(eventsTable.detectedAt))
    .limit(limit);

  res.json(events.map(({ event, cameraName }) => ({
    id: event.id,
    tenantId: event.tenantId,
    cameraId: event.cameraId,
    cameraName: cameraName ?? null,
    type: event.type,
    confidence: event.confidence,
    snapshotUrl: event.snapshotUrl,
    metadata: event.metadata,
    source: event.source,
    detectedAt: event.detectedAt,
    createdAt: event.createdAt,
  })));
});

router.get("/dashboard/events-by-hour", requireAuth, async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      hour: sql<string>`date_trunc('hour', ${eventsTable.detectedAt})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(eventsTable)
    .where(and(eq(eventsTable.tenantId, tenantId), gte(eventsTable.detectedAt, since)))
    .groupBy(sql`date_trunc('hour', ${eventsTable.detectedAt})`)
    .orderBy(sql`date_trunc('hour', ${eventsTable.detectedAt})`);

  res.json(rows.map(r => ({ hour: r.hour, count: r.count })));
});

export default router;
