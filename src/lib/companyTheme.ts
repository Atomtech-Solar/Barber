import type { Company } from "@/types/database.types";

const DEFAULT_PRIMARY = "#6fcf97";

function hexToHslToken(hex: string): string {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "142 46% 52%";
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyCompanyTheme(company: Company | null) {
  const root = document.documentElement;
  if (!company || !company.customization_enabled) {
    root.classList.remove("light");
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    return;
  }

  const themeMode = company.dashboard_theme ?? "dark";
  root.classList.toggle("light", themeMode === "light");

  const primaryHex = company.dashboard_primary_color ?? DEFAULT_PRIMARY;
  const primaryToken = hexToHslToken(primaryHex);
  root.style.setProperty("--primary", primaryToken);
  root.style.setProperty("--ring", primaryToken);
  root.style.setProperty("--sidebar-primary", primaryToken);
}

const SITE_THEME_STORAGE_KEY = "site-theme";

/**
 * Aplica o tema da empresa na landing pública.
 * Usa cor primária e tema (dark/light) quando disponíveis para branding.
 * Respeita preferência do usuário (localStorage) quando definida.
 */
export function applyCompanyThemeForSite(company: Company | null) {
  const root = document.documentElement;
  if (!company) {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    return;
  }

  const stored = typeof window !== "undefined" ? localStorage.getItem(SITE_THEME_STORAGE_KEY) : null;
  const themeMode =
    stored === "dark" || stored === "light" ? stored : (company.dashboard_theme ?? "light");
  const isLight = themeMode === "light";
  root.classList.toggle("light", isLight);
  root.classList.toggle("dark", !isLight);

  const primaryHex =
    company.dashboard_primary_color ??
    (company.customization_enabled ? DEFAULT_PRIMARY : null);
  if (primaryHex) {
    const primaryToken = hexToHslToken(primaryHex);
    root.style.setProperty("--primary", primaryToken);
    root.style.setProperty("--ring", primaryToken);
    root.style.setProperty("--sidebar-primary", primaryToken);
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
  }
}
