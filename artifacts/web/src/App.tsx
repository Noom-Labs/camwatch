import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Cameras from "@/pages/cameras";
import CameraNew from "@/pages/camera-new";
import CameraDetail from "@/pages/camera-detail";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import Zones from "@/pages/zones";
import Notifications from "@/pages/notifications";
import EdgeAgents from "@/pages/edge-agents";
import Users from "@/pages/users";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

// Set dark mode on mount
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <MainLayout>
      <Component {...rest} />
    </MainLayout>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/cameras"><ProtectedRoute component={Cameras} /></Route>
      <Route path="/cameras/new"><ProtectedRoute component={CameraNew} /></Route>
      <Route path="/cameras/:id"><ProtectedRoute component={CameraDetail} /></Route>
      <Route path="/events"><ProtectedRoute component={Events} /></Route>
      <Route path="/events/:id"><ProtectedRoute component={EventDetail} /></Route>
      <Route path="/zones"><ProtectedRoute component={Zones} /></Route>
      <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
      <Route path="/edge-agents"><ProtectedRoute component={EdgeAgents} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
