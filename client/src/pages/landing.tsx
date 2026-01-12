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
  Building2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-semibold">Kundenportal</span>
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
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Willkommen im Kundenportal
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
              Behalten Sie den Überblick über Ihre Rechnungen und offenen Posten. 
              Melden Sie sich an, um Ihre Kontoinformationen einzusehen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/login" className="gap-2">
                  Zum Portal
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-8 text-center">Was Sie im Portal finden</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Rechnungsübersicht</h3>
                  <p className="text-sm text-muted-foreground">
                    Alle Ihre Rechnungen und offenen Posten auf einen Blick. 
                    Sehen Sie Fälligkeiten und Zahlungsstatus.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Zahlungsinformationen</h3>
                  <p className="text-sm text-muted-foreground">
                    Überprüfen Sie offene Beträge und erhalten Sie alle 
                    notwendigen Informationen für Ihre Überweisungen.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Fälligkeitsübersicht</h3>
                  <p className="text-sm text-muted-foreground">
                    Behalten Sie den Überblick über anstehende und 
                    überfällige Zahlungen.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Sicherer Zugang</h3>
                  <p className="text-sm text-muted-foreground">
                    Ihre Daten sind sicher. Zugriff nur mit persönlichen 
                    Anmeldedaten.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-8 text-center">Kontakt</h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Telefon</h3>
                    <p className="text-sm text-muted-foreground">
                      Bei Fragen zu Ihren Rechnungen erreichen Sie uns telefonisch.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">E-Mail</h3>
                    <p className="text-sm text-muted-foreground">
                      Schreiben Sie uns eine Nachricht - wir melden uns zeitnah.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground">Kundenportal</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
