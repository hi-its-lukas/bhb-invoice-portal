import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  primaryColor?: string;
  tagline?: string;
}

export function useBranding() {
  const { data: branding, isLoading } = useQuery<BrandingConfig>({
    queryKey: ["/api/config/branding"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (branding?.faviconUrl) {
      const existingLink = document.querySelector("link[rel='icon']");
      if (existingLink) {
        existingLink.setAttribute("href", branding.faviconUrl);
      } else {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = branding.faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [branding?.faviconUrl]);

  useEffect(() => {
    if (branding?.companyName) {
      document.title = branding.companyName;
    }
  }, [branding?.companyName]);

  return { branding, isLoading };
}
