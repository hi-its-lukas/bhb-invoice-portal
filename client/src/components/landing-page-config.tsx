import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layout, Plus, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FeatureCard {
  title: string;
  description: string;
  iconKey?: string;
}

interface LandingPageConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  showFeatures?: boolean;
  featuresTitle?: string;
  featureCards?: FeatureCard[];
  showContact?: boolean;
  contactTitle?: string;
  contactText?: string;
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
  landingPage?: LandingPageConfig;
}

const iconOptions = [
  { value: "FileText", label: "Dokument" },
  { value: "CreditCard", label: "Kreditkarte" },
  { value: "Clock", label: "Uhr" },
  { value: "Shield", label: "Schutz" },
  { value: "Users", label: "Benutzer" },
  { value: "BarChart3", label: "Diagramm" },
  { value: "Bell", label: "Glocke" },
  { value: "CheckCircle", label: "Häkchen" },
  { value: "Settings", label: "Einstellungen" },
  { value: "Zap", label: "Blitz" },
];

const defaultLandingPage: LandingPageConfig = {
  heroTitle: "Willkommen im Kundenportal",
  heroSubtitle: "Behalten Sie den Überblick über Ihre Rechnungen und offenen Posten. Melden Sie sich an, um Ihre Kontoinformationen einzusehen.",
  ctaButtonText: "Zum Portal",
  ctaButtonUrl: "/login",
  showFeatures: true,
  featuresTitle: "Was Sie im Portal finden",
  featureCards: [],
  showContact: true,
  contactTitle: "Kontakt",
  contactText: "Bei Fragen stehen wir Ihnen gerne zur Verfügung.",
};

