import { Router } from "express";
import { createHmac } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { camerasTable, eventsTable } from "@workspace/db/schema";
import { broadcastToTenant } from "../lib/websocket";
import { logger } from "../lib/logger";

const router = Router();

const WEBHOOK_SECRET = process.env.SESSION_SECRET ?? "camwatch-webhook-secret";

export function generateWebhookToken(cameraId: number): string {
  return createHmac("sha256", WEBHOOK_SECRET)
    .update(`webhook:camera:${cameraId}`)
    .digest("hex")
    .slice(0, 32);
}

// Map Intelbras event strings to our event types
function mapEventType(raw: string): typeof eventsTable.$inferInsert["type"] {
  const lower = (raw ?? "").toLowerCase();
  if (lower.includes("vmd") || lower.includes("motion") || lower.includes("movim")) return "motion";
  if (lower.includes("person") || lower.includes("pessoa")) return "person";
  if (lower.includes("vehicle") || lower.includes("veiculo") || lower.includes("veículo")) return "vehicle";
  if (lower.includes("car") || lower.includes("carro")) return "car";
  if (lower.includes("truck") || lower.includes("caminhao") || lower.includes("caminhão")) return "truck";
  if (lower.includes("motorcycle") || lower.includes("moto")) return "motorcycle";
  if (lower.includes("line")) return "line_cross";
  if (lower.includes("zone") || lower.includes("zona")) return "zone_enter";
  return "motion"; // fallback
}

// Accept both GET and POST — some Intelbras models use GET
router.get("/webhooks/intelbras", handleIntelbras);
router.post("/webhooks/intelbras", handleIntelbras);

async function handleIntelbras(req: any, res: any): Promise<void> {
  const cameraId = parseInt((req.query.camera_id as string) ?? "0", 10);
  const token = (req.query.token as string) ?? "";

  if (!cameraId) {
    res.status(400).json({ error: "camera_id required" });
    return;
  }

  // Validate HMAC token
  const expected = generateWebhookToken(cameraId);
  if (token !== expected) {
    logger.warn({ cameraId }, "Webhook: invalid token");
    res.status(401).json({ error: "invalid token" });
    return;
  }

  // Fetch camera (no tenant check here — camera_id+token is enough auth)
  const [camera] = await db
    .select()
    .from(camerasTable)
    .where(eq(camerasTable.id, cameraId));

  if (!camera) {
    res.status(404).json({ error: "camera not found" });
    return;
  }

  // Parse payload — Intelbras sends form-encoded, JSON, or nothing
  const body = req.body ?? {};
  const query = req.query ?? {};

  // Try to extract event type from various Intelbras payload shapes
  const rawEvent =
    body.eventType ?? body.EventType ?? body.event ?? body.Event ??
    query.eventType ?? query.event ?? "VMD";

  const eventType = mapEventType(String(rawEvent));

  // Create event in DB
  const [event] = await db
    .insert(eventsTable)
    .values({
      tenantId: camera.tenantId,
      cameraId: camera.id,
      type: eventType,
      source: "cloud_events",
      confidence: null,
      snapshotUrl: null,
      metadata: {
        source: "intelbras_webhook",
        rawEvent,
        body: Object.keys(body).length ? body : undefined,
      },
      detectedAt: new Date(),
    })
    .returning();

  // Update camera last seen
  await db
    .update(camerasTable)
    .set({ lastSeenAt: new Date(), status: "online" })
    .where(eq(camerasTable.id, camera.id));

  // Broadcast real-time to browser
  broadcastToTenant(camera.tenantId, {
    type: "new_event",
    event: {
      ...event,
      cameraName: camera.name,
    },
  });

  logger.info({ cameraId, eventType, tenantId: camera.tenantId }, "Webhook: event received from Intelbras");

  // Intelbras expects a 200 OK with any body
  res.status(200).json({ ok: true, eventType });
}

export default router;
