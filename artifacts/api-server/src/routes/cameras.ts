import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { Cam } from "onvif";
import { db, camerasTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { triggerSync } from "../lib/onvif-poller";

const router: IRouter = Router();

// ── Test connection (must be before /:id routes) ──────────────────────────────

function parseHostPort(ip: string): { hostname: string; port: number } {
  const [hostname, portStr] = ip.split(":");
  return { hostname: hostname ?? ip, port: portStr ? parseInt(portStr, 10) : 80 };
}

router.post("/cameras/test-connection", requireAuth, async (req, res): Promise<void> => {
  const { ip, username, password } = req.body as { ip?: string; username?: string; password?: string };

  if (!ip) {
    res.status(400).json({ error: "ip é obrigatório" });
    return;
  }

  const { hostname, port } = parseHostPort(ip);

  try {
    const result = await new Promise<{ manufacturer?: string; model?: string; serialNumber?: string }>((resolve, reject) => {
      new Cam(
        { hostname, port, username: username ?? "admin", password: password ?? "", timeout: 10_000, preserveAddress: true },
        function (this: Cam, err) {
          if (err) { reject(err); return; }
          this.getDeviceInformation((err2, info) => {
            if (err2) resolve({});
            else resolve({ manufacturer: info?.manufacturer, model: info?.model, serialNumber: info?.serialNumber });
          });
        }
      );
    });
    res.json({ connected: true, ...result });
  } catch (err: any) {
    res.status(502).json({ error: err?.message ?? "Não foi possível conectar" });
  }
});

// ── Network scan ──────────────────────────────────────────────────────────────

router.get("/cameras/scan-network", requireAuth, async (_req, res): Promise<void> => {
  try {
    const { Discovery } = await import("onvif") as any;
    const found: Array<{ ip: string; name?: string }> = [];

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 6_000);

      Discovery.on("device", (cam: any, rinfo: { address: string }) => {
        if (rinfo?.address) {
          found.push({ ip: rinfo.address });
        }
      });

      Discovery.on("error", () => {/* ignore */});

      Discovery.probe({ timeout: 5000 }, () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Deduplicate by IP
    const unique = [...new Map(found.map((d) => [d.ip, d])).values()];
    res.json({ devices: unique });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Scan failed", devices: [] });
  }
});

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
    onvifEnabled: true,
    mode: mode ?? "cloud_events",
    status: "unknown",
    location: location ?? null,
    notes: notes ?? null,
  }).returning();

  // Immediately try to connect via ONVIF if camera has an IP
  if (ip) triggerSync();

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

// ── Webhook info ──────────────────────────────────────────────────────────────

router.get("/cameras/:id/webhook", requireAuth, async (req, res): Promise<void> => {
  const { generateWebhookToken } = await import("./webhooks");
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [camera] = await db
    .select({ id: camerasTable.id, tenantId: camerasTable.tenantId })
    .from(camerasTable)
    .where(and(eq(camerasTable.id, id), eq(camerasTable.tenantId, req.user!.tenantId)));

  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }

  const token = generateWebhookToken(id);
  // Build the public base URL from the request
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const baseUrl = `${proto}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/intelbras?camera_id=${id}&token=${token}`;

  res.json({ webhookUrl, token });
});

// ── Snapshot proxy ────────────────────────────────────────────────────────────
// Tries common Intelbras / generic camera snapshot endpoints in order.

const SNAPSHOT_PATHS = [
  "/onvifsnapshot/media_service/snapshot?channel=1&subtype=0",
  "/cgi-bin/snapshot.cgi",
  "/webcapture.jpg?command=snap&channel=1",
  "/snapshot.jpg",
  "/snap.jpg",
];

async function fetchSnapshot(
  ip: string,
  username: string | null,
  password: string | null
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const [hostname, portStr] = ip.split(":");
  const port = portStr ?? "80";
  const base = `http://${hostname}:${port}`;

  const authHeader =
    username || password
      ? `Basic ${Buffer.from(`${username ?? "admin"}:${password ?? ""}`).toString("base64")}`
      : undefined;

  for (const path of SNAPSHOT_PATHS) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "image/jpeg";
        if (ct.includes("image") || ct.includes("jpeg") || ct.includes("jpg")) {
          const buf = Buffer.from(await res.arrayBuffer());
          return { buffer: buf, contentType: ct };
        }
      }
    } catch {
      // try next path
    }
  }
  return null;
}

router.get("/cameras/:id/snapshot", requireAuth, async (req, res): Promise<void> => {
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

  if (!camera.ip) {
    res.status(422).json({ error: "Camera has no IP configured" });
    return;
  }

  const snap = await fetchSnapshot(camera.ip, camera.username, camera.passwordEncrypted);
  if (!snap) {
    res.status(502).json({ error: "Could not reach camera — check IP and credentials" });
    return;
  }

  res.set("Content-Type", snap.contentType);
  res.set("Cache-Control", "no-store");
  res.send(snap.buffer);
});

// ─────────────────────────────────────────────────────────────────────────────

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
