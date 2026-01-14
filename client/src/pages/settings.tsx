import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TestTube, Server, Mail, Save, Check, X, Eye, EyeOff, Key, Percent, Building2, Paintbrush } from "lucide-react";
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

interface GraphConfig {
  isConfigured: boolean;
  tenantId: string;
  clientId: string;
  hasClientSecret: boolean;
  fromAddress: string;
}

interface GraphTestResult {
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

interface CompanyConfig {
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  iban: string;
  bic: string;
}

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

export default function SettingsPage() {
  const [testResult, setTestResult] = useState<BhbTestResult | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<SmtpTestResult | null>(null);
  const [graphTestResult, setGraphTestResult] = useState<GraphTestResult | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    apiKey: false,
    apiClient: false,
    apiSecret: false,
    smtpPassword: false,
    graphClientSecret: false,
  });
  const [graphCredentials, setGraphCredentials] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    fromAddress: "",
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
  const [companyData, setCompanyData] = useState<CompanyConfig>({
    name: "",
    street: "",
    zip: "",
    city: "",
    phone: "",
    email: "",
    iban: "",
    bic: "",
  });
  const [brandingData, setBrandingData] = useState<BrandingConfig>({
    companyName: "",
    companyTagline: "",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#16a34a",
    primaryForeground: "#ffffff",
    accentColor: "#f0fdf4",
    sidebarColor: "#f8fafc",
    supportEmail: null,
    supportPhone: null,
    footerText: null,
    customCss: null,
  });
  const { toast } = useToast();

  const { data: bhbConfig } = useQuery<BhbConfig>({
    queryKey: ["/api/settings/bhb"],
  });

  const { data: smtpConfig } = useQuery<SmtpConfig>({
    queryKey: ["/api/settings/smtp"],
  });

  const { data: graphConfig } = useQuery<GraphConfig>({
    queryKey: ["/api/settings/msgraph"],
  });

  const { data: interestConfig } = useQuery<InterestConfig>({
    queryKey: ["/api/settings/interest"],
  });

  const { data: companyConfig } = useQuery<CompanyConfig>({
    queryKey: ["/api/settings/company"],
  });

  const { data: brandingConfig } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
  });

  useEffect(() => {
    if (interestConfig?.ezbBaseRate && !ezbBaseRate) {
      setEzbBaseRate(interestConfig.ezbBaseRate.toString());
    }
  }, [interestConfig, ezbBaseRate]);

  useEffect(() => {
    if (companyConfig && !companyData.name && !companyData.iban) {
      setCompanyData(companyConfig);
    }
  }, [companyConfig, companyData.name, companyData.iban]);

  useEffect(() => {
    if (brandingConfig && !brandingData.companyName) {
      setBrandingData(brandingConfig);
    }
  }, [brandingConfig, brandingData.companyName]);

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

  const saveCompanyMutation = useMutation({
    mutationFn: (data: CompanyConfig) => apiRequest("POST", "/api/settings/company", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      toast({
        title: "Unternehmensdaten gespeichert",
        description: "Die Unternehmensdaten wurden aktualisiert.",
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

  const saveBrandingMutation = useMutation({
    mutationFn: (data: Partial<BrandingConfig>) => apiRequest("POST", "/api/config/branding", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/branding"] });
      toast({
        title: "Branding gespeichert",
        description: "Die Branding-Einstellungen wurden aktualisiert.",
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

  const saveGraphMutation = useMutation({
    mutationFn: (data: typeof graphCredentials) => apiRequest("POST", "/api/settings/msgraph", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/msgraph"] });
      setGraphCredentials({ tenantId: "", clientId: "", clientSecret: "", fromAddress: "" });
      setGraphTestResult(null);
      toast({
        title: "Microsoft Graph Einstellungen gespeichert",
        description: "Die OAuth-Konfiguration wurde sicher gespeichert.",
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

  const testGraphMutation = useMutation({
    mutationFn: () => apiRequest<GraphTestResult>("POST", "/api/settings/msgraph/test", {}),
    onSuccess: (data) => {
      setGraphTestResult(data);
    },
    onError: (error: Error) => {
      setGraphTestResult({ success: false, message: error.message });
    },
  });

  const handleSaveGraph = () => {
    if (!graphCredentials.tenantId && !graphCredentials.clientId && !graphCredentials.clientSecret && !graphCredentials.fromAddress) {
      toast({
        title: "Keine Änderungen",
        description: "Bitte geben Sie mindestens ein Feld ein.",
        variant: "destructive",
      });
      return;
    }
    saveGraphMutation.mutate(graphCredentials);
  };

  const handleSaveCompany = () => {
    saveCompanyMutation.mutate(companyData);
  };

  const handleSaveBranding = () => {
    saveBrandingMutation.mutate(brandingData);
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
                    <Label htmlFor="smtpUser">Benutzername (Login-Konto)</Label>
                    <Input
                      id="smtpUser"
                      placeholder={smtpConfig?.hasUser ? "Gespeichert" : "admin@firma.onmicrosoft.com"}
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
                        placeholder={smtpConfig?.hasPassword ? "••••••••" : "Passwort oder App-Passwort"}
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
                  <Label htmlFor="smtpFrom">Absenderadresse (Sammelpostfach)</Label>
                  <Input
                    id="smtpFrom"
                    type="email"
                    placeholder={smtpConfig?.from || "mahnung@firma.de"}
                    value={smtpCredentials.from}
                    onChange={(e) => setSmtpCredentials({ ...smtpCredentials, from: e.target.value })}
                    data-testid="input-smtp-from"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bei Office 365: Das Sammelpostfach muss dem Login-Konto "Senden als"-Berechtigung erteilen.
                  </p>
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
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Microsoft Graph (OAuth 2.0)</CardTitle>
                  <CardDescription>
                    Empfohlen für Office 365 - zukunftssichere E-Mail-Integration
                  </CardDescription>
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
                    {graphConfig?.tenantId && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graphClientId">Client ID (App ID)</Label>
                    <Input
                      id="graphClientId"
                      placeholder={graphConfig?.clientId || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                      value={graphCredentials.clientId}
                      onChange={(e) => setGraphCredentials({ ...graphCredentials, clientId: e.target.value })}
                      data-testid="input-graph-clientid"
                    />
                    {graphConfig?.clientId && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graphClientSecret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="graphClientSecret"
                        type={showPasswords.graphClientSecret ? "text" : "password"}
                        placeholder={graphConfig?.hasClientSecret ? "••••••••" : "Client Secret eingeben"}
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
                    {graphConfig?.hasClientSecret && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
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
                    {graphConfig?.fromAddress && (
                      <Badge variant="outline" className="text-xs">Gespeichert</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveGraph}
                  disabled={saveGraphMutation.isPending}
                  data-testid="button-save-graph"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveGraphMutation.isPending ? "Speichern..." : "Microsoft Graph speichern"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => testGraphMutation.mutate()}
                disabled={testGraphMutation.isPending}
                data-testid="button-test-graph"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testGraphMutation.isPending ? "Teste..." : "Verbindung testen"}
              </Button>

              {graphTestResult && (
                <div
                  className={`p-4 rounded-md ${
                    graphTestResult.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {graphTestResult.success ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
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

              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Azure AD Einrichtung:</strong> Erstellen Sie eine App-Registrierung in Azure Portal → 
                  API-Berechtigungen → Microsoft Graph → Application → Mail.Send → Admin-Zustimmung erteilen.
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
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Unternehmensdaten</CardTitle>
                  <CardDescription>
                    Absenderinformationen für Mahnschreiben
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  placeholder="Muster GmbH"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">E-Mail</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  placeholder="info@muster.de"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  data-testid="input-company-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyStreet">Straße</Label>
                <Input
                  id="companyStreet"
                  placeholder="Musterstraße 1"
                  value={companyData.street}
                  onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                  data-testid="input-company-street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefon</Label>
                <Input
                  id="companyPhone"
                  placeholder="+49 123 456789"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  data-testid="input-company-phone"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="companyZip">PLZ</Label>
                  <Input
                    id="companyZip"
                    placeholder="12345"
                    value={companyData.zip}
                    onChange={(e) => setCompanyData({ ...companyData, zip: e.target.value })}
                    data-testid="input-company-zip"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="companyCity">Ort</Label>
                  <Input
                    id="companyCity"
                    placeholder="Musterstadt"
                    value={companyData.city}
                    onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                    data-testid="input-company-city"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Bankverbindung</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    placeholder="DE89 3704 0044 0532 0130 00"
                    value={companyData.iban}
                    onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value })}
                    data-testid="input-bank-iban"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankBic">BIC</Label>
                  <Input
                    id="bankBic"
                    placeholder="COBADEFFXXX"
                    value={companyData.bic}
                    onChange={(e) => setCompanyData({ ...companyData, bic: e.target.value })}
                    data-testid="input-bank-bic"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveCompany}
              disabled={saveCompanyMutation.isPending}
              data-testid="button-save-company"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveCompanyMutation.isPending ? "Speichern..." : "Unternehmensdaten speichern"}
            </Button>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Paintbrush className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Portal Branding</CardTitle>
                  <CardDescription>
                    Passen Sie das Erscheinungsbild des Kundenportals an
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Firmenbezeichnung</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandingCompanyName">Portal-Name</Label>
                  <Input
                    id="brandingCompanyName"
                    placeholder="z.B. Kundenportal"
                    value={brandingData.companyName}
                    onChange={(e) => setBrandingData({ ...brandingData, companyName: e.target.value })}
                    data-testid="input-branding-company-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wird in der Sidebar und im Login-Bereich angezeigt
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingTagline">Untertitel</Label>
                  <Input
                    id="brandingTagline"
                    placeholder="z.B. Rechnungen & Zahlungen"
                    value={brandingData.companyTagline}
                    onChange={(e) => setBrandingData({ ...brandingData, companyTagline: e.target.value })}
                    data-testid="input-branding-tagline"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Logo & Favicon</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandingLogoUrl">Logo URL</Label>
                  <Input
                    id="brandingLogoUrl"
                    placeholder="https://example.com/logo.png"
                    value={brandingData.logoUrl || ""}
                    onChange={(e) => setBrandingData({ ...brandingData, logoUrl: e.target.value || null })}
                    data-testid="input-branding-logo-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL zu Ihrem Firmenlogo (empfohlen: 200x50px)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingFaviconUrl">Favicon URL</Label>
                  <Input
                    id="brandingFaviconUrl"
                    placeholder="https://example.com/favicon.ico"
                    value={brandingData.faviconUrl || ""}
                    onChange={(e) => setBrandingData({ ...brandingData, faviconUrl: e.target.value || null })}
                    data-testid="input-branding-favicon-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL zum Browser-Icon (32x32px)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Farbschema</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="brandingPrimaryColor">Primärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandingPrimaryColor"
                      type="color"
                      value={brandingData.primaryColor}
                      onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-branding-primary-color"
                    />
                    <Input
                      type="text"
                      value={brandingData.primaryColor}
                      onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                      placeholder="#16a34a"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Hauptfarbe für Buttons und Links</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingPrimaryForeground">Primär-Vordergrund</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandingPrimaryForeground"
                      type="color"
                      value={brandingData.primaryForeground}
                      onChange={(e) => setBrandingData({ ...brandingData, primaryForeground: e.target.value })}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-branding-primary-foreground"
                    />
                    <Input
                      type="text"
                      value={brandingData.primaryForeground}
                      onChange={(e) => setBrandingData({ ...brandingData, primaryForeground: e.target.value })}
                      className="flex-1 font-mono text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Textfarbe auf Primärfarbe</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingAccentColor">Akzentfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandingAccentColor"
                      type="color"
                      value={brandingData.accentColor}
                      onChange={(e) => setBrandingData({ ...brandingData, accentColor: e.target.value })}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-branding-accent-color"
                    />
                    <Input
                      type="text"
                      value={brandingData.accentColor}
                      onChange={(e) => setBrandingData({ ...brandingData, accentColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                      placeholder="#f0fdf4"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Hintergrund für Hervorhebungen</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingSidebarColor">Sidebar-Farbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandingSidebarColor"
                      type="color"
                      value={brandingData.sidebarColor}
                      onChange={(e) => setBrandingData({ ...brandingData, sidebarColor: e.target.value })}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-branding-sidebar-color"
                    />
                    <Input
                      type="text"
                      value={brandingData.sidebarColor}
                      onChange={(e) => setBrandingData({ ...brandingData, sidebarColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                      placeholder="#f8fafc"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Hintergrund der Seitenleiste</p>
                </div>
              </div>
              
              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Vorschau:</p>
                <div className="flex items-center gap-4">
                  <div 
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{ 
                      backgroundColor: brandingData.primaryColor, 
                      color: brandingData.primaryForeground 
                    }}
                  >
                    Beispiel-Button
                  </div>
                  <div 
                    className="px-4 py-2 rounded-md text-sm"
                    style={{ backgroundColor: brandingData.accentColor }}
                  >
                    Akzent-Hintergrund
                  </div>
                  <div 
                    className="px-4 py-2 rounded-md text-sm border"
                    style={{ backgroundColor: brandingData.sidebarColor }}
                  >
                    Sidebar
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Support-Kontakt</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandingSupportEmail">Support E-Mail</Label>
                  <Input
                    id="brandingSupportEmail"
                    type="email"
                    placeholder="support@example.com"
                    value={brandingData.supportEmail || ""}
                    onChange={(e) => setBrandingData({ ...brandingData, supportEmail: e.target.value || null })}
                    data-testid="input-branding-support-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingSupportPhone">Support Telefon</Label>
                  <Input
                    id="brandingSupportPhone"
                    type="tel"
                    placeholder="+49 123 456789"
                    value={brandingData.supportPhone || ""}
                    onChange={(e) => setBrandingData({ ...brandingData, supportPhone: e.target.value || null })}
                    data-testid="input-branding-support-phone"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Zusätzliche Einstellungen</h4>
              <div className="space-y-2">
                <Label htmlFor="brandingFooterText">Footer-Text</Label>
                <Input
                  id="brandingFooterText"
                  placeholder="© 2025 Ihr Unternehmen. Alle Rechte vorbehalten."
                  value={brandingData.footerText || ""}
                  onChange={(e) => setBrandingData({ ...brandingData, footerText: e.target.value || null })}
                  data-testid="input-branding-footer-text"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveBranding}
              disabled={saveBrandingMutation.isPending}
              data-testid="button-save-branding"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveBrandingMutation.isPending ? "Speichern..." : "Branding speichern"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
