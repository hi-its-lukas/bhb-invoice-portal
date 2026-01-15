import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  companyTagline?: string;
  primaryColor?: string;
  primaryForeground?: string;
  accentColor?: string;
  sidebarColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  tagline?: string;
}

function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, "");
  
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isLightColor(hex: string): boolean {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
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

  useEffect(() => {
    const root = document.documentElement;
    
    if (branding?.primaryColor) {
      const hsl = hexToHSL(branding.primaryColor);
      root.style.setProperty("--primary", hsl);
      
      if (branding.primaryForeground) {
        root.style.setProperty("--primary-foreground", hexToHSL(branding.primaryForeground));
      } else {
        const fgHSL = isLightColor(branding.primaryColor) ? "0 0% 0%" : "0 0% 100%";
        root.style.setProperty("--primary-foreground", fgHSL);
      }
    }
    
    if (branding?.accentColor) {
      const hsl = hexToHSL(branding.accentColor);
      root.style.setProperty("--accent", hsl);
      const fgHSL = isLightColor(branding.accentColor) ? "0 0% 0%" : "0 0% 100%";
      root.style.setProperty("--accent-foreground", fgHSL);
    }
    
    if (branding?.backgroundColor) {
      const hsl = hexToHSL(branding.backgroundColor);
      root.style.setProperty("--background", hsl);
      const fgHSL = isLightColor(branding.backgroundColor) ? "0 0% 10%" : "0 0% 98%";
      root.style.setProperty("--foreground", fgHSL);
    }
    
    if (branding?.cardColor) {
      const hsl = hexToHSL(branding.cardColor);
      root.style.setProperty("--card", hsl);
      const fgHSL = isLightColor(branding.cardColor) ? "0 0% 10%" : "0 0% 98%";
      root.style.setProperty("--card-foreground", fgHSL);
    }
    
    if (branding?.sidebarColor) {
      const hsl = hexToHSL(branding.sidebarColor);
      root.style.setProperty("--sidebar", hsl);
      root.style.setProperty("--sidebar-background", hsl);
      const fgHSL = isLightColor(branding.sidebarColor) ? "0 0% 20%" : "0 0% 95%";
      root.style.setProperty("--sidebar-foreground", fgHSL);
    }
  }, [branding?.primaryColor, branding?.primaryForeground, branding?.accentColor, branding?.backgroundColor, branding?.cardColor, branding?.sidebarColor]);

  return { branding, isLoading };
}
