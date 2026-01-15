import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, TestTube, Mail, Save, Check, X, Eye, EyeOff, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

interface GraphConfig {
  isConfigured: boolean;
  tenantId: string;
  clientId: string;
  hasClientSecret: boolean;
  fromAddress: string;
}

export default function EmailSettingsPage() {
  const [smtpTestResult, setSmtpTestResult] = useState<SmtpTestResult | null>(null);
  const [graphTestResult, setGraphTestResult] = useState<SmtpTestResult | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    smtpPassword: false,
    graphClientSecret: false,
  });
  const [smtpCredentials, setSmtpCredentials] = useState({
    host: "",
    port: "",
    user: "",
    password: "",
    from: "",
  });
  const [graphCredentials, setGraphCredentials] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    fromAddress: "",
  });
  const { toast } = useToast();

  const { data: smtpConfig } = useQuery<SmtpConfig>({
    queryKey: ["/api/settings/smtp"],
  });

  const { data: graphConfig } = useQuery<GraphConfig>({
    queryKey: ["/api/settings/msgraph"],
  });

  const saveSmtpMutation = useMutation({
    mutationFn: (data: typeof smtpCredentials) => apiRequest("POST", "/api/settings/smtp", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/smtp"] });
      setSmtpCredentials({ host: "", port: "", user: "", password: "", from: "" });
      toast({ title: "SMTP-Einstellungen gespeichert", description: "Die E-Mail-Konfiguration wurde sicher gespeichert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/smtp/test") as Promise<SmtpTestResult>,
    onSuccess: (data: SmtpTestResult) => {
      setSmtpTestResult(data);
      toast({
        title: data.success ? "Konfiguration gültig" : "Konfiguration ungültig",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      setSmtpTestResult({ success: false, message: error.message || "Test fehlgeschlagen" });
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const saveGraphMutation = useMutation({
    mutationFn: (data: typeof graphCredentials) => apiRequest("POST", "/api/settings/msgraph", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/msgraph"] });
      setGraphCredentials({ tenantId: "", clientId: "", clientSecret: "", fromAddress: "" });
      toast({ title: "Microsoft Graph gespeichert", description: "Die Graph-Konfiguration wurde sicher gespeichert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const testGraphMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/msgraph/test") as Promise<SmtpTestResult>,
    onSuccess: (data: SmtpTestResult) => {
      setGraphTestResult(data);
      toast({
        title: data.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      setGraphTestResult({ success: false, message: error.message || "Test fehlgeschlagen" });
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveSmtp = () => {
    const dataToSave = {
      host: smtpCredentials.host || undefined,
      port: smtpCredentials.port || undefined,
      user: smtpCredentials.user || undefined,
      password: smtpCredentials.password || undefined,
      from: smtpCredentials.from || undefined,
    };
    saveSmtpMutation.mutate(dataToSave as typeof smtpCredentials);
  };

  const handleSaveGraph = () => {
    const dataToSave = {
      tenantId: graphCredentials.tenantId || undefined,
      clientId: graphCredentials.clientId || undefined,
      clientSecret: graphCredentials.clientSecret || undefined,
      fromAddress: graphCredentials.fromAddress || undefined,
    };
    saveGraphMutation.mutate(dataToSave as typeof graphCredentials);
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
          <h1 className="text-2xl font-bold">E-Mail-Versand</h1>
          <p className="text-muted-foreground">
            SMTP oder Microsoft Graph für den Mahnungsversand konfigurieren
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">SMTP-Server</CardTitle>
                <CardDescription>Klassischer E-Mail-Versand über SMTP</CardDescription>
              </div>
            </div>
            <Badge variant={smtpConfig?.isConfigured ? "default" : "secondary"}>
              {smtpConfig?.isConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Für Office 365: Host = smtp.office365.com, Port = 587. Benutzername = Admin-Konto, 
              Absenderadresse = Sammelpostfach (benötigt "Senden als"-Berechtigung).
            </p>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder={smtpConfig?.hasHost ? "Gespeichert" : "smtp.office365.com"}
                    value={smtpCredentials.host}
                    onChange={(e) => setSmtpCredentials({ ...smtpCredentials, host: e.target.value })}
                    data-testid="input-smtp-host"
                  />
                  {smtpConfig?.hasHost && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
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
                  {smtpConfig?.hasPort && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Benutzername</Label>
                  <Input
                    id="smtpUser"
                    placeholder={smtpConfig?.hasUser ? "Gespeichert" : "admin@firma.onmicrosoft.com"}
                    value={smtpCredentials.user}
                    onChange={(e) => setSmtpCredentials({ ...smtpCredentials, user: e.target.value })}
                    data-testid="input-smtp-user"
                  />
                  {smtpConfig?.hasUser && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Passwort</Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showPasswords.smtpPassword ? "text" : "password"}
                      placeholder={smtpConfig?.hasPassword ? "••••••••" : "Passwort"}
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
                  {smtpConfig?.hasPassword && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpFrom">Absenderadresse</Label>
                <Input
                  id="smtpFrom"
                  type="email"
                  placeholder={smtpConfig?.from || "mahnung@firma.de"}
                  value={smtpCredentials.from}
                  onChange={(e) => setSmtpCredentials({ ...smtpCredentials, from: e.target.value })}
                  data-testid="input-smtp-from"
                />
                {smtpConfig?.hasFrom && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveSmtp} disabled={saveSmtpMutation.isPending} data-testid="button-save-smtp">
                  <Save className="h-4 w-4 mr-2" />
                  {saveSmtpMutation.isPending ? "Speichern..." : "SMTP speichern"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testSmtpMutation.mutate()}
                  disabled={testSmtpMutation.isPending}
                  data-testid="button-test-smtp"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testSmtpMutation.isPending ? "Teste..." : "Testen"}
                </Button>
              </div>
            </div>

            {smtpTestResult && (
              <div className={`p-4 rounded-md ${smtpTestResult.success ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
                <div className="flex items-start gap-3">
                  {smtpTestResult.success ? <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" /> : <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />}
                  <div>
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
                <CardTitle className="text-lg">Microsoft Graph (OAuth 2.0)</CardTitle>
                <CardDescription>Empfohlen für Office 365 - zukunftssicher</CardDescription>
              </div>
            </div>
            <Badge variant={graphConfig?.isConfigured ? "default" : "secondary"}>
              {graphConfig?.isConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Microsoft Graph ist die empfohlene Methode für Office 365, da SMTP Basic Auth ab September 2025 abgeschaltet wird.
              Erfordert eine Azure AD App-Registrierung mit Mail.Send-Berechtigung.
            </p>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="graphTenantId">Tenant ID</Label>
                  <Input
                    id="graphTenantId"
                    placeholder={graphConfig?.tenantId || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                    value={graphCredentials.tenantId}
                    onChange={(e) => setGraphCredentials({ ...graphCredentials, tenantId: e.target.value })}
                    data-testid="input-graph-tenant"
                  />
                  {graphConfig?.tenantId && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graphClientId">Client ID</Label>
                  <Input
                    id="graphClientId"
                    placeholder={graphConfig?.clientId || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                    value={graphCredentials.clientId}
                    onChange={(e) => setGraphCredentials({ ...graphCredentials, clientId: e.target.value })}
                    data-testid="input-graph-clientid"
                  />
                  {graphConfig?.clientId && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="graphClientSecret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="graphClientSecret"
                      type={showPasswords.graphClientSecret ? "text" : "password"}
                      placeholder={graphConfig?.hasClientSecret ? "••••••••" : "Client Secret"}
                      value={graphCredentials.clientSecret}
                      onChange={(e) => setGraphCredentials({ ...graphCredentials, clientSecret: e.target.value })}
                      className="pr-10"
                      data-testid="input-graph-secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({ ...showPasswords, graphClientSecret: !showPasswords.graphClientSecret })}
                    >
                      {showPasswords.graphClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {graphConfig?.hasClientSecret && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graphFromAddress">Absender E-Mail</Label>
                  <Input
                    id="graphFromAddress"
                    type="email"
                    placeholder={graphConfig?.fromAddress || "mahnung@firma.de"}
                    value={graphCredentials.fromAddress}
                    onChange={(e) => setGraphCredentials({ ...graphCredentials, fromAddress: e.target.value })}
                    data-testid="input-graph-from"
                  />
                  {graphConfig?.fromAddress && <Badge variant="outline" className="text-xs">Gespeichert</Badge>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveGraph} disabled={saveGraphMutation.isPending} data-testid="button-save-graph">
                  <Save className="h-4 w-4 mr-2" />
                  {saveGraphMutation.isPending ? "Speichern..." : "Graph speichern"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testGraphMutation.mutate()}
                  disabled={testGraphMutation.isPending}
                  data-testid="button-test-graph"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testGraphMutation.isPending ? "Teste..." : "Testen"}
                </Button>
              </div>
            </div>

            {graphTestResult && (
              <div className={`p-4 rounded-md ${graphTestResult.success ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
                <div className="flex items-start gap-3">
                  {graphTestResult.success ? <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" /> : <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />}
                  <div>
                    <p className={`font-medium ${graphTestResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                      {graphTestResult.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}
                    </p>
                    <p className={`text-sm mt-1 ${graphTestResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {graphTestResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
