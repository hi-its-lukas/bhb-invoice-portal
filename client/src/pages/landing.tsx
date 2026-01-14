import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FileText, 
  CreditCard, 
  Clock, 
  Shield, 
  Phone,
  Mail,
  ChevronRight,
  Building2,
  Users,
  BarChart3,
  Bell,
  CheckCircle,
  Settings,
  Zap,
  type LucideIcon
} from "lucide-react";

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

const iconMap: Record<string, LucideIcon> = {
  FileText,
  CreditCard,
  Clock,
  Shield,
  Phone,
  Mail,
  Building2,
  Users,
  BarChart3,
  Bell,
  CheckCircle,
  Settings,
  Zap,
};

const defaultFeatures: FeatureCard[] = [
  {
    title: "Rechnungsübersicht",
    description: "Alle Ihre Rechnungen und offenen Posten auf einen Blick. Sehen Sie Fälligkeiten und Zahlungsstatus.",
    iconKey: "FileText",
  },
  {
    title: "Zahlungsinformationen",
    description: "Überprüfen Sie offene Beträge und erhalten Sie alle notwendigen Informationen für Ihre Überweisungen.",
    iconKey: "CreditCard",
  },
  {
    title: "Fälligkeitsübersicht",
    description: "Behalten Sie den Überblick über anstehende und überfällige Zahlungen.",
    iconKey: "Clock",
  },
  {
    title: "Sicherer Zugang",
    description: "Ihre Daten sind sicher. Zugriff nur mit persönlichen Anmeldedaten.",
    iconKey: "Shield",
  },
];

export default function LandingPage() {
  const { data: branding } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
    staleTime: 1000 * 60 * 5,
  });

  const landing = branding?.landingPage || {};
  const heroTitle = landing.heroTitle || "Willkommen im Kundenportal";
  const heroSubtitle = landing.heroSubtitle || "Behalten Sie den Überblick über Ihre Rechnungen und offenen Posten. Melden Sie sich an, um Ihre Kontoinformationen einzusehen.";
  const ctaButtonText = landing.ctaButtonText || "Zum Portal";
  const ctaButtonUrl = landing.ctaButtonUrl || "/login";
  const showFeatures = landing.showFeatures !== false;
  const featuresTitle = landing.featuresTitle || "Was Sie im Portal finden";
  const featureCards = landing.featureCards && landing.featureCards.length > 0 ? landing.featureCards : defaultFeatures;
  const showContact = landing.showContact !== false;
  const contactTitle = landing.contactTitle || "Kontakt";
  const contactText = landing.contactText || "Bei Fragen stehen wir Ihnen gerne zur Verfügung.";

  const getIcon = (iconKey?: string): LucideIcon => {
    return iconMap[iconKey || "FileText"] || FileText;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.companyName || "Logo"} 
                className="h-9 w-9 object-contain rounded-md"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <span className="font-semibold">{branding?.companyName || "Kundenportal"}</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login-header">
              <a href="/login">Anmelden</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" data-testid="text-hero-title">
              {heroTitle}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
              {heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href={ctaButtonUrl} className="gap-2">
                  {ctaButtonText}
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {showFeatures && (
          <section className="py-16 px-6 bg-muted/30" data-testid="section-features">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold mb-8 text-center" data-testid="text-features-title">
                {featuresTitle}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {featureCards.map((feature, index) => {
                  const Icon = getIcon(feature.iconKey);
                  return (
                    <Card key={index} className="hover-elevate transition-all duration-200" data-testid={`card-feature-${index}`}>
                      <CardContent className="pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {showContact && (branding?.supportEmail || branding?.supportPhone) && (
          <section className="py-16 px-6" data-testid="section-contact">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold mb-4 text-center" data-testid="text-contact-title">
                {contactTitle}
              </h2>
              {contactText && (
                <p className="text-center text-muted-foreground mb-8" data-testid="text-contact-subtitle">
                  {contactText}
                </p>
              )}
              
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {branding?.supportPhone && (
                  <Card data-testid="card-contact-phone">
                    <CardContent className="pt-6 flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Telefon</h3>
                        <p className="text-sm text-muted-foreground">
                          {branding.supportPhone}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {branding?.supportEmail && (
                  <Card data-testid="card-contact-email">
                    <CardContent className="pt-6 flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">E-Mail</h3>
                        <p className="text-sm text-muted-foreground">
                          {branding.supportEmail}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-8 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.companyName || "Logo"} 
                className="h-7 w-7 object-contain rounded"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">{branding?.companyName || "Kundenportal"}</span>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-footer">
            {branding?.footerText || "Alle Rechte vorbehalten."}
          </p>
        </div>
      </footer>
    </div>
  );
}
