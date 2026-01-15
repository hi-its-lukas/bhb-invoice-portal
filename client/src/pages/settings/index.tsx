import { Link } from "wouter";
import { Server, Mail, Building2, Paintbrush, ChevronRight, Percent, Layout } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface ConfigStatus {
  bhb: boolean;
  smtp: boolean;
  graph: boolean;
  company: boolean;
  branding: boolean;
}

const settingsSections = [
  {
    title: "BuchhaltungsButler API",
    description: "Verbindung zur BHB-Buchhaltungssoftware konfigurieren",
    icon: Server,
    href: "/settings/bhb",
    configKey: "bhb" as const,
  },
  {
    title: "E-Mail-Versand",
    description: "SMTP oder Microsoft Graph für den Mahnungsversand",
    icon: Mail,
    href: "/settings/email",
    configKey: "smtp" as const,
  },
  {
    title: "Unternehmen & Zinsen",
    description: "Firmendaten, Bankverbindung und gesetzliche Zinssätze",
    icon: Building2,
    href: "/settings/company",
    configKey: "company" as const,
  },
  {
    title: "Branding & Design",
    description: "Logo, Favicon, Farben und Portal-Erscheinungsbild",
    icon: Paintbrush,
    href: "/settings/branding",
    configKey: "branding" as const,
  },
  {
    title: "Startseite",
    description: "Landing-Page Inhalte und Konfiguration",
    icon: Layout,
    href: "/settings/landing",
    configKey: "branding" as const,
  },
];

export default function SettingsIndexPage() {
  const { data: bhbConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/bhb"],
  });

  const { data: smtpConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/smtp"],
  });

  const { data: graphConfig } = useQuery<{ isConfigured: boolean }>({
    queryKey: ["/api/settings/msgraph"],
  });

  const { data: companyConfig } = useQuery<{ name: string }>({
    queryKey: ["/api/settings/company"],
  });

  const { data: brandingConfig } = useQuery<{ companyName: string }>({
    queryKey: ["/api/config/branding"],
  });

  const configStatus: ConfigStatus = {
    bhb: bhbConfig?.isConfigured || false,
    smtp: smtpConfig?.isConfigured || graphConfig?.isConfigured || false,
    graph: graphConfig?.isConfigured || false,
    company: !!companyConfig?.name,
    branding: !!brandingConfig?.companyName,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfigurieren Sie das Portal und die Integrationen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          const isConfigured = configStatus[section.configKey];
          
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover-elevate cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? "Konfiguriert" : "Offen"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
