import { Cam } from "onvif";
import { eq, and, inArray } from "drizzle-orm";
import { db, camerasTable, eventsTable } from "@workspace/db";
import type { EventType } from "@workspace/db";
import { broadcastToTenant } from "./websocket";
import { logger } from "./logger";

// cameraId -> active Cam instance
const activeCams = new Map<number, Cam>();

// ── Event type mapping ────────────────────────────────────────────────────────

function mapOnvifTopic(topic: string | undefined): EventType {
  const t = (topic ?? "").toLowerCase();
  if (t.includes("linedetector") || t.includes("linecrossing")) return "line_cross";
  if (t.includes("fieldetector") || t.includes("objectsinside") || t.includes("zone_enter")) return "zone_enter";
  if (t.includes("zone_exit") || t.includes("objectsoutside")) return "zone_exit";
  if (t.includes("vehicle") || t.includes("car")) return "vehicle";
  if (t.includes("motorcycle") || t.includes("motorbike")) return "motorcycle";
  if (t.includes("truck")) return "truck";
  if (t.includes("person") || t.includes("human")) return "person";
  return "motion"; // fallback
}

function isActiveEvent(msg: import("onvif").OnvifMessage): boolean {
  // Only fire on "true" state — ignore "false" (motion ended) messages
  const items = msg.message?.message?.data?.simpleItem;
  if (!items) return true; // no filter data → treat as active
  const arr = Array.isArray(items) ? items : [items];
  return arr.some((item) => {
    const val = item.$?.Value?.toLowerCase();
    return val === "true" || val === "1" || val === undefined;
  });
}

// ── Connect one camera ────────────────────────────────────────────────────────

function parseHostPort(ip: string): { hostname: string; port: number } {
  // Allow "192.168.1.100:8080" or just "192.168.1.100"
  const [hostname, portStr] = ip.split(":");
  return { hostname: hostname ?? ip, port: portStr ? parseInt(portStr, 10) : 80 };
}

async function connectCamera(cam: {
  id: number;
  tenantId: number;
  ip: string | null;
  username: string | null;
  passwordEncrypted: string | null;
  name: string;
}): Promise<void> {
  if (!cam.ip) {
    logger.warn({ cameraId: cam.id }, "ONVIF: no IP configured, skipping");
    return;
  }

  if (activeCams.has(cam.id)) return; // already connected

  const { hostname, port } = parseHostPort(cam.ip);

  logger.info({ cameraId: cam.id, hostname, port }, "ONVIF: connecting...");

  new Cam(
    {
      hostname,
      port,
      username: cam.username ?? "admin",
      password: cam.passwordEncrypted ?? "",
      timeout: 15_000,
      preserveAddress: true,
    },
    async function (this: Cam, err) {
      if (err) {
        logger.warn(
          { cameraId: cam.id, hostname, err: err.message },
          "ONVIF: connection failed"
        );
        await db
          .update(camerasTable)
          .set({ status: "offline" })
          .where(eq(camerasTable.id, cam.id));
        return;
      }

      logger.info({ cameraId: cam.id, name: cam.name }, "ONVIF: connected ✓");

      await db
        .update(camerasTable)
        .set({ status: "online", lastSeenAt: new Date() })
        .where(eq(camerasTable.id, cam.id));

      activeCams.set(cam.id, this);

      this.on("event", async (msg) => {
        try {
          if (!isActiveEvent(msg)) return;

          const eventType = mapOnvifTopic(msg.topic?._);
          const utcTime = msg.message?.message?.$?.UtcTime;
          const detectedAt = utcTime ? new Date(utcTime) : new Date();

          const [event] = await db
            .insert(eventsTable)
            .values({
              tenantId: cam.tenantId,
              cameraId: cam.id,
              type: eventType,
              source: "onvif",
              confidence: null,
              metadata: { topic: msg.topic?._, raw: msg.message?.message?.data },
              detectedAt,
            })
            .returning();

          // Also bump lastSeenAt
          await db
            .update(camerasTable)
            .set({ lastSeenAt: new Date() })
            .where(eq(camerasTable.id, cam.id));

          broadcastToTenant(cam.tenantId, { type: "new_event", event });

          logger.info(
            { cameraId: cam.id, eventType, topic: msg.topic?._ },
            "ONVIF: event received"
          );
        } catch (insertErr) {
          logger.error({ err: insertErr, cameraId: cam.id }, "ONVIF: failed to store event");
        }
      });

      // Heartbeat — keep lastSeenAt fresh every 30 s
      const heartbeat = setInterval(async () => {
        if (!activeCams.has(cam.id)) {
          clearInterval(heartbeat);
          return;
        }
        await db
          .update(camerasTable)
          .set({ lastSeenAt: new Date() })
          .where(eq(camerasTable.id, cam.id));
      }, 30_000);
    }
  );
}

// ── Disconnect cameras that were removed or disabled ─────────────────────────

async function disconnectStale(activeCameraIds: number[]): Promise<void> {
  for (const id of activeCams.keys()) {
    if (!activeCameraIds.includes(id)) {
      logger.info({ cameraId: id }, "ONVIF: removing stale connection");
      activeCams.delete(id);
    }
  }
}

// ── Main poll loop ────────────────────────────────────────────────────────────

async function syncCameras(): Promise<void> {
  try {
    // Fetch ALL cameras — filter in-process to those with an IP configured
    const allCameras = await db.select().from(camerasTable);
    const cameras = allCameras.filter((c) => c.ip && c.ip.trim() !== "");

    const ids = cameras.map((c) => c.id);
    await disconnectStale(ids);

    for (const cam of cameras) {
      await connectCamera(cam);
    }
  } catch (err) {
    logger.error({ err }, "ONVIF: syncCameras failed");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startOnvifPoller(): void {
  logger.info("ONVIF poller starting...");

  // Initial sync after 3 s to let DB settle
  setTimeout(syncCameras, 3_000);

  // Re-sync every 2 minutes to pick up newly added cameras
  syncInterval = setInterval(syncCameras, 2 * 60_000);
}

export function stopOnvifPoller(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  activeCams.clear();
  logger.info("ONVIF poller stopped");
}

export function getPollerStatus(): { connected: number; cameraIds: number[] } {
  return { connected: activeCams.size, cameraIds: [...activeCams.keys()] };
}

export function triggerSync(): void {
  syncCameras().catch((err) => logger.error({ err }, "ONVIF: triggerSync failed"));
}
