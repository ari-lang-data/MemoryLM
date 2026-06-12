import { useState, useEffect } from "react";

const THEMES = ["dark", "midnight", "sepia", "light"];
const STORAGE_KEY = "memorylm_theme";

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(t) {
    if (THEMES.includes(t)) setThemeState(t);
  }

  return { theme, setTheme, themes: THEMES };
}