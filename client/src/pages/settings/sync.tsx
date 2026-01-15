import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface SyncConfig {
  intervalMinutes: number;
  enabled: boolean;
}

interface SyncLog {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: string;
  mode: string;
  entityType: string;
  direction: string;
  pulledCount?: number;
  createdCount?: number;
  updatedCount?: number;
  unchangedCount?: number;
  errorCount?: number;
  triggeredBy?: string;
  errors?: unknown;
  details?: unknown;
}

export default function SyncSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedInterval, setSelectedInterval] = useState<string>("0");

  const { data: syncConfig, isLoading: configLoading } = useQuery<SyncConfig>({
    queryKey: ["/api/config/sync"],
  });

  const { data: syncLogs, isLoading: logsLoading } = useQuery<SyncLog[]>({
    queryKey: ["/api/sync-logs"],
  });

  const saveMutation = useMutation({
    mutationFn: async (intervalMinutes: number) => {
      return apiRequest("POST", "/api/config/sync", { intervalMinutes });
    },
    onSuccess: (data: any) => {
      toast({ title: "Gespeichert", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/config/sync"] });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: async (type: "invoices" | "debtors") => {
      const endpoint = type === "invoices" ? "/api/sync/invoices-v2" : "/api/sync/customers-v2";
      return apiRequest("POST", endpoint);
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Synchronisation abgeschlossen", 
        description: `${data.created} erstellt, ${data.updated} aktualisiert, ${data.unchanged} unverändert` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync-Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(parseInt(selectedInterval, 10));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      error: "destructive",
      running: "secondary",
    };
    const labels: Record<string, string> = {
      success: "Erfolgreich",
      error: "Fehler",
      running: "Läuft",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  if (configLoading) {
    return (
      <div className="flex-1 overflow-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/settings")}
          data-testid="button-back-settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Automatische Synchronisation</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie die automatische Synchronisation mit BHB
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync-Intervall
          </CardTitle>
          <CardDescription>
            Legen Sie fest, wie oft Rechnungen und Debitoren automatisch synchronisiert werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={selectedInterval || String(syncConfig?.intervalMinutes || 0)}
              onValueChange={setSelectedInterval}
            >
              <SelectTrigger className="w-48" data-testid="select-sync-interval">
                <SelectValue placeholder="Intervall wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Deaktiviert</SelectItem>
                <SelectItem value="15">Alle 15 Minuten</SelectItem>
                <SelectItem value="30">Alle 30 Minuten</SelectItem>
                <SelectItem value="60">Stündlich</SelectItem>
                <SelectItem value="120">Alle 2 Stunden</SelectItem>
                <SelectItem value="360">Alle 6 Stunden</SelectItem>
                <SelectItem value="720">Alle 12 Stunden</SelectItem>
                <SelectItem value="1440">Täglich</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-sync-config"
            >
              {saveMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${syncConfig?.enabled ? "bg-green-500" : "bg-muted"}`} />
            {syncConfig?.enabled 
              ? `Automatischer Sync aktiv (alle ${syncConfig.intervalMinutes} Min.)`
              : "Automatischer Sync deaktiviert"
            }
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manueller Sync
          </CardTitle>
          <CardDescription>
            Starten Sie eine sofortige Synchronisation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => syncNowMutation.mutate("invoices")}
            disabled={syncNowMutation.isPending}
            variant="outline"
            data-testid="button-sync-invoices"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncNowMutation.isPending ? "animate-spin" : ""}`} />
            Rechnungen synchronisieren
          </Button>
          <Button
            onClick={() => syncNowMutation.mutate("debtors")}
            disabled={syncNowMutation.isPending}
            variant="outline"
            data-testid="button-sync-debtors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncNowMutation.isPending ? "animate-spin" : ""}`} />
            Debitoren synchronisieren
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync-Protokoll</CardTitle>
          <CardDescription>
            Die letzten Synchronisierungen mit dem BHB-System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !syncLogs?.length ? (
            <p className="text-muted-foreground text-sm">Noch keine Synchronisierungen durchgeführt.</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`sync-log-${log.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {log.entityType === "invoices" ? "Rechnungen" : 
                           log.entityType === "debtors" ? "Debitoren" : 
                           log.entityType === "both" ? "Rechnungen & Debitoren" : log.entityType}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.mode === "auto" ? "Automatisch" : "Manuell"}
                        </Badge>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.startedAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {log.status === "success" && (
                      <div className="text-muted-foreground">
                        <span className="text-green-600">{log.createdCount || 0} neu</span>
                        {" / "}
                        <span className="text-blue-600">{log.updatedCount || 0} aktualisiert</span>
                        {" / "}
                        <span>{log.unchangedCount || 0} unverändert</span>
                      </div>
                    )}
                    {log.status === "error" && (
                      <span className="text-red-500">Fehler aufgetreten</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
