import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TestTube, Server, Mail, Save, Check, X, Eye, EyeOff, Key, Percent } from "lucide-react";
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

interface BhbConfig {
  baseUrl: string;
  isConfigured: boolean;
  lastSync?: string;
  hasApiKey?: boolean;
  hasApiClient?: boolean;
  hasApiSecret?: boolean;
}

interface SmtpTestResult {
  success: boolean;
  message: string;
}

interface SmtpConfig {
  isConfigured: boolean;
  hasHost?: boolean;
  hasPort?: boolean;
  hasUser?: boolean;
  hasPassword?: boolean;
  hasFrom?: boolean;
  port?: string;
  from?: string;
}

interface InterestConfig {
  ezbBaseRate: number;
  lastUpdated?: string;
}

export default function SettingsPage() {
  const [testResult, setTestResult] = useState<BhbTestResult | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<SmtpTestResult | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    apiKey: false,
    apiClient: false,
    apiSecret: false,
    smtpPassword: false,
  });
  const [credentials, setCredentials] = useState({
    apiKey: "",
    apiClient: "",
    apiSecret: "",
    baseUrl: "",
  });
  const [smtpCredentials, setSmtpCredentials] = useState({
    host: "",
    port: "",
    user: "",
    password: "",
    from: "",
  });
  const [ezbBaseRate, setEzbBaseRate] = useState<string>("");
  const { toast } = useToast();

  const { data: bhbConfig } = useQuery<BhbConfig>({
    queryKey: ["/api/settings/bhb"],
  });

  const { data: smtpConfig } = useQuery<SmtpConfig>({
    queryKey: ["/api/settings/smtp"],
  });

  const { data: interestConfig } = useQuery<InterestConfig>({
    queryKey: ["/api/settings/interest"],
  });

  useEffect(() => {
    if (interestConfig?.ezbBaseRate && !ezbBaseRate) {
      setEzbBaseRate(interestConfig.ezbBaseRate.toString());
    }
  }, [interestConfig, ezbBaseRate]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/settings/bhb"] });
      toast({
        title: "Synchronisation abgeschlossen",
        description: "Die Rechnungen wurden erfolgreich synchronisiert.",
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

  const saveSmtpMutation = useMutation({
    mutationFn: (data: typeof smtpCredentials) => apiRequest("POST", "/api/settings/smtp", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/smtp"] });
      setSmtpCredentials({ host: "", port: "", user: "", password: "", from: "" });
      toast({
        title: "SMTP-Einstellungen gespeichert",
        description: "Die E-Mail-Konfiguration wurde sicher gespeichert.",
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

  const testSmtpMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/smtp/test"),
    onSuccess: (data: SmtpTestResult) => {
      setSmtpTestResult(data);
      if (data.success) {
        toast({
          title: "Konfiguration gültig",
          description: data.message,
        });
      } else {
        toast({
          title: "Konfiguration ungültig",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setSmtpTestResult({
        success: false,
        message: error.message || "Test fehlgeschlagen",
      });
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveInterestMutation = useMutation({
    mutationFn: (data: { ezbBaseRate: number }) => apiRequest("POST", "/api/settings/interest", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/interest"] });
      toast({
        title: "Basiszinssatz gespeichert",
        description: "Der EZB-Basiszinssatz wurde aktualisiert.",
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

  const handleSaveInterest = () => {
    const rate = parseFloat(ezbBaseRate.replace(",", "."));
    if (isNaN(rate)) {
      toast({
        title: "Ungültiger Wert",
        description: "Bitte geben Sie eine gültige Zahl ein.",
        variant: "destructive",
      });
      return;
    }
    saveInterestMutation.mutate({ ezbBaseRate: rate });
  };

  const handleSaveCredentials = () => {
    if (!credentials.apiKey && !credentials.apiClient && !credentials.apiSecret && !credentials.baseUrl) {
      toast({
        title: "Keine Änderungen",
        description: "Bitte geben Sie mindestens ein Feld ein.",
        variant: "destructive",
      });
      return;
    }
    saveCredentialsMutation.mutate(credentials);
  };

  const handleSaveSmtp = () => {
    if (!smtpCredentials.host && !smtpCredentials.port && !smtpCredentials.user && !smtpCredentials.password && !smtpCredentials.from) {
      toast({
        title: "Keine Änderungen",
        description: "Bitte geben Sie mindestens ein Feld ein.",
        variant: "destructive",
      });
      return;
    }
    saveSmtpMutation.mutate(smtpCredentials);
  };

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
            <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                API-Zugangsdaten
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">API Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder={bhbConfig?.baseUrl || "https://webapp.buchhaltungsbutler.de/api/v1"}
                    value={credentials.baseUrl}
                    onChange={(e) => setCredentials({ ...credentials, baseUrl: e.target.value })}
                    className="font-mono text-sm"
                    data-testid="input-bhb-baseurl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leer lassen für Standard-URL
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
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
                    {bhbConfig?.hasApiKey && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiClient">API Client</Label>
                    <div className="relative">
                      <Input
                        id="apiClient"
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
                    {bhbConfig?.hasApiClient && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <div className="relative">
                      <Input
                        id="apiSecret"
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
                    {bhbConfig?.hasApiSecret && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveCredentials}
                  disabled={saveCredentialsMutation.isPending}
                  data-testid="button-save-credentials"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveCredentialsMutation.isPending ? "Speichern..." : "Zugangsdaten speichern"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Letzte Synchronisation</Label>
                  <Input
                    value={bhbConfig?.lastSync ? new Date(bhbConfig.lastSync).toLocaleString("de-DE") : "Noch nie"}
                    disabled
                  />
                </div>
              </div>

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
                  <strong>Sicherheitshinweis:</strong> Die API-Zugangsdaten werden verschlüsselt in der Datenbank 
                  gespeichert. Stellen Sie sicher, dass die Umgebungsvariable <code className="text-xs bg-muted px-1 py-0.5 rounded">ENCRYPTION_KEY</code> in der 
                  Produktionsumgebung sicher konfiguriert ist.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
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
              <Badge variant={smtpConfig?.isConfigured ? "default" : "secondary"}>
                {smtpConfig?.isConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                SMTP-Zugangsdaten
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      placeholder={smtpConfig?.hasHost ? "Gespeichert" : "smtp.beispiel.de"}
                      value={smtpCredentials.host}
                      onChange={(e) => setSmtpCredentials({ ...smtpCredentials, host: e.target.value })}
                      data-testid="input-smtp-host"
                    />
                    {smtpConfig?.hasHost && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      placeholder={smtpConfig?.port || "587"}
                      value={smtpCredentials.port}
                      onChange={(e) => setSmtpCredentials({ ...smtpCredentials, port: e.target.value })}
                      data-testid="input-smtp-port"
                    />
                    {smtpConfig?.hasPort && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Benutzername</Label>
                    <Input
                      id="smtpUser"
                      placeholder={smtpConfig?.hasUser ? "Gespeichert" : "user@beispiel.de"}
                      value={smtpCredentials.user}
                      onChange={(e) => setSmtpCredentials({ ...smtpCredentials, user: e.target.value })}
                      data-testid="input-smtp-user"
                    />
                    {smtpConfig?.hasUser && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Passwort</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showPasswords.smtpPassword ? "text" : "password"}
                        placeholder={smtpConfig?.hasPassword ? "••••••••" : "Passwort eingeben"}
                        value={smtpCredentials.password}
                        onChange={(e) => setSmtpCredentials({ ...smtpCredentials, password: e.target.value })}
                        className="pr-10"
                        data-testid="input-smtp-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords({ ...showPasswords, smtpPassword: !showPasswords.smtpPassword })}
                      >
                        {showPasswords.smtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {smtpConfig?.hasPassword && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpFrom">Absenderadresse</Label>
                  <Input
                    id="smtpFrom"
                    type="email"
                    placeholder={smtpConfig?.from || "mahnung@beispiel.de"}
                    value={smtpCredentials.from}
                    onChange={(e) => setSmtpCredentials({ ...smtpCredentials, from: e.target.value })}
                    data-testid="input-smtp-from"
                  />
                  {smtpConfig?.hasFrom && (
                    <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                  )}
                </div>

                <Button
                  onClick={handleSaveSmtp}
                  disabled={saveSmtpMutation.isPending}
                  data-testid="button-save-smtp"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveSmtpMutation.isPending ? "Speichern..." : "SMTP-Einstellungen speichern"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => testSmtpMutation.mutate()}
                disabled={testSmtpMutation.isPending}
                data-testid="button-test-smtp"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testSmtpMutation.isPending ? "Teste..." : "Konfiguration testen"}
              </Button>

              {smtpTestResult && (
                <div
                  className={`p-4 rounded-md ${
                    smtpTestResult.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {smtpTestResult.success ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${smtpTestResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                        {smtpTestResult.success ? "Konfiguration gültig" : "Konfiguration ungültig"}
                      </p>
                      <p className={`text-sm mt-1 ${smtpTestResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                        {smtpTestResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Hinweis:</strong> Die SMTP-Zugangsdaten werden verschlüsselt in der Datenbank 
                  gespeichert und für den automatischen Mahnungsversand verwendet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gesetzliche Verzugszinsen</CardTitle>
                  <CardDescription>
                    EZB-Basiszinssatz für BGB-konforme Zinsberechnung
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ezbBaseRate">EZB-Basiszinssatz (%)</Label>
                <Input
                  id="ezbBaseRate"
                  type="text"
                  placeholder="z.B. 3.62"
                  value={ezbBaseRate}
                  onChange={(e) => setEzbBaseRate(e.target.value)}
                  className="max-w-48"
                  data-testid="input-ezb-base-rate"
                />
                <p className="text-xs text-muted-foreground">
                  Aktueller Basiszinssatz der Deutschen Bundesbank (wird halbjährlich aktualisiert)
                </p>
                {interestConfig?.lastUpdated && (
                  <Badge variant="outline" className="text-xs">
                    Zuletzt aktualisiert: {new Date(interestConfig.lastUpdated).toLocaleDateString("de-DE")}
                  </Badge>
                )}
              </div>

              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Gesetzliche Zinssätze nach BGB:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    <strong>Privatkunden (§ 288 Abs. 1 BGB):</strong>{" "}
                    {(parseFloat(ezbBaseRate.replace(",", ".") || interestConfig?.ezbBaseRate?.toString() || "0") + 5).toFixed(2)}% p.a.
                    (Basiszins + 5 Prozentpunkte)
                  </li>
                  <li>
                    <strong>Geschäftskunden (§ 288 Abs. 2 BGB):</strong>{" "}
                    {(parseFloat(ezbBaseRate.replace(",", ".") || interestConfig?.ezbBaseRate?.toString() || "0") + 9).toFixed(2)}% p.a.
                    (Basiszins + 9 Prozentpunkte)
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleSaveInterest}
                disabled={saveInterestMutation.isPending}
                data-testid="button-save-interest"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveInterestMutation.isPending ? "Speichern..." : "Basiszinssatz speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
