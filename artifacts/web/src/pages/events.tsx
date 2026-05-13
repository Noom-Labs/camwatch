import React from "react";
import { useListEvents } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Cctv } from "lucide-react";
import { Link } from "wouter";

export default function Events() {
  const { data: events, isLoading } = useListEvents({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feed de eventos</h1>
          <p className="text-muted-foreground">Todos os eventos de detecção das suas câmeras</p>
        </div>
      </div>

      <Card>
        <div className="rounded-md border border-border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b border-border bg-muted/50">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Pré-visualização</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Câmera</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Confiança</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Horário</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando eventos...</td>
                  </tr>
                ) : !events?.length ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum evento encontrado</td>
                  </tr>
                ) : (
                  events.map(event => (
                    <tr key={event.id} className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle">
                        <Link href={`/events/${event.id}`}>
                          <div className="w-16 h-12 bg-zinc-900 rounded overflow-hidden flex items-center justify-center border border-border cursor-pointer hover:border-primary">
                            {event.snapshotUrl ? (
                              <img src={event.snapshotUrl} alt="Imagem" className="w-full h-full object-cover" />
                            ) : (
                              <Cctv size={16} className="text-zinc-600" />
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                          {event.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 align-middle font-medium">
                        <Link href={`/cameras/${event.cameraId}`} className="hover:text-primary transition-colors">
                          {event.cameraName || `Câmera ${event.cameraId}`}
                        </Link>
                      </td>
                      <td className="p-4 align-middle">
                        {event.confidence ? `${Math.round(event.confidence * 100)}%` : '-'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {format(new Date(event.detectedAt), "dd/MM/yyyy HH:mm:ss")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