export function LandingPageConfigCard() {
  const { toast } = useToast();
  
  const { data: brandingConfig } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
  });

  const [landingData, setLandingData] = useState<LandingPageConfig>(defaultLandingPage);

  useEffect(() => {
    if (brandingConfig?.landingPage) {
      setLandingData({
        ...defaultLandingPage,
        ...brandingConfig.landingPage,
      });
    }
  }, [brandingConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data: LandingPageConfig) => {
      const updatedBranding = {
        ...brandingConfig,
        landingPage: data,
      };
      return apiRequest("POST", "/api/config/branding", updatedBranding);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/branding"] });
      toast({
        title: "Gespeichert",
        description: "Landingpage-Konfiguration wurde gespeichert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Konnte die Konfiguration nicht speichern.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(landingData);
  };

  const addFeatureCard = () => {
    const newCards = [
      ...(landingData.featureCards || []),
      { title: "", description: "", iconKey: "FileText" },
    ];
    setLandingData({ ...landingData, featureCards: newCards });
  };

  const updateFeatureCard = (index: number, field: keyof FeatureCard, value: string) => {
    const newCards = [...(landingData.featureCards || [])];
    newCards[index] = { ...newCards[index], [field]: value };
    setLandingData({ ...landingData, featureCards: newCards });
  };

  const removeFeatureCard = (index: number) => {
    const newCards = (landingData.featureCards || []).filter((_, i) => i !== index);
    setLandingData({ ...landingData, featureCards: newCards });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Layout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Landingpage anpassen</CardTitle>
              <CardDescription>
                Texte und Abschnitte der Startseite konfigurieren
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Hero-Bereich</h4>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Überschrift</Label>
              <Input
                id="heroTitle"
                placeholder="Willkommen im Kundenportal"
                value={landingData.heroTitle || ""}
                onChange={(e) => setLandingData({ ...landingData, heroTitle: e.target.value })}
                data-testid="input-hero-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Untertitel</Label>
              <Textarea
                id="heroSubtitle"
                placeholder="Behalten Sie den Überblick..."
                value={landingData.heroSubtitle || ""}
                onChange={(e) => setLandingData({ ...landingData, heroSubtitle: e.target.value })}
                rows={3}
                data-testid="input-hero-subtitle"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ctaButtonText">Button-Text</Label>
                <Input
                  id="ctaButtonText"
                  placeholder="Zum Portal"
                  value={landingData.ctaButtonText || ""}
                  onChange={(e) => setLandingData({ ...landingData, ctaButtonText: e.target.value })}
                  data-testid="input-cta-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaButtonUrl">Button-Link</Label>
                <Input
                  id="ctaButtonUrl"
                  placeholder="/login"
                  value={landingData.ctaButtonUrl || ""}
                  onChange={(e) => setLandingData({ ...landingData, ctaButtonUrl: e.target.value })}
                  data-testid="input-cta-url"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Feature-Bereich</h4>
            <div className="flex items-center gap-2">
              <Label htmlFor="showFeatures" className="text-sm text-muted-foreground">
                Anzeigen
              </Label>
              <Switch
                id="showFeatures"
                checked={landingData.showFeatures !== false}
                onCheckedChange={(checked) => setLandingData({ ...landingData, showFeatures: checked })}
                data-testid="switch-show-features"
              />
            </div>
          </div>

          {landingData.showFeatures !== false && (
            <>
              <div className="space-y-2">
                <Label htmlFor="featuresTitle">Abschnitts-Überschrift</Label>
                <Input
                  id="featuresTitle"
                  placeholder="Was Sie im Portal finden"
                  value={landingData.featuresTitle || ""}
                  onChange={(e) => setLandingData({ ...landingData, featuresTitle: e.target.value })}
                  data-testid="input-features-title"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Feature-Karten</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFeatureCard}
                    data-testid="button-add-feature"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Hinzufügen
                  </Button>
                </div>
                
                {(landingData.featureCards || []).length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
                    Keine benutzerdefinierten Features angelegt. Es werden Standardtexte angezeigt.
                  </p>
                )}

                {(landingData.featureCards || []).map((card, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3" data-testid={`card-feature-edit-${index}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid gap-3">
                        <div className="grid gap-3 md:grid-cols-[1fr,140px]">
                          <div className="space-y-1">
                            <Label className="text-xs">Titel</Label>
                            <Input
                              placeholder="Feature-Titel"
                              value={card.title}
                              onChange={(e) => updateFeatureCard(index, "title", e.target.value)}
                              data-testid={`input-feature-title-${index}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Icon</Label>
                            <Select
                              value={card.iconKey || "FileText"}
                              onValueChange={(value) => updateFeatureCard(index, "iconKey", value)}
                            >
                              <SelectTrigger data-testid={`select-feature-icon-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {iconOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Beschreibung</Label>
                          <Textarea
                            placeholder="Feature-Beschreibung..."
                            value={card.description}
                            onChange={(e) => updateFeatureCard(index, "description", e.target.value)}
                            rows={2}
                            data-testid={`input-feature-desc-${index}`}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeatureCard(index)}
                        data-testid={`button-remove-feature-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Kontakt-Bereich</h4>
            <div className="flex items-center gap-2">
              <Label htmlFor="showContact" className="text-sm text-muted-foreground">
                Anzeigen
              </Label>
              <Switch
                id="showContact"
                checked={landingData.showContact !== false}
                onCheckedChange={(checked) => setLandingData({ ...landingData, showContact: checked })}
                data-testid="switch-show-contact"
              />
            </div>
          </div>

          {landingData.showContact !== false && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactTitle">Abschnitts-Überschrift</Label>
                <Input
                  id="contactTitle"
                  placeholder="Kontakt"
                  value={landingData.contactTitle || ""}
                  onChange={(e) => setLandingData({ ...landingData, contactTitle: e.target.value })}
                  data-testid="input-contact-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactText">Kontakt-Text</Label>
                <Textarea
                  id="contactText"
                  placeholder="Bei Fragen stehen wir Ihnen gerne zur Verfügung."
                  value={landingData.contactText || ""}
                  onChange={(e) => setLandingData({ ...landingData, contactText: e.target.value })}
                  rows={2}
                  data-testid="input-contact-text"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Hinweis: Telefon und E-Mail werden aus den Support-Kontaktdaten im Branding übernommen.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-landing"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Speichern..." : "Landingpage speichern"}
        </Button>
      </CardContent>
    </Card>
  );
}
