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
    document.documentElement.setAttribute("data-theme", theme);
  };

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, []);

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
  { id: "midnight", label: "Midnight", emoji: "🌙" },
  { id: "flower", label: "Flower Mode", emoji: "🌸" },
  { id: "cozy", label: "Cozy", emoji: "☕" },
  { id: "high-contrast", label: "High Contrast", emoji: "♿" },
] as const;