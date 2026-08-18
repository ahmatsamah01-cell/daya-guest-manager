import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "cyber-gold" | "neo-obsidian" | "emerald-luxury" | "arctic-minimalist";
export type RadiusType = "sm" | "lg" | "2xl" | "3xl" | "full";
export type WallpaperType = "grid" | "particles" | "mesh" | "custom";
export type ModeType = "light" | "dark" | "auto";

interface SettingsContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  mode: ModeType;
  setMode: (m: ModeType) => void;
  radius: RadiusType;
  setRadius: (r: RadiusType) => void;
  wallpaper: WallpaperType;
  setWallpaper: (w: WallpaperType) => void;
  customWallpaperUrl: string;
  setCustomWallpaperUrl: (url: string) => void;
  blurIntensity: number;
  setBlurIntensity: (val: number) => void;
  glowEnabled: boolean;
  setGlowEnabled: (val: boolean) => void;
  
  hotelInfo: {
    name: string;
    tagline: string;
    bp: string;
    phone: string;
    email: string;
    rccm: string;
    nif: string;
    bankName: string;
    bankAccount: string;
    checkPayee: string;
  };
}

const defaultSettings: SettingsContextType = {
  theme: "cyber-gold",
  setTheme: () => {},
  mode: "dark",
  setMode: () => {},
  radius: "2xl",
  setRadius: () => {},
  wallpaper: "grid",
  setWallpaper: () => {},
  customWallpaperUrl: "",
  setCustomWallpaperUrl: () => {},
  blurIntensity: 16,
  setBlurIntensity: () => {},
  glowEnabled: true,
  setGlowEnabled: () => {},
  hotelInfo: {
    name: "LE DAYA Guest House by LDJ",
    tagline: "Hébergements – Appartements hôtel – Restaurant - bar",
    bp: "BP 780 Port-Gentil / GABON",
    phone: "074.87.42.33",
    email: "ledayaguestpog@gmail.com",
    rccm: "RG/POG 2021 A 15358",
    nif: "319220 T",
    bankName: "ORABANK",
    bankAccount: "40021 02001 22873000201 Clé 63",
    checkPayee: "M. OGOWET OMBAGHO Didier Ulrich",
  },
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem("daya_theme") as ThemeType) || "cyber-gold");
  const [mode, setMode] = useState<ModeType>(() => (localStorage.getItem("daya_mode") as ModeType) || "dark");
  const [radius, setRadius] = useState<RadiusType>(() => (localStorage.getItem("daya_radius") as RadiusType) || "2xl");
  const [wallpaper, setWallpaper] = useState<WallpaperType>(() => (localStorage.getItem("daya_wallpaper") as WallpaperType) || "grid");
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string>(() => localStorage.getItem("daya_custom_wp") || "");
  const [blurIntensity, setBlurIntensity] = useState<number>(() => Number(localStorage.getItem("daya_blur") || 16));
  const [glowEnabled, setGlowEnabled] = useState<boolean>(() => localStorage.getItem("daya_glow") !== "false");

  useEffect(() => {
    localStorage.setItem("daya_theme", theme);
    localStorage.setItem("daya_mode", mode);
    localStorage.setItem("daya_radius", radius);
    localStorage.setItem("daya_wallpaper", wallpaper);
    localStorage.setItem("daya_custom_wp", customWallpaperUrl);
    localStorage.setItem("daya_blur", blurIntensity.toString());
    localStorage.setItem("daya_glow", glowEnabled.toString());

    const root = document.documentElement;
    root.classList.remove("dark", "light");

    if (mode === "auto") {
      const currentHour = new Date().getHours();
      if (currentHour >= 18 || currentHour < 6) {
        root.classList.add("dark");
      } else {
        root.classList.add("light");
      }
    } else {
      root.classList.add(mode);
    }

    root.setAttribute("data-theme", theme);
    root.setAttribute("data-radius", radius);
  }, [theme, mode, radius, wallpaper, customWallpaperUrl, blurIntensity, glowEnabled]);

  return (
    <SettingsContext.Provider
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
        hotelInfo: defaultSettings.hotelInfo,
      }}
    >
      <div className={`theme-${theme} w-full min-h-screen transition-colors duration-500`}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

