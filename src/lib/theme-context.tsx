"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type AdminTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AdminTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useAdminTheme() {
  return useContext(ThemeContext);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("admin_theme") as AdminTheme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("admin-light");
      document.body.classList.remove("admin-dark");
    } else {
      document.body.classList.add("admin-dark");
      document.body.classList.remove("admin-light");
    }
    localStorage.setItem("admin_theme", theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("admin-light", "admin-dark");
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
