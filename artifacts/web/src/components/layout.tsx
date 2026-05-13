import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { WebSocketIndicator } from "@/lib/websocket";
import { 
  LayoutDashboard, 
  Cctv, 
  ActivitySquare, 
  Map, 
  BellRing, 
  Server, 
  Users, 
  Settings,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/cameras", label: "Câmeras", icon: Cctv },
  { href: "/events", label: "Eventos", icon: ActivitySquare },
  { href: "/zones", label: "Zonas", icon: Map },
  { href: "/notifications", label: "Notificações", icon: BellRing },
  { href: "/edge-agents", label: "Agentes Edge", icon: Server },
  { href: "/users", label: "Usuários", icon: Users },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Painel",
  cameras: "Câmeras",
  events: "Eventos",
  zones: "Zonas",
  notifications: "Notificações",
  "edge-agents": "Agentes Edge",
  users: "Usuários",
  settings: "Configurações",
};

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-sidebar flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <ShieldAlert size={18} />
            </div>
            CamWatch
          </Link>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    }`}>
                      <item.icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      {item.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.tenantName}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Sair">
            <LogOut size={16} />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-[100dvh] overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-muted-foreground">
              {PAGE_TITLES[location.split('/')[1] ?? ''] ?? 'Painel'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
