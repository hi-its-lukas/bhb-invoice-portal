import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, TestTube, Server, Mail, Save, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BhbTestResult {
  success: boolean;
  message: string;
  receiptCount?: number;
  sampleReceipt?: Record<string, unknown>;
}

export default function SettingsPage() {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<BhbTestResult | null>(null);
  const { toast } = useToast();

  const { data: bhbConfig } = useQuery<{
    baseUrl: string;
    isConfigured: boolean;
    lastSync?: string;
  }>({
    queryKey: ["/api/settings/bhb"],
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/bhb/test"),
    onSuccess: (data: BhbTestResult) => {
      setTestResult(data);
      if (data.success) {
        toast({
          title: "Verbindung erfolgreich",
          description: data.message,
        });
      } else {
        toast({
          title: "Verbindung fehlgeschlagen",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        message: error.message || "Verbindungstest fehlgeschlagen",
      });
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sync/receipts"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Synchronisation gestartet",
        description: "Die Rechnungen werden im Hintergrund synchronisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Synchronisation fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">
          Konfigurieren Sie die Verbindung zu BuchhaltungsButler und SMTP
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">BuchhaltungsButler API</CardTitle>
                  <CardDescription>
                    Verbindung zur BHB-API für Rechnungssynchronisation
                  </CardDescription>
                </div>
              </div>
              <Badge variant={bhbConfig?.isConfigured ? "default" : "secondary"}>
                {bhbConfig?.isConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  value={bhbConfig?.baseUrl || "https://webapp.buchhaltungsbutler.de/api/v1"}
                  disabled
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Letzte Synchronisation</Label>
                <Input
                  value={bhbConfig?.lastSync ? new Date(bhbConfig.lastSync).toLocaleString("de-DE") : "Noch nie"}
                  disabled
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-connection"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testConnectionMutation.isPending ? "Teste..." : "Verbindung testen"}
              </Button>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !bhbConfig?.isConfigured}
                data-testid="button-sync-now"
              >
                {syncMutation.isPending ? "Synchronisiert..." : "Jetzt synchronisieren"}
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-md ${
                  testResult.success
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${testResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                      {testResult.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}
                    </p>
                    <p className={`text-sm mt-1 ${testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {testResult.message}
                    </p>
                    {testResult.receiptCount !== undefined && (
                      <p className="text-sm mt-1 text-green-700 dark:text-green-300">
                        {testResult.receiptCount} offene Rechnungen gefunden
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>Hinweis:</strong> Die API-Zugangsdaten (BHB_API_KEY, BHB_API_CLIENT, BHB_API_SECRET) 
                müssen als Umgebungsvariablen in den Secrets konfiguriert werden.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">E-Mail-Versand (SMTP)</CardTitle>
                <CardDescription>
                  Konfiguration für den automatischen Mahnungsversand
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>Konfiguration:</strong> SMTP-Einstellungen werden über Umgebungsvariablen 
                (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) konfiguriert.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
