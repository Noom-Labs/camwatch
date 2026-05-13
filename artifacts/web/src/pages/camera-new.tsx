import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCamera } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, ArrowLeft, Cctv, Wifi, WifiOff,
  CheckCircle2, XCircle, Search, Plus, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TestResult {
  connected: boolean;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  error?: string;
}

interface ScannedDevice {
  ip: string;
}

// ── Helper ─────────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("accessToken");
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CameraNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createCamera = useCreateCamera();

  // Step 1: connection fields
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  // Step 2: camera details (after test)
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  // Network scan
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedDevice[]>([]);

  // ── Test connection ──────────────────────────────────────────────────────────

  const handleTest = async () => {
    if (!ip.trim()) { toast.error("Digite o IP da câmera"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/cameras/test-connection", {
        method: "POST",
        body: JSON.stringify({ ip: ip.trim(), username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ connected: true, ...data });
        // Auto-fill name from model info
        const suggestion = [data.manufacturer, data.model].filter(Boolean).join(" ") || `Câmera ${ip.trim()}`;
        setName(suggestion);
        toast.success("Câmera encontrada!");
      } else {
        setTestResult({ connected: false, error: data.error ?? "Falha na conexão" });
      }
    } catch {
      setTestResult({ connected: false, error: "Erro de rede ao tentar conectar" });
    } finally {
      setTesting(false);
    }
  };

  // ── Network scan ─────────────────────────────────────────────────────────────

  const handleScan = async () => {
    setScanning(true);
    setScanned([]);
    try {
      const res = await apiFetch("/api/cameras/scan-network");
      const data = await res.json();
      setScanned(data.devices ?? []);
      if ((data.devices ?? []).length === 0) {
        toast.info("Nenhuma câmera encontrada na rede. Verifique se estão na mesma sub-rede.");
      } else {
        toast.success(`${data.devices.length} câmera(s) encontrada(s)!`);
      }
    } catch {
      toast.error("Erro ao escanear a rede");
    } finally {
      setScanning(false);
    }
  };

  const pickDevice = (device: ScannedDevice) => {
    setIp(device.ip);
    setScanned([]);
    setTestResult(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Nome da câmera é obrigatório"); return; }
    if (!ip.trim()) { toast.error("IP é obrigatório"); return; }

    createCamera.mutate(
      {
        data: {
          name: name.trim(),
          ip: ip.trim(),
          username: username || undefined,
          password: password || undefined,
          manufacturer: testResult?.manufacturer ?? undefined,
          model: testResult?.model ?? undefined,
          location: location.trim() || undefined,
          mode: "cloud_events",
          onvifEnabled: true,
        },
      },
      {
        onSuccess: (cam) => {
          toast.success("Câmera cadastrada! Conectando via ONVIF...");
          queryClient.invalidateQueries({ queryKey: ["listCameras"] });
          navigate(`/cameras/${cam.id}`);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "Falha ao cadastrar câmera");
        },
      }
    );
  };

  const step2Unlocked = testResult?.connected === true;

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cameras">
          <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adicionar câmera</h1>
          <p className="text-muted-foreground text-sm">Informe o IP da câmera para conectar</p>
        </div>
      </div>

      {/* Step 1 — Conexão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            Conexão com a câmera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip">
              Endereço IP
              <span className="text-muted-foreground font-normal ml-1 text-xs">(ex: 192.168.68.112 ou 192.168.68.112:80)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="ip"
                placeholder="192.168.68.112"
                value={ip}
                onChange={(e) => { setIp(e.target.value); setTestResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleScan}
                disabled={scanning}
                className="flex-shrink-0 gap-1.5"
                title="Escanear rede em busca de câmeras ONVIF"
              >
                {scanning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {scanning ? "Buscando..." : "Escanear rede"}
              </Button>
            </div>

            {/* Scan results */}
            {scanned.length > 0 && (
              <div className="border border-border rounded-md divide-y divide-border bg-card mt-1">
                <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                  {scanned.length} câmera(s) encontrada(s) — clique para selecionar:
                </p>
                {scanned.map((d) => (
                  <button
                    key={d.ip}
                    type="button"
                    onClick={() => pickDevice(d)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Cctv size={14} className="text-muted-foreground" />
                      <span className="font-mono text-sm">{d.ip}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" placeholder="admin" value={username} onChange={(e) => { setUsername(e.target.value); setTestResult(null); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setTestResult(null); }} />
            </div>
          </div>

          {/* Test result feedback */}
          {testResult && (
            <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
              testResult.connected
                ? "bg-green-500/10 border-green-500/30 text-green-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}>
              {testResult.connected
                ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
              <div>
                {testResult.connected ? (
                  <>
                    <p className="font-medium">Câmera conectada via ONVIF!</p>
                    {(testResult.manufacturer || testResult.model) && (
                      <p className="text-xs mt-0.5 opacity-80">
                        {[testResult.manufacturer, testResult.model].filter(Boolean).join(" ")}
                        {testResult.serialNumber ? ` · S/N: ${testResult.serialNumber}` : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium">Falha na conexão</p>
                    <p className="text-xs mt-0.5 opacity-80">{testResult.error}</p>
                    <p className="text-xs mt-1 opacity-70">Verifique IP, usuário e senha. A câmera deve estar na mesma rede que este servidor.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={handleTest}
            disabled={testing || !ip.trim()}
            className="w-full gap-2"
            variant={step2Unlocked ? "outline" : "default"}
          >
            {testing ? (
              <><Loader2 size={16} className="animate-spin" />Testando conexão...</>
            ) : step2Unlocked ? (
              <><Wifi size={16} />Conectada — testar novamente</>
            ) : (
              <><Wifi size={16} />Testar conexão ONVIF</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — Detalhes */}
      <Card className={step2Unlocked ? "" : "opacity-50 pointer-events-none"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step2Unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
            Identificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome da câmera <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Entrada principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">
              Localização <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <Input
              id="location"
              placeholder="Ex: Portaria, Estacionamento, Corredor"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/cameras">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={!step2Unlocked || !name.trim() || createCamera.isPending}
          className="gap-2"
        >
          {createCamera.isPending
            ? <><Loader2 size={16} className="animate-spin" />Cadastrando...</>
            : <><Plus size={16} />Cadastrar câmera</>}
        </Button>
      </div>
    </div>
  );
}
