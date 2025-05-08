import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ThemeSettings, ThemeColors } from "@/types/theme";

// Default theme values
const defaultThemeColors: ThemeColors = {
  backgroundColor: "#ffffff",
  primaryColor: "#ea384c",
  textColor: "#000000",
  accentColor: "#9b87f5",
  userBubbleColor: "#ea384c",
  aiBubbleColor: "#9b87f5",
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: "#000000",
  aiTextColor: "#000000",
};

const defaultTheme: ThemeSettings = {
  mode: "light",
  colors: {
    light: { ...defaultThemeColors },
    dark: {
      ...defaultThemeColors,
      backgroundColor: "#121212",
      textColor: "#ffffff",
      userTextColor: "#ffffff",
      aiTextColor: "#ffffff",
      linkColor: "#33C3F0"
    }
  },
  backgroundImage: null,
  backgroundOpacity: 0.5,
  name: "Default",
};

type ThemeContextType = {
  theme: ThemeSettings;
  setTheme: (theme: ThemeSettings) => void;
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
  resetTheme: () => void;
  importTheme: (json: string) => boolean;
  exportTheme: () => string;
  validateTheme: (theme: ThemeSettings) => boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);
  const [mode, setModeState] = useState<"light" | "dark">("light");

  // Load theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("themeSettings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (validateTheme(parsed)) {
          setThemeState(parsed);
          setModeState(parsed.mode || "light");
        }
      } catch {}
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem("themeSettings", JSON.stringify(theme));
  }, [theme]);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = (theme.colors && theme.colors[mode]) || defaultThemeColors;
    Object.entries({ ...defaultThemeColors, ...colors }).forEach(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        root.style.setProperty(`--${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`, String(value));
      }
    });
    // Background image
    if (theme.backgroundImage) {
      document.body.classList.add("with-bg-image");
      document.body.style.backgroundImage = `url('${theme.backgroundImage}')`;
    } else {
      document.body.classList.remove("with-bg-image");
      document.body.style.backgroundImage = "";
    }
    // Opacity
    root.style.setProperty("--bg-opacity", String(theme.backgroundOpacity ?? 0.5));
    // Mode class
    if (mode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme, mode]);

  function setTheme(newTheme: ThemeSettings) {
    if (validateTheme(newTheme)) {
      setThemeState(newTheme);
      setModeState(newTheme.mode || "light");
    }
  }

  function resetTheme() {
    setThemeState(defaultTheme);
    setModeState("light");
  }

  function importTheme(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (validateTheme(parsed)) {
        setTheme(parsed);
        return true;
      }
    } catch {}
    return false;
  }

  function exportTheme(): string {
    return JSON.stringify(theme, null, 2);
  }

  function validateTheme(theme: ThemeSettings): boolean {
    // Basic validation: check color strings, opacity range, etc.
    const checkColor = (c: any) => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
    const checkOpacity = (o: any) => typeof o === "number" && o >= 0 && o <= 1;
    const colors = theme.colors || {};
    for (const mode of ["light", "dark"]) {
      const c = colors[mode];
      if (c) {
        for (const key of Object.keys(defaultThemeColors)) {
          if (key.endsWith("Color") && c[key] && !checkColor(c[key])) return false;
          if (key.endsWith("Opacity") && c[key] && !checkOpacity(c[key])) return false;
        }
      }
    }
    return true;
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      mode,
      setMode: (m) => setModeState(m),
      resetTheme,
      importTheme,
      exportTheme,
      validateTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
