import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Building2, Save, Percent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

interface InterestConfig {
  ezbBaseRate: number;
  lastUpdated?: string;
}

export default function CompanySettingsPage() {
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
  const [ezbBaseRate, setEzbBaseRate] = useState<string>("");
  const { toast } = useToast();

  const { data: companyConfig } = useQuery<CompanyConfig>({
    queryKey: ["/api/settings/company"],
  });

  const { data: interestConfig } = useQuery<InterestConfig>({
    queryKey: ["/api/settings/interest"],
  });

  useEffect(() => {
    if (companyConfig && !companyData.name && !companyData.iban) {
      setCompanyData(companyConfig);
    }
  }, [companyConfig, companyData.name, companyData.iban]);

  useEffect(() => {
    if (interestConfig?.ezbBaseRate && !ezbBaseRate) {
      setEzbBaseRate(interestConfig.ezbBaseRate.toString());
    }
  }, [interestConfig, ezbBaseRate]);

  const saveCompanyMutation = useMutation({
    mutationFn: (data: CompanyConfig) => apiRequest("POST", "/api/settings/company", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      toast({ title: "Unternehmensdaten gespeichert", description: "Die Unternehmensdaten wurden aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const saveInterestMutation = useMutation({
    mutationFn: (data: { ezbBaseRate: number }) => apiRequest("POST", "/api/settings/interest", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/interest"] });
      toast({ title: "Basiszinssatz gespeichert", description: "Der EZB-Basiszinssatz wurde aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveInterest = () => {
    const rate = parseFloat(ezbBaseRate.replace(",", "."));
    if (isNaN(rate)) {
      toast({ title: "Ungültiger Wert", description: "Bitte geben Sie eine gültige Zahl ein.", variant: "destructive" });
      return;
    }
    saveInterestMutation.mutate({ ezbBaseRate: rate });
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
          <h1 className="text-2xl font-bold">Unternehmen & Zinsen</h1>
          <p className="text-muted-foreground">
            Firmendaten, Bankverbindung und gesetzliche Zinssätze
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Unternehmensdaten</CardTitle>
              <CardDescription>
                Diese Daten werden in Mahnschreiben und PDFs verwendet
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
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
              <Label htmlFor="companyStreet">Straße und Hausnummer</Label>
              <Input
                id="companyStreet"
                placeholder="Musterstraße 123"
                value={companyData.street}
                onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                data-testid="input-company-street"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="companyCity">Stadt</Label>
                <Input
                  id="companyCity"
                  placeholder="Musterstadt"
                  value={companyData.city}
                  onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                  data-testid="input-company-city"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefon</Label>
                <Input
                  id="companyPhone"
                  type="tel"
                  placeholder="+49 123 456789"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  data-testid="input-company-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">E-Mail</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  placeholder="info@firma.de"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  data-testid="input-company-email"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyIban">IBAN</Label>
                <Input
                  id="companyIban"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  value={companyData.iban}
                  onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value })}
                  data-testid="input-company-iban"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyBic">BIC</Label>
                <Input
                  id="companyBic"
                  placeholder="COBADEFFXXX"
                  value={companyData.bic}
                  onChange={(e) => setCompanyData({ ...companyData, bic: e.target.value })}
                  data-testid="input-company-bic"
                />
              </div>
            </div>

            <Button
              onClick={() => saveCompanyMutation.mutate(companyData)}
              disabled={saveCompanyMutation.isPending}
              data-testid="button-save-company"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveCompanyMutation.isPending ? "Speichern..." : "Unternehmensdaten speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Gesetzliche Verzugszinsen</CardTitle>
              <CardDescription>
                EZB-Basiszinssatz für die automatische Zinsberechnung nach BGB
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ezbBaseRate">EZB-Basiszinssatz (% p.a.)</Label>
              <div className="flex gap-2">
                <Input
                  id="ezbBaseRate"
                  placeholder="3.62"
                  value={ezbBaseRate}
                  onChange={(e) => setEzbBaseRate(e.target.value)}
                  className="max-w-32"
                  data-testid="input-ezb-rate"
                />
                <span className="flex items-center text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aktueller Basiszinssatz der EZB. Wird halbjährlich angepasst (1. Januar und 1. Juli).
              </p>
            </div>

            <div className="p-4 rounded-md bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Berechnete Verzugszinssätze:</p>
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
  );
}
