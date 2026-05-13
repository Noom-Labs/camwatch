import React from "react";
import { useGetDashboardStats, useGetRecentEvents, useGetEventsByHour } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cctv, Server, AlertTriangle, Loader2, SquareActivity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentEvents, isLoading: eventsLoading } = useGetRecentEvents({ limit: 5 });
  const { data: eventsByHour, isLoading: hourlyLoading } = useGetEventsByHour();

  if (statsLoading || eventsLoading || hourlyLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de eventos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">+{stats?.eventsToday || 0} hoje</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Câmeras online</CardTitle>
            <Cctv className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.camerasOnline || 0} / {stats?.camerasTotal || 0}</div>
            <p className="text-xs text-muted-foreground">Transmissões ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Edge</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.edgeAgentsOnline || 0}</div>
            <p className="text-xs text-muted-foreground">Agentes conectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do sistema</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Operacional</div>
            <p className="text-xs text-muted-foreground">Todos os sistemas ok</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Linha do tempo (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {eventsByHour && eventsByHour.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventsByHour}>
                    <XAxis 
                      dataKey="hour" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => format(new Date(val), 'ha')}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-muted)' }} 
                      contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, h:mm a')}
                    />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados disponíveis</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents?.map(event => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border">
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0 relative border border-border">
                      {event.snapshotUrl ? (
                        <img src={event.snapshotUrl} alt="Snapshot" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Cctv size={16} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize truncate">{event.type.replace('_', ' ')}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(event.detectedAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{event.cameraName || `Câmera ${event.cameraId}`}</p>
                      {event.confidence && (
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${event.confidence * 100}%` }} />
                          </div>
                          <span className="text-[10px] ml-2 text-muted-foreground">{Math.round(event.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {!recentEvents?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <SquareActivity size={24} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum evento recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
