import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCamera } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Cctv, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  mode: z.enum(["cloud_events", "edge_ai"]),
  ip: z.string().optional(),
  rtspUrl: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  onvifEnabled: z.boolean().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CameraNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createCamera = useCreateCamera();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      mode: "cloud_events",
      ip: "",
      rtspUrl: "",
      username: "",
      password: "",
      manufacturer: "",
      model: "",
      onvifEnabled: false,
      location: "",
      notes: "",
    },
  });

  const mode = form.watch("mode");

  const onSubmit = (values: FormValues) => {
    const data = {
      name: values.name,
      mode: values.mode,
      ...(values.ip ? { ip: values.ip } : {}),
      ...(values.rtspUrl ? { rtspUrl: values.rtspUrl } : {}),
      ...(values.username ? { username: values.username } : {}),
      ...(values.password ? { password: values.password } : {}),
      ...(values.manufacturer ? { manufacturer: values.manufacturer } : {}),
      ...(values.model ? { model: values.model } : {}),
      ...(values.location ? { location: values.location } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      onvifEnabled: values.onvifEnabled ?? false,
    };

    createCamera.mutate({ data }, {
      onSuccess: () => {
        toast.success("Câmera cadastrada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["listCameras"] });
        navigate("/cameras");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Falha ao cadastrar câmera");
      },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/cameras">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova câmera</h1>
          <p className="text-muted-foreground text-sm">Cadastre uma câmera IP na sua frota</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Modo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modo de operação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => form.setValue("mode", "cloud_events")}
                className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-colors text-left ${
                  mode === "cloud_events"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80"
                }`}
              >
                <Cctv size={22} className={mode === "cloud_events" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-sm">Cloud Events (ONVIF)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Câmera conectada via rede, eventos enviados para a nuvem</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => form.setValue("mode", "edge_ai")}
                className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-colors text-left ${
                  mode === "edge_ai"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80"
                }`}
              >
                <Cpu size={22} className={mode === "edge_ai" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-sm">Edge AI (YOLOv8)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">IA rodando localmente via agente edge instalado no local</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Informações básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da câmera *</Label>
              <Input id="name" placeholder="Ex: Entrada principal" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input id="manufacturer" placeholder="Hikvision, Dahua…" {...form.register("manufacturer")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input id="model" placeholder="DS-2CD2185G1" {...form.register("model")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input id="location" placeholder="Ex: Portaria Bloco A" {...form.register("location")} />
            </div>
          </CardContent>
        </Card>

        {/* Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip">Endereço IP</Label>
                <Input id="ip" placeholder="192.168.1.100" {...form.register("ip")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rtspUrl">URL RTSP</Label>
                <Input id="rtspUrl" placeholder="rtsp://…" {...form.register("rtspUrl")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" placeholder="admin" {...form.register("username")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
              </div>
            </div>

            {mode === "cloud_events" && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  id="onvifEnabled"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-primary"
                  {...form.register("onvifEnabled")}
                />
                <Label htmlFor="onvifEnabled" className="cursor-pointer font-normal">
                  Habilitar ONVIF
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Informações adicionais sobre esta câmera…"
              {...form.register("notes")}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/cameras">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={createCamera.isPending}>
            {createCamera.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar câmera
          </Button>
        </div>
      </form>
    </div>
  );
}
