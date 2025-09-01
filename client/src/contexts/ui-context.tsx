import React, { createContext, useContext, useState, useEffect } from "react";

interface UIContextType {
  beginnerMode: boolean;
  setBeginnerMode: (value: boolean) => void;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [beginnerMode, setBeginnerModeState] = useState<boolean>(() => {
    return localStorage.getItem("beginnerMode") === "true";
  });
  
  const [currentTheme, setCurrentThemeState] = useState<string>(() => {
    return localStorage.getItem("appTheme") || "midnight";
  });

  const setBeginnerMode = (value: boolean) => {
    setBeginnerModeState(value);
    localStorage.setItem("beginnerMode", value.toString());
  };

  const setCurrentTheme = (theme: string) => {
    setCurrentThemeState(theme);
    localStorage.setItem("appTheme", theme);
    
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", isDark ? "midnight" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  // Initialize and handle theme changes
  useEffect(() => {
    if (currentTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", isDark ? "midnight" : "light");
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute("data-theme", e.matches ? "midnight" : "light");
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
  }, [currentTheme]);

  // Auto-set beginner mode for flower theme
  useEffect(() => {
    if (currentTheme === "flower") {
      setBeginnerMode(true);
    } else if ((currentTheme === "midnight" || currentTheme === "light") && beginnerMode) {
      setBeginnerMode(false);
    }
  }, [currentTheme, beginnerMode]);

  return (
    <UIContext.Provider value={{ 
      beginnerMode, 
      setBeginnerMode, 
      currentTheme, 
      setCurrentTheme 
    }}>
      <div className={beginnerMode ? "beginner-mode" : ""}>
        {children}
      </div>
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};

// Theme options
export const THEMES = [
  { id: "midnight", label: "Professional Dark", emoji: "🌙", description: "Dark professional theme" },
  { id: "light", label: "Professional Light", emoji: "☀️", description: "Clean light theme" },
  { id: "flower", label: "Flower Mode", emoji: "🌸", description: "Warm & welcoming for beginners" },
  { id: "cozy", label: "Cozy", emoji: "☕", description: "Warm earth tones" },
  { id: "high-contrast", label: "High Contrast", emoji: "♿", description: "Enhanced accessibility" },
  { id: "system", label: "Follow System", emoji: "💻", description: "Match device preference" },
] as const;