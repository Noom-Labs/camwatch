import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { createWss } from "./lib/websocket";
import { startOnvifPoller, stopOnvifPoller } from "./lib/onvif-poller";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

createWss(server);

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  startOnvifPoller();
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});

process.on("SIGTERM", () => {
  stopOnvifPoller();
  server.close(() => process.exit(0));
});
