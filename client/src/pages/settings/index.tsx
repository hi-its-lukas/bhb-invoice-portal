import { useState } from "react";
import { Link } from "wouter";
import { Server, Mail, Building2, Paintbrush, ChevronRight, Layout, RefreshCw, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  publishedAt?: string;
  releaseUrl?: string;
  error?: string;
}

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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const { toast } = useToast();
  
  const { data: updateInfo, refetch: refetchUpdateInfo } = useQuery<UpdateInfo>({
    queryKey: ["/api/system/check-update"],
    enabled: false, // Only fetch on demand
  });

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
      return await apiRequest("POST", "/api/system/start-update");
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">System-Update</CardTitle>
                  {updateInfo?.currentVersion && (
                    <Badge variant="outline" className="text-xs">
                      v{updateInfo.currentVersion}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Laden Sie die neueste Version der Anwendung herunter und installieren Sie sie
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {updateInfo?.updateAvailable && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                <AlertCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600">
                    Neue Version verfügbar: v{updateInfo.latestVersion}
                  </p>
                  {updateInfo.releaseUrl && (
                    <a 
                      href={updateInfo.releaseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Release-Notes anzeigen
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {updateInfo && !updateInfo.updateAvailable && !updateInfo.error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Sie verwenden die neueste Version (v{updateInfo.currentVersion})
                </p>
              </div>
            )}
            
            {updateInfo?.error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-600">{updateInfo.error}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Während des Updates wird eine Wartungsseite angezeigt. Das System startet automatisch neu.
            </p>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline"
                onClick={async () => {
                  setIsCheckingUpdate(true);
                  await refetchUpdateInfo();
                  setIsCheckingUpdate(false);
                }}
                disabled={isCheckingUpdate}
                data-testid="button-check-update"
              >
                {isCheckingUpdate ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Prüfe...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Auf Updates prüfen
                  </>
                )}
              </Button>
              
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
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
