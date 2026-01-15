import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices";
import CustomersPage from "@/pages/customers";
import DunningRulesPage from "@/pages/dunning-rules";
import DunningTemplatesPage from "@/pages/dunning-templates";
import SettingsPage from "@/pages/settings";
import UsersPage from "@/pages/users";
import DebugPage from "@/pages/debug";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between h-16 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 min-h-0 overflow-hidden p-6 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { useEffect } from "react";

function InternalRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isCustomer = user?.role === "customer";
  
  useEffect(() => {
    if (isCustomer) {
      setLocation("/");
    }
  }, [isCustomer, setLocation]);
  
  if (isCustomer) {
    return null;
  }
  
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  
  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
    }
  }, [isAdmin, setLocation]);
  
  if (!isAdmin) {
    return null;
  }
  
  return <Component />;
}

function CanEditDebtorsRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const canEdit = user?.role === "admin" || user?.role === "user";
  
  useEffect(() => {
    if (!canEdit) {
      setLocation("/");
    }
  }, [canEdit, setLocation]);
  
  if (!canEdit) {
    return null;
  }
  
  return <Component />;
}

function AuthenticatedRoutes() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/customers">
          <InternalRoute component={CustomersPage} />
        </Route>
        <Route path="/dunning-rules">
          <InternalRoute component={DunningRulesPage} />
        </Route>
        <Route path="/dunning-templates">
          <AdminRoute component={DunningTemplatesPage} />
        </Route>
        <Route path="/settings">
          <AdminRoute component={SettingsPage} />
        </Route>
        <Route path="/users">
          <AdminRoute component={UsersPage} />
        </Route>
        <Route path="/debug">
          <AdminRoute component={DebugPage} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/>
            <path d="M16 6h.01"/>
            <path d="M12 6h.01"/>
            <path d="M12 10h.01"/>
            <path d="M12 14h.01"/>
            <path d="M16 10h.01"/>
            <path d="M16 14h.01"/>
            <path d="M8 10h.01"/>
            <path d="M8 14h.01"/>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        {user ? <AuthenticatedRoutes /> : <LandingPage />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="bhb-portal-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
