import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Users,
  AlertTriangle,
  Mail,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface BrandingConfig {
  companyName: string;
  companyTagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryForeground: string;
  accentColor: string;
  sidebarColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  footerText: string | null;
  customCss: string | null;
}

const allNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: ["admin", "user", "customer"],
  },
  {
    title: "Rechnungen",
    url: "/invoices",
    icon: FileText,
    roles: ["admin", "user", "customer"],
  },
  {
    title: "Debitoren",
    url: "/customers",
    icon: Users,
    roles: ["admin", "user"],
  },
  {
    title: "Mahnregeln",
    url: "/dunning-rules",
    icon: AlertTriangle,
    roles: ["admin", "user"],
  },
  {
    title: "Mahnvorlagen",
    url: "/dunning-templates",
    icon: Mail,
    roles: ["admin"],
  },
  {
    title: "Einstellungen",
    url: "/settings",
    icon: Settings,
    roles: ["admin", "user"],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const { data: branding } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
    staleTime: 1000 * 60 * 5,
  });
  
  const userRole = user?.role || "customer";
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  const getInitials = () => {
    if (user?.displayName) {
      const parts = user.displayName.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt={branding.companyName || "Logo"} 
              className="h-10 w-10 object-contain rounded-md"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{branding?.companyName || "Kundenportal"}</span>
            <span className="text-xs text-muted-foreground">{branding?.companyTagline || "Rechnungen & Zahlungen"}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-link-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.displayName || user?.username || "Benutzer"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role === "admin" ? "Administrator" : user?.role === "customer" ? "Kunde" : "Mitarbeiter"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
