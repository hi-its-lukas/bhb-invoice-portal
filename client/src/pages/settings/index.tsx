import { useState } from "react";
import { Link } from "wouter";
import { Server, Mail, Building2, Paintbrush, ChevronRight, Layout, RefreshCw, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConfigStatus {
  bhb: boolean;
  smtp: boolean;
  graph: boolean;
  company: boolean;
  branding: boolean;
}

const settingsSections = [
  {
    title: "BuchhaltungsButler API",
    description: "Verbindung zur BHB-Buchhaltungssoftware konfigurieren",
    icon: Server,
    href: "/settings/bhb",
    configKey: "bhb" as const,
  },
  {
    title: "E-Mail-Versand",
    description: "SMTP oder Microsoft Graph für den Mahnungsversand",
    icon: Mail,
    href: "/settings/email",
    configKey: "smtp" as const,
  },
  {
    title: "Unternehmen & Zinsen",
    description: "Firmendaten, Bankverbindung und gesetzliche Zinssätze",
    icon: Building2,
    href: "/settings/company",
    configKey: "company" as const,
  },
  {
    title: "Branding & Design",
    description: "Logo, Favicon, Farben und Portal-Erscheinungsbild",
    icon: Paintbrush,
    href: "/settings/branding",
    configKey: "branding" as const,
  },
  {
    title: "Startseite",
    description: "Landing-Page Inhalte und Konfiguration",
    icon: Layout,
    href: "/settings/landing",
    configKey: "branding" as const,
  },
  {
    title: "Synchronisation",
    description: "Automatischer Abgleich mit BuchhaltungsButler",
    icon: RefreshCw,
    href: "/settings/sync",
    configKey: "bhb" as const,
  },
];

export default function SettingsIndexPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const { data: bhbConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/bhb"],
  });

  const { data: smtpConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/smtp"],
  });

  const { data: graphConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/msgraph"],
  });

  const { data: companyConfig } = useQuery<{ name: string }>({
    queryKey: ["/api/settings/company"],
  });

  const { data: brandingConfig } = useQuery<{ companyName: string }>({
    queryKey: ["/api/config/branding"],
  });

  const configStatus: ConfigStatus = {
    bhb: bhbConfig?.isConfigured || false,
    smtp: smtpConfig?.isConfigured || graphConfig?.isConfigured || false,
    graph: graphConfig?.isConfigured || false,
    company: !!companyConfig?.name,
    branding: !!brandingConfig?.companyName,
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/system/start-update") as Response;
      return response.json();
    },
    onMutate: () => {
      setIsUpdating(true);
    },
    onSuccess: () => {
      toast({
        title: "Update gestartet",
        description: "Das System wird aktualisiert. Die Seite wird gleich neu geladen.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: Error) => {
      setIsUpdating(false);
      toast({
        title: "Update fehlgeschlagen",
        description: error.message || "Das Update konnte nicht gestartet werden.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      {isUpdating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Update wird gestartet...</h2>
              <p className="text-muted-foreground mt-1">
                Das System wird aktualisiert. Bitte warten Sie.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie das Portal und die Integrationen
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isConfigured = configStatus[section.configKey];
            
            return (
              <Link key={section.href} href={section.href}>
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isConfigured ? "default" : "secondary"}>
                          {isConfigured ? "Konfiguriert" : "Offen"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>{section.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">System-Update</CardTitle>
                <CardDescription>
                  Laden Sie die neueste Version der Anwendung herunter und installieren Sie sie
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Während des Updates wird eine Wartungsseite angezeigt. Das System startet automatisch neu.
            </p>
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || isUpdating}
              data-testid="button-start-update"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Update wird gestartet...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Update starten
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
