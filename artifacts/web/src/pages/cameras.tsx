import React, { useState } from "react";
import { useListCameras } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Cctv, Bell, CheckCircle2, Loader2, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

function useTestNotification() {
  const [testing, setTesting] = useState(false);
  const [done, setDone] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      // Request permission first if not granted
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.info("Permissão de notificação negada. Habilite nas configurações do browser.");
          return;
        }
      }

      // Show a test browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("CamWatch — Teste de Alerta", {
          body: "As notificações estão funcionando! Você receberá alertas desta forma.",
          icon: "/favicon.ico",
          tag: "camwatch-test",
        });
      }

      // Also show a toast
      toast.success("Notificação enviada! Verifique o aviso do sistema.", { duration: 5000 });
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } finally {
      setTesting(false);
    }
  };

  return { test, testing, done };
}

export default function Cameras() {
  const { data: cameras, isLoading } = useListCameras();
  const { test: testNotification, testing: testingNotif, done: notifDone } = useTestNotification();

  const onlineCount = cameras?.filter((c) => c.status === "online").length ?? 0;
  const offlineCount = cameras?.filter((c) => c.status === "offline").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Câmeras</h1>
          <p className="text-muted-foreground text-sm">
            {cameras
              ? `${cameras.length} câmera(s) · ${onlineCount} online · ${offlineCount} offline`
              : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testNotification}
            disabled={testingNotif}
            className="gap-1.5"
            title="Envia uma notificação de teste para verificar se os alertas estão funcionando"
          >
            {testingNotif ? (
              <Loader2 size={14} className="animate-spin" />
            ) : notifDone ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <Bell size={14} />
            )}
            {notifDone ? "Enviada!" : "Testar notificação"}
          </Button>
          <Link href="/cameras/new">
            <Button className="gap-1.5">
              <Plus size={16} /> Adicionar câmera
            </Button>
          </Link>
        </div>
      </div>

      {/* Camera grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : cameras?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-lg text-center">
          <Cctv size={48} className="text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-semibold">Nenhuma câmera cadastrada</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6 text-sm">
            Adicione sua câmera Intelbras ou qualquer câmera ONVIF — basta informar o IP, usuário e senha.
          </p>
          <Link href="/cameras/new">
            <Button className="gap-1.5"><Plus size={16} />Adicionar primeira câmera</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras?.map((camera) => (
            <Link key={camera.id} href={`/cameras/${camera.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          camera.status === "online"
                            ? "bg-green-500/10 text-green-400"
                            : camera.status === "offline"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Cctv size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {camera.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {camera.ip ?? camera.rtspUrl ?? "Sem IP"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                      <span
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          camera.status === "online"
                            ? "bg-green-500/20 text-green-400"
                            : camera.status === "offline"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {camera.status === "online" ? (
                          <Wifi size={9} />
                        ) : (
                          <WifiOff size={9} />
                        )}
                        {camera.status === "online" ? "ONLINE" : camera.status === "offline" ? "OFFLINE" : "AGUARDANDO"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border pt-3 mt-1">
                    <div>
                      <span className="block opacity-70 mb-0.5">Modelo</span>
                      <span className="font-medium text-foreground truncate block">
                        {[camera.manufacturer, camera.model].filter(Boolean).join(" ") || "Desconhecido"}
                      </span>
                    </div>
                    <div>
                      <span className="block opacity-70 mb-0.5">Último contato</span>
                      <span className="font-medium text-foreground">
                        {camera.lastSeenAt
                          ? formatDistanceToNow(new Date(camera.lastSeenAt), { addSuffix: true })
                          : "Nunca"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
