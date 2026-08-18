import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "cyber-gold" | "neo-obsidian" | "emerald-luxury" | "arctic-minimalist";
export type ModeType = "light" | "dark" | "auto";
export type RadiusType = "sm" | "lg" | "2xl" | "3xl" | "full";
export type WallpaperType = "none" | "gradient" | "pattern" | "custom";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  radius: RadiusType;
  setRadius: (radius: RadiusType) => void;
  wallpaper: WallpaperType;
  setWallpaper: (wallpaper: WallpaperType) => void;
  customWallpaperUrl: string;
  setCustomWallpaperUrl: (url: string) => void;
  blurIntensity: number;
  setBlurIntensity: (intensity: number) => void;
  glowEnabled: boolean;
  setGlowEnabled: (enabled: boolean) => void;
  hotelInfo: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("daya_theme") as ThemeType) || "cyber-gold";
    }
    return "cyber-gold";
  });

  const [mode, setMode] = useState<ModeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("daya_mode") as ModeType) || "dark";
    }
    return "dark";
  });

  const [radius, setRadius] = useState<RadiusType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("daya_radius") as RadiusType) || "2xl";
    }
    return "2xl";
  });

  const [wallpaper, setWallpaper] = useState<WallpaperType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("daya_wallpaper") as WallpaperType) || "none";
    }
    return "none";
  });

  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("daya_custom_wallpaper") || "";
    }
    return "";
  });

  const [blurIntensity, setBlurIntensity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("daya_blur");
      return saved ? Number(saved) : 12;
    }
    return 12;
  });

  const [glowEnabled, setGlowEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("daya_glow");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [hotelInfo] = useState({ name: "LE DAYA Guest House" });

  // Sauvegarde des préférences dans le localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("daya_theme", theme);
      localStorage.setItem("daya_mode", mode);
      localStorage.setItem("daya_radius", radius);
      localStorage.setItem("daya_wallpaper", wallpaper);
      localStorage.setItem("daya_custom_wallpaper", customWallpaperUrl);
      localStorage.setItem("daya_blur", blurIntensity.toString());
      localStorage.setItem("daya_glow", JSON.stringify(glowEnabled));
    }
  }, [theme, mode, radius, wallpaper, customWallpaperUrl, blurIntensity, glowEnabled]);

  // Synchronisation globale sur l'élément racine (HTML)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    root.classList.remove(
      "theme-cyber-gold",
      "theme-neo-obsidian",
      "theme-emerald-luxury",
      "theme-arctic-minimalist"
    );
    if (theme) {
      root.classList.add(`theme-${theme}`);
    }

    const isDark =
      mode === "dark" ||
      (mode === "auto" && new Date().getHours() >= 18);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const radiusMap: Record<RadiusType, string> = {
      sm: "0.3rem",
      lg: "0.75rem",
      "2xl": "1rem",
      "3xl": "1.5rem",
      full: "9999px",
    };
    if (radiusMap[radius]) {
      root.style.setProperty("--radius", radiusMap[radius]);
    }
  }, [theme, mode, radius]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        mode,
        setMode,
        radius,
        setRadius,
        wallpaper,
        setWallpaper,
        customWallpaperUrl,
        setCustomWallpaperUrl,
        blurIntensity,
        setBlurIntensity,
        glowEnabled,
        setGlowEnabled,
        hotelInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useSettings must be used within a ThemeProvider");
  }
  return context;
}
