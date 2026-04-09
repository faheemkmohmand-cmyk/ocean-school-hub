import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("ghs-dark-mode");
    const manualOverride = localStorage.getItem("ghs-dark-mode-manual");

    if (manualOverride !== null) {
      return JSON.parse(manualOverride);
    }

    const now = new Date();
    const utc5Hours = new Date(now.getTime() + (5 * 60 * 60 * 1000)).getHours();
    const isDarkSchedule = utc5Hours >= 18 || utc5Hours < 6;

    return saved ? JSON.parse(saved) : isDarkSchedule;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem("ghs-dark-mode", JSON.stringify(newValue));
      localStorage.setItem("ghs-dark-mode-manual", JSON.stringify(newValue));
      return newValue;
    });
  };

  const resetToSchedule = () => {
    localStorage.removeItem("ghs-dark-mode-manual");
    const now = new Date();
    const utc5Hours = new Date(now.getTime() + (5 * 60 * 60 * 1000)).getHours();
    const isDarkSchedule = utc5Hours >= 18 || utc5Hours < 6;
    setIsDark(isDarkSchedule);
  };

  return { isDark, toggle, resetToSchedule };
}
