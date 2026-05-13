import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCamera, useListEvents, useDeleteCamera } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Cctv, Wifi, WifiOff, RefreshCw,
  MapPin, Wrench, Tag, FileText, Monitor, Trash2, ExternalLink, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// ── Live snapshot hook ─────────────────────────────────────────────────────────

function useLiveSnapshot(cameraId: number, active: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prevUrl = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSnap = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cameras/${cameraId}/snapshot`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível acessar a câmera");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      prevUrl.current = url;
      setError(null);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError("Timeout ao buscar imagem da câmera");
      }
    } finally {
      setLoading(false);
    }
  }, [cameraId]);

  useEffect(() => {
    if (!active) return;

    fetchSnap();
    timerRef.current = setInterval(fetchSnap, 2_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, [active, fetchSnap]);

  return { blobUrl, error, loading, refresh: fetchSnap };
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    online:  { cls: "bg-green-500/20 text-green-400 border-green-500/30",  label: "Online" },
    offline: { cls: "bg-red-500/20 text-red-400 border-red-500/30",        label: "Offline" },
    unknown: { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Desconhecida" },
  }[status] ?? { cls: "bg-muted text-muted-foreground border-border", label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-green-400 animate-pulse" : "bg-current"}`} />
      {cfg.label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CameraDetail() {
  const { id } = useParams<{ id: string }>();
  const cameraId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [liveActive, setLiveActive] = useState(true);

  const { data: camera, isLoading: camLoading } = useGetCamera(cameraId);
  const { data: events, isLoading: eventsLoading } = useListEvents({ cameraId });
  const deleteMutation = useDeleteCamera();

  const { blobUrl, error: snapError, loading: snapLoading } = useLiveSnapshot(cameraId, liveActive && !!camera);

  const handleDelete = () => {
    if (!confirm("Remover esta câmera? Esta ação não pode ser desfeita.")) return;
    deleteMutation.mutate({ id: cameraId }, {
      onSuccess: () => {
        toast.success("Câmera removida");
        queryClient.invalidateQueries({ queryKey: ["listCameras"] });
        navigate("/cameras");
      },
      onError: () => toast.error("Erro ao remover câmera"),
    });
  };

  if (camLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Câmera não encontrada</h1>
        <Link href="/cameras"><Button variant="outline"><ArrowLeft size={16} className="mr-2" />Voltar</Button></Link>
      </div>
    );
  }

  const rtspUrl = camera.rtspUrl ?? (camera.ip ? `rtsp://${camera.username ?? "admin"}:***@${camera.ip}:554/cam/realmonitor?channel=1&subtype=0` : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cameras">
            <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{camera.name}</h1>
              <StatusBadge status={camera.status} />
              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                {camera.mode === "edge_ai" ? "EDGE AI" : "CLOUD EVENTS"}
              </span>
            </div>
            {camera.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin size={13} /> {camera.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 size={14} className="mr-1.5" />Remover
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live viewer */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor size={16} /> Visualização ao vivo
                </CardTitle>
                <div className="flex items-center gap-2">
                  {liveActive && !snapError && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      AO VIVO
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLiveActive((v) => !v)}
                    className="text-xs h-7"
                  >
                    {liveActive ? "Pausar" : "Retomar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-video bg-zinc-950 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                {blobUrl && !snapError ? (
                  <img
                    src={blobUrl}
                    alt="Live view"
                    className="w-full h-full object-contain"
                  />
                ) : snapError ? (
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <AlertTriangle size={32} className="text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Câmera inacessível pelo servidor</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        O servidor não consegue alcançar {camera.ip} — a câmera está em rede local.
                      </p>
                    </div>
                    {camera.ip && (
                      <a
                        href={`http://${camera.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <ExternalLink size={13} />
                          Abrir câmera no browser
                        </Button>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw size={20} className={snapLoading ? "animate-spin" : ""} />
                    <span className="text-sm">Conectando à câmera...</span>
                  </div>
                )}
              </div>

              {/* Direct links */}
              {(camera.ip || rtspUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {camera.ip && (
                    <a href={`http://${camera.ip}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs gap-1.5">
                        <ExternalLink size={12} /> Abrir interface web
                      </Button>
                    </a>
                  )}
                  {rtspUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => { navigator.clipboard.writeText(rtspUrl); toast.success("URL RTSP copiada"); }}
                    >
                      <Cctv size={12} /> Copiar URL RTSP (VLC)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Eventos desta câmera</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" />
                </div>
              ) : !events?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Cctv size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum evento registrado ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {events.slice(0, 20).map((ev) => (
                    <Link key={ev.id} href={`/events/${ev.id}`}>
                      <div className="flex items-center gap-3 py-2.5 hover:bg-muted/50 rounded px-2 -mx-2 cursor-pointer transition-colors">
                        <div className="w-12 h-9 bg-zinc-900 rounded overflow-hidden border border-border flex-shrink-0 flex items-center justify-center">
                          {ev.snapshotUrl
                            ? <img src={ev.snapshotUrl} alt="" className="w-full h-full object-cover" />
                            : <Cctv size={14} className="text-zinc-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{ev.type.replace("_", " ")}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(ev.detectedAt), "dd/MM/yyyy HH:mm:ss")}</p>
                        </div>
                        {ev.confidence && (
                          <span className="text-xs text-muted-foreground">{Math.round(ev.confidence * 100)}%</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: Wrench,   label: "Fabricante", value: camera.manufacturer },
                { icon: Tag,      label: "Modelo",     value: camera.model },
                { icon: MapPin,   label: "Localização",value: camera.location },
                { icon: Wifi,     label: "IP",         value: camera.ip },
                { icon: Cctv,     label: "Usuário ONVIF", value: camera.username },
                { icon: Monitor,  label: "ONVIF",      value: camera.onvifEnabled ? "Habilitado" : "Desabilitado" },
              ].map(({ icon: Icon, label, value }) => (
                value ? (
                  <div key={label} className="flex items-start gap-2">
                    <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium break-all">{value}</p>
                    </div>
                  </div>
                ) : null
              ))}

              {camera.lastSeenAt && (
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  {camera.status === "online"
                    ? <Wifi size={14} className="text-green-400 mt-0.5" />
                    : <WifiOff size={14} className="text-muted-foreground mt-0.5" />}
                  <div>
                    <p className="text-xs text-muted-foreground">Último contato</p>
                    <p className="font-medium">{formatDistanceToNow(new Date(camera.lastSeenAt), { addSuffix: true })}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {camera.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FileText size={14} />Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{camera.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de eventos</span>
                <span className="font-bold">{events?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastrada em</span>
                <span className="font-medium">{format(new Date(camera.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
