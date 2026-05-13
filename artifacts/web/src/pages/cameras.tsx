import React from "react";
import { useListCameras } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Cctv, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Cameras() {
  const { data: cameras, isLoading } = useListCameras();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Câmeras</h1>
          <p className="text-muted-foreground">Gerencie sua frota de câmeras IP</p>
        </div>
        <Link href="/cameras/new">
          <Button><Plus size={16} className="mr-2" /> Adicionar câmera</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : cameras?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-lg text-center">
          <Cctv size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma câmera encontrada</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6">Adicione sua primeira câmera para começar a monitorar eventos e detecções.</p>
          <Link href="/cameras/new">
            <Button>Adicionar primeira câmera</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras?.map(camera => (
            <Link key={camera.id} href={`/cameras/${camera.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${camera.status === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                        <Cctv size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">{camera.name}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{camera.ip || camera.rtspUrl || 'Sem IP configurado'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        camera.status === 'online' ? 'bg-green-500/20 text-green-400' : 
                        camera.status === 'offline' ? 'bg-destructive/20 text-destructive-foreground' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {camera.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {camera.mode === 'edge_ai' ? 'EDGE AI' : 'CLOUD'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground border-t border-border pt-4">
                    <div>
                      <span className="block opacity-70">Fabricante</span>
                      <span className="font-medium text-foreground">{camera.manufacturer || 'Desconhecido'}</span>
                    </div>
                    <div>
                      <span className="block opacity-70">Vista por último</span>
                      <span className="font-medium text-foreground">{camera.lastSeenAt ? formatDistanceToNow(new Date(camera.lastSeenAt), { addSuffix: true }) : 'Nunca'}</span>
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
