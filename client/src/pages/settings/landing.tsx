import { Link } from "wouter";
import { ArrowLeft, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingPageConfigCard } from "@/components/landing-page-config";

export default function LandingSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Startseite</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie die öffentliche Landing-Page des Portals
          </p>
        </div>
      </div>

      <LandingPageConfigCard />
    </div>
  );
}
