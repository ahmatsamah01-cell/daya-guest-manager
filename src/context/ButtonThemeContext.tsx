import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ButtonThemeType = "default" | "glow" | "glass";

interface ButtonThemeContextType {
  buttonTheme: ButtonThemeType;
  setButtonTheme: (theme: ButtonThemeType) => void;
}

const ButtonThemeContext = createContext<ButtonThemeContextType | undefined>(undefined);

export function ButtonThemeProvider({ children }: { children: ReactNode }) {
  const [buttonTheme, setButtonThemeState] = useState<ButtonThemeType>("default");

  // Charger depuis le localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("buttonTheme") as ButtonThemeType | null;
      if (stored && ["default", "glow", "glass"].includes(stored)) {
        setButtonThemeState(stored);
      }
    } catch {
      // Ignorer les erreurs localStorage
    }
  }, []);

  // Sauvegarder dans le localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem("buttonTheme", buttonTheme);
    } catch {
      // Ignorer
    }
  }, [buttonTheme]);

  const setButtonTheme = (theme: ButtonThemeType) => {
    setButtonThemeState(theme);
  };

  return (
    <ButtonThemeContext.Provider value={{ buttonTheme, setButtonTheme }}>
      {children}
    </ButtonThemeContext.Provider>
  );
}

export function useButtonTheme() {
  const context = useContext(ButtonThemeContext);
  if (!context) {
    throw new Error("useButtonTheme must be used within a ButtonThemeProvider");
  }
  return context;
}
