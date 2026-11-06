import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Must match the key read by the inline script in index.html. */
const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSaved(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * The page theme: the browser's preference until the user toggles, after which
 * their explicit choice is saved and wins on later visits.
 */
export function useTheme() {
  const [system, setSystem] = useState<Theme>(() =>
    window.matchMedia(DARK_QUERY).matches ? "dark" : "light",
  );
  const [saved, setSaved] = useState<Theme | null>(readSaved);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (saved) root.dataset.theme = saved;
    else delete root.dataset.theme;
  }, [saved]);

  const theme = saved ?? system;
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode etc.): the toggle still works for this visit.
    }
  };

  return { theme, toggle };
}
