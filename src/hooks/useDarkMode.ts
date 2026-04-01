import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("ghs-dark-mode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ghs-dark-mode", JSON.stringify(isDark));
  }, [isDark]);

  const toggle = () => setIsDark((prev: boolean) => !prev);

  return { isDark, toggle };
}
