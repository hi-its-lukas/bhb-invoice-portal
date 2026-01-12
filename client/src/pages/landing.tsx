import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Clock, 
  Mail,
  ChevronRight 
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Rechnungsübersicht",
    description: "Alle offenen Posten aus BuchhaltungsButler auf einen Blick. Automatische Synchronisation Ihrer Belege.",
  },
  {
    icon: AlertTriangle,
    title: "Intelligentes Mahnwesen",
    description: "Konfigurierbare Mahnstufen pro Debitor. Automatische Berechnung von Verzugszinsen.",
  },
  {
    icon: Mail,
    title: "Automatisierte Erinnerungen",
    description: "Automatischer Versand von Zahlungserinnerungen und Mahnungen nach Ihren Regeln.",
  },
  {
    icon: TrendingUp,
    title: "Zinsberechnung",
    description: "Tagesgenaue Verzugszinsberechnung. Gesetzliche Zinssätze oder individuelle Konditionen.",
  },
  {
    icon: Clock,
    title: "Echtzeit-Überwachung",
    description: "Überfällige Posten sofort erkennen. Fälligkeitsampel für schnelle Entscheidungen.",
  },
  {
    icon: Shield,
    title: "Sichere Verwaltung",
    description: "Rollenbasierter Zugriff. Transparente Protokollierung aller Mahnvorgänge.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              BHB
            </div>
            <span className="font-semibold">Debitorenportal</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login-header">
              <a href="/api/login">Anmelden</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Professionelles Debitorenmanagement für{" "}
                  <span className="text-primary">BuchhaltungsButler</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Behalten Sie den Überblick über alle offenen Posten. Automatisieren Sie Ihr Mahnwesen 
                  und optimieren Sie Ihren Cashflow mit unserem integrierten Debitorenportal.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button size="lg" asChild data-testid="button-get-started">
                    <a href="/api/login" className="gap-2">
                      Jetzt starten
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" data-testid="button-learn-more">
                    Mehr erfahren
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Sichere Anmeldung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Schnelle Einrichtung</span>
                  </div>
                </div>
              </div>

              <div className="relative lg:pl-8">
                <div className="relative rounded-lg border bg-card p-6 shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Offene Posten</h3>
                      <span className="text-2xl font-bold text-primary tabular-nums">12.450,00 €</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium text-sm">RE-2024-0042</p>
                          <p className="text-xs text-muted-foreground">Fällig: 15.01.2024</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm tabular-nums">3.500,00 €</p>
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">
                            Überfällig
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium text-sm">RE-2024-0041</p>
                          <p className="text-xs text-muted-foreground">Fällig: 28.01.2024</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm tabular-nums">5.200,00 €</p>
                          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                            Bald fällig
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-sm">RE-2024-0040</p>
                          <p className="text-xs text-muted-foreground">Fällig: 05.02.2024</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm tabular-nums">3.750,00 €</p>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Offen
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Alles für Ihr Forderungsmanagement</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Von der automatischen Synchronisation bis zum professionellen Mahnwesen – 
                alle Werkzeuge in einer Oberfläche.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate transition-all duration-200">
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">Bereit für effizienteres Forderungsmanagement?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Starten Sie jetzt und verbessern Sie Ihren Cashflow mit automatisiertem Mahnwesen 
              und vollständiger BuchhaltungsButler-Integration.
            </p>
            <Button size="lg" asChild data-testid="button-cta-bottom">
              <a href="/api/login" className="gap-2">
                Kostenlos starten
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              BHB
            </div>
            <span className="text-sm text-muted-foreground">Debitorenportal</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 BHB Debitorenportal. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
