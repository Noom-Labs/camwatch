import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";
import { toast } from "sonner";
import { Event } from "@workspace/api-client-react";

export function useWebSocket() {
  const { user, accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user?.tenantId || !accessToken) return;

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/api/ws?tenantId=${user.tenantId}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        // Authenticate the connection
        ws.send(JSON.stringify({ type: 'auth', token: accessToken }));
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Try to reconnect in 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (data.type === 'event' && data.payload) {
            const event: Event = data.payload;
            toast(`Alert: ${event.type.replace('_', ' ')} detected`, {
              description: `Camera: ${event.cameraName || event.cameraId} - ${(event.confidence ? Math.round(event.confidence * 100) : 0)}% confidence`,
              duration: 5000,
            });
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.tenantId, accessToken]);

  return { isConnected };
}

export function WebSocketIndicator() {
  const { isConnected } = useWebSocket();
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sidebar-accent border border-sidebar-border" title={isConnected ? "Real-time feed connected" : "Connecting..."}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`} />
      <span className="text-xs font-medium text-sidebar-foreground">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
