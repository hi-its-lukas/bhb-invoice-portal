import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, TestTube, Server, Save, Check, X, Eye, EyeOff, Key, RefreshCw } from "lucide-react";
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
}

interface BhbConfig {
  baseUrl: string;
  isConfigured: boolean;
  lastSync?: string;
  hasApiKey?: boolean;
  hasApiClient?: boolean;
  hasApiSecret?: boolean;
}

export default function BhbSettingsPage() {
  const [testResult, setTestResult] = useState<BhbTestResult | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    apiKey: false,
    apiClient: false,
    apiSecret: false,
  });
  const [credentials, setCredentials] = useState({
    apiKey: "",
    apiClient: "",
    apiSecret: "",
    baseUrl: "",
  });
  const { toast } = useToast();

  const { data: bhbConfig } = useQuery<BhbConfig>({
    queryKey: ["/api/settings/bhb"],
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: (data: typeof credentials) => apiRequest("POST", "/api/settings/bhb", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/bhb"] });
      setCredentials({ apiKey: "", apiClient: "", apiSecret: "", baseUrl: "" });
      toast({
        title: "Zugangsdaten gespeichert",
        description: "Die BHB-API-Zugangsdaten wurden sicher gespeichert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/bhb/test") as Promise<BhbTestResult>,
    onSuccess: (data: BhbTestResult) => {
      setTestResult(data);
      if (data.success) {
        toast({ title: "Verbindung erfolgreich", description: data.message });
      } else {
        toast({ title: "Verbindung fehlgeschlagen", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message || "Verbindungstest fehlgeschlagen" });
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sync/receipts"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/bhb"] });
      toast({ title: "Synchronisation abgeschlossen", description: "Die Rechnungen wurden erfolgreich synchronisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Synchronisation fehlgeschlagen", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const dataToSave = {
      apiKey: credentials.apiKey || undefined,
      apiClient: credentials.apiClient || undefined,
      apiSecret: credentials.apiSecret || undefined,
      baseUrl: credentials.baseUrl || undefined,
    };
    saveCredentialsMutation.mutate(dataToSave as typeof credentials);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">BuchhaltungsButler API</h1>
          <p className="text-muted-foreground">
            Verbindung zur BHB-Buchhaltungssoftware konfigurieren
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">API-Zugangsdaten</CardTitle>
                <CardDescription>
                  Zugangsdaten aus Ihrem BHB-Konto eingeben
                </CardDescription>
              </div>
            </div>
            <Badge variant={bhbConfig?.isConfigured ? "default" : "secondary"}>
              {bhbConfig?.isConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4" />
              BHB API-Zugangsdaten
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="bhbBaseUrl">API Base URL</Label>
                <Input
                  id="bhbBaseUrl"
                  placeholder={bhbConfig?.baseUrl || "https://webapp.buchhaltungsbutler.de/api/v1"}
                  value={credentials.baseUrl}
                  onChange={(e) => setCredentials({ ...credentials, baseUrl: e.target.value })}
                  data-testid="input-bhb-baseurl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bhbApiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="bhbApiKey"
                    type={showPasswords.apiKey ? "text" : "password"}
                    placeholder={bhbConfig?.hasApiKey ? "••••••••" : "API Key eingeben"}
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                    className="pr-10"
                    data-testid="input-bhb-apikey"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, apiKey: !showPasswords.apiKey })}
                  >
                    {showPasswords.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {bhbConfig?.hasApiKey && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bhbApiClient">API Client</Label>
                  <div className="relative">
                    <Input
                      id="bhbApiClient"
                      type={showPasswords.apiClient ? "text" : "password"}
                      placeholder={bhbConfig?.hasApiClient ? "••••••••" : "API Client eingeben"}
                      value={credentials.apiClient}
                      onChange={(e) => setCredentials({ ...credentials, apiClient: e.target.value })}
                      className="pr-10"
                      data-testid="input-bhb-apiclient"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, apiClient: !showPasswords.apiClient })}
                    >
                      {showPasswords.apiClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {bhbConfig?.hasApiClient && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bhbApiSecret">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="bhbApiSecret"
                      type={showPasswords.apiSecret ? "text" : "password"}
                      placeholder={bhbConfig?.hasApiSecret ? "••••••••" : "API Secret eingeben"}
                      value={credentials.apiSecret}
                      onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                      className="pr-10"
                      data-testid="input-bhb-apisecret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, apiSecret: !showPasswords.apiSecret })}
                    >
                      {showPasswords.apiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {bhbConfig?.hasApiSecret && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saveCredentialsMutation.isPending} data-testid="button-save-bhb">
                <Save className="h-4 w-4 mr-2" />
                {saveCredentialsMutation.isPending ? "Speichern..." : "Zugangsdaten speichern"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-bhb"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testConnectionMutation.isPending ? "Teste..." : "Verbindung testen"}
              </Button>

              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !bhbConfig?.isConfigured}
                data-testid="button-sync-bhb"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Synchronisiere..." : "Rechnungen synchronisieren"}
              </Button>
            </div>

            {bhbConfig?.lastSync && (
              <p className="text-sm text-muted-foreground">
                Letzte Synchronisation: {new Date(bhbConfig.lastSync).toLocaleString("de-DE")}
              </p>
            )}

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
                <strong>Sicherheitshinweis:</strong> Die API-Zugangsdaten werden verschlüsselt in der Datenbank 
                gespeichert. Stellen Sie sicher, dass die Umgebungsvariable <code className="text-xs bg-muted px-1 py-0.5 rounded">ENCRYPTION_KEY</code> in der 
                Produktionsumgebung sicher konfiguriert ist.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
