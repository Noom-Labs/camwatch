import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { logger } from "./logger";

interface TenantClient {
  ws: WebSocket;
  tenantId: number;
}

const clients: Set<TenantClient> = new Set();

export function createWss(server: import("http").Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const tenantId = parseInt(url.searchParams.get("tenantId") ?? "0", 10);

    if (!tenantId) {
      ws.close(1008, "tenantId required");
      return;
    }

    const client: TenantClient = { ws, tenantId };
    clients.add(client);
    logger.info({ tenantId }, "WebSocket client connected");

    ws.on("close", () => {
      clients.delete(client);
      logger.info({ tenantId }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, tenantId }, "WebSocket error");
      clients.delete(client);
    });
  });

  return wss;
}

export function broadcastToTenant(tenantId: number, event: object): void {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}
