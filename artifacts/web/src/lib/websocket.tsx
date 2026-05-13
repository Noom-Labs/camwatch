import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";
import { toast } from "sonner";
import { Event } from "@workspace/api-client-react";

// ── Browser notification helper ────────────────────────────────────────────────

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "camwatch-alert",
      renotify: true,
    });
    // Auto-close after 8s
    setTimeout(() => n.close(), 8_000);
  } catch {
    // Ignore — some browsers block notifications in iframes
  }
}

// ── WebSocket hook ─────────────────────────────────────────────────────────────

export function useWebSocket() {
  const { user, accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Request permission as soon as the user is logged in
  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  useEffect(() => {
    if (!user?.tenantId || !accessToken) return;

    const host = window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${host}/api/ws?tenantId=${user.tenantId}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "auth", token: accessToken }));
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 5_000);
      };

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);

          if (data.type === "new_event" && data.event) {
            const event: Event & { cameraName?: string } = data.event;

            const typeLabel = event.type.replace(/_/g, " ");
            const camera = event.cameraName ?? `câmera ${event.cameraId}`;
            const confidence = event.confidence != null ? ` (${Math.round(event.confidence * 100)}%)` : "";

            // Toast in the app
            toast(`Alerta: ${typeLabel} detectado`, {
              description: `${camera}${confidence}`,
              duration: 6_000,
            });

            // Browser notification (works even com a aba em segundo plano)
            showBrowserNotification(
              `CamWatch — ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`,
              `Câmera: ${camera}${confidence}`
            );
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [user?.tenantId, accessToken]);

  return { isConnected };
}

// ── Status indicator ───────────────────────────────────────────────────────────

export function WebSocketIndicator() {
  const { isConnected } = useWebSocket();

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sidebar-accent border border-sidebar-border"
      title={isConnected ? "Feed em tempo real conectado" : "Conectando..."}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected
            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
            : "bg-red-500"
        }`}
      />
      <span className="text-xs font-medium text-sidebar-foreground">
        {isConnected ? "Ao vivo" : "Offline"}
      </span>
    </div>
  );
}
