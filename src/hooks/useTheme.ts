import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "midnight" | "forest" | "violet";

const STORAGE_KEY = "ghs-theme";
const ALL_CLASSES = ["dark", "theme-midnight", "theme-forest", "theme-violet"];

function readInitial(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (saved && ["light", "dark", "midnight", "forest", "violet"].includes(saved)) return saved;
  // Legacy fallback: use existing dark-mode flag if present
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  return "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  if (mode === "dark") root.classList.add("dark");
  else if (mode !== "light") root.classList.add(`theme-${mode}`);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readInitial());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    // Clear legacy keys so they don't override on next bootstrap
    localStorage.removeItem("ghs-dark-mode");
    localStorage.removeItem("ghs-dark-mode-manual");
    setThemeState(mode);
  }, []);

  return { theme, setTheme };
}
