import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Paintbrush, Save, Upload, X, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BrandingConfig {
  companyName: string;
  companyTagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryForeground: string;
  accentColor: string;
  sidebarColor: string;
  backgroundColor: string;
  cardColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  footerText: string | null;
  customCss: string | null;
}

export default function BrandingSettingsPage() {
  const [brandingData, setBrandingData] = useState<BrandingConfig>({
    companyName: "",
    companyTagline: "",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#16a34a",
    primaryForeground: "#ffffff",
    accentColor: "#f0fdf4",
    sidebarColor: "#f8fafc",
    backgroundColor: "#ffffff",
    cardColor: "#ffffff",
    supportEmail: null,
    supportPhone: null,
    footerText: null,
    customCss: null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: brandingConfig } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
  });

  useEffect(() => {
    if (brandingConfig && !brandingData.companyName) {
      setBrandingData(brandingConfig);
      if (brandingConfig.logoUrl) setLogoPreview(brandingConfig.logoUrl);
      if (brandingConfig.faviconUrl) setFaviconPreview(brandingConfig.faviconUrl);
    }
  }, [brandingConfig, brandingData.companyName]);

  const saveBrandingMutation = useMutation({
    mutationFn: (data: Partial<BrandingConfig>) => apiRequest("POST", "/api/config/branding", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/branding"] });
      toast({ title: "Branding gespeichert", description: "Die Branding-Einstellungen wurden aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "logo" | "favicon" }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      
      const response = await fetch("/api/config/branding/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload fehlgeschlagen");
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/branding"] });
      if (variables.type === "logo") {
        setBrandingData(prev => ({ ...prev, logoUrl: data.url }));
        setLogoPreview(data.url);
      } else {
        setBrandingData(prev => ({ ...prev, faviconUrl: data.url }));
        setFaviconPreview(data.url);
      }
      toast({ title: "Datei hochgeladen", description: `${variables.type === "logo" ? "Logo" : "Favicon"} wurde erfolgreich hochgeladen.` });
    },
    onError: (error: Error) => {
      toast({ title: "Upload fehlgeschlagen", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === "logo" ? 2 * 1024 * 1024 : 512 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Datei zu groß",
        description: `Maximale Größe: ${type === "logo" ? "2 MB" : "512 KB"}`,
        variant: "destructive",
      });
      return;
    }

    const validTypes = type === "logo" 
      ? ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
      : ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Ungültiges Format",
        description: type === "logo" ? "Erlaubt: PNG, JPG, SVG, WebP" : "Erlaubt: PNG, ICO, SVG",
        variant: "destructive",
      });
      return;
    }

    uploadFileMutation.mutate({ file, type });
  };

  const handleRemoveImage = (type: "logo" | "favicon") => {
    if (type === "logo") {
      setBrandingData(prev => ({ ...prev, logoUrl: null }));
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
    } else {
      setBrandingData(prev => ({ ...prev, faviconUrl: null }));
      setFaviconPreview(null);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
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
          <h1 className="text-2xl font-bold">Branding & Design</h1>
          <p className="text-muted-foreground">
            Logo, Favicon, Farben und Portal-Erscheinungsbild
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Label>Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {logoPreview ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={logoPreview} 
                          alt="Logo Vorschau" 
                          className="max-h-16 max-w-full object-contain"
                        />
                      </div>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Ändern
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage("logo")}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="py-6 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Klicken zum Hochladen
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, SVG oder WebP (max. 2 MB)
                      </p>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "logo")}
                    data-testid="input-logo-upload"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Empfohlen: 200x50px, transparenter Hintergrund
                </p>
              </div>

              <div className="space-y-4">
                <Label>Favicon (Browser-Icon)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {faviconPreview ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={faviconPreview} 
                          alt="Favicon Vorschau" 
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Ändern
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage("favicon")}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="py-6 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Klicken zum Hochladen
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, ICO oder SVG (max. 512 KB)
                      </p>
                    </div>
                  )}
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "favicon")}
                    data-testid="input-favicon-upload"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Empfohlen: 32x32px oder 64x64px
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Farbschema</h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-xs text-muted-foreground">Buttons & Links</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandingPrimaryForeground">Primär-Text</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandingPrimaryForeground"
                    type="color"
                    value={brandingData.primaryForeground}
                    onChange={(e) => setBrandingData({ ...brandingData, primaryForeground: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={brandingData.primaryForeground}
                    onChange={(e) => setBrandingData({ ...brandingData, primaryForeground: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Text auf Primärfarbe</p>
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
                  />
                  <Input
                    type="text"
                    value={brandingData.accentColor}
                    onChange={(e) => setBrandingData({ ...brandingData, accentColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#f0fdf4"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Hervorhebungen</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandingBackgroundColor">Hintergrund</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandingBackgroundColor"
                    type="color"
                    value={brandingData.backgroundColor}
                    onChange={(e) => setBrandingData({ ...brandingData, backgroundColor: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                    data-testid="input-branding-background-color"
                  />
                  <Input
                    type="text"
                    value={brandingData.backgroundColor}
                    onChange={(e) => setBrandingData({ ...brandingData, backgroundColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Seiten-Hintergrund</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandingCardColor">Karten-Farbe</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandingCardColor"
                    type="color"
                    value={brandingData.cardColor}
                    onChange={(e) => setBrandingData({ ...brandingData, cardColor: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                    data-testid="input-branding-card-color"
                  />
                  <Input
                    type="text"
                    value={brandingData.cardColor}
                    onChange={(e) => setBrandingData({ ...brandingData, cardColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Cards & Panels</p>
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
                  />
                  <Input
                    type="text"
                    value={brandingData.sidebarColor}
                    onChange={(e) => setBrandingData({ ...brandingData, sidebarColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#f8fafc"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Seitenleiste</p>
              </div>
            </div>

            <div className="p-4 rounded-md bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Vorschau:</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: brandingData.primaryColor,
                    color: brandingData.primaryForeground,
                  }}
                >
                  Button
                </div>
                <div
                  className="px-4 py-2 rounded-md text-sm"
                  style={{ backgroundColor: brandingData.accentColor }}
                >
                  Akzent
                </div>
                <div
                  className="px-4 py-2 rounded-md text-sm border"
                  style={{ backgroundColor: brandingData.backgroundColor }}
                >
                  Hintergrund
                </div>
                <div
                  className="px-4 py-2 rounded-md text-sm border shadow-sm"
                  style={{ backgroundColor: brandingData.cardColor }}
                >
                  Card
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
            <h4 className="text-sm font-medium">Footer & Erweitert</h4>
            <div className="space-y-2">
              <Label htmlFor="brandingFooterText">Footer-Text</Label>
              <Input
                id="brandingFooterText"
                placeholder="© 2025 Ihre Firma. Alle Rechte vorbehalten."
                value={brandingData.footerText || ""}
                onChange={(e) => setBrandingData({ ...brandingData, footerText: e.target.value || null })}
                data-testid="input-branding-footer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandingCustomCss">Benutzerdefiniertes CSS (optional)</Label>
              <Textarea
                id="brandingCustomCss"
                placeholder=".custom-class { color: red; }"
                value={brandingData.customCss || ""}
                onChange={(e) => setBrandingData({ ...brandingData, customCss: e.target.value || null })}
                className="font-mono text-sm min-h-24"
                data-testid="input-branding-css"
              />
              <p className="text-xs text-muted-foreground">
                Erweiterte CSS-Anpassungen für Experten
              </p>
            </div>
          </div>

          <Button
            onClick={() => saveBrandingMutation.mutate(brandingData)}
            disabled={saveBrandingMutation.isPending}
            data-testid="button-save-branding"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveBrandingMutation.isPending ? "Speichern..." : "Branding speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
