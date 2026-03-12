import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const STORAGE_KEY = "site-theme";

type SiteTheme = "dark" | "light";

interface SiteThemeContextValue {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
}

const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);

function applyThemeToDOM(theme: SiteTheme) {
  const isLight = theme === "light";
  document.documentElement.classList.toggle("light", isLight);
  document.documentElement.classList.toggle("dark", !isLight);
}

export function SiteThemeProvider({
  children,
  initialTheme = "dark",
}: {
  children: ReactNode;
  initialTheme?: SiteTheme;
}) {
  const [theme, setThemeState] = useState<SiteTheme>(() => {
    if (typeof window === "undefined") return initialTheme;
    const stored = localStorage.getItem(STORAGE_KEY) as SiteTheme | null;
    if (stored === "dark" || stored === "light") return stored;
    return initialTheme;
  });

  useEffect(() => {
    applyThemeToDOM(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <SiteThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) {
    throw new Error("useSiteTheme must be used within SiteThemeProvider");
  }
  return ctx;
}
