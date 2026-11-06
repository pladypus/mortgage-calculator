import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import type { Theme } from "./theme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/* Sun in dark mode (switches to light), moon in light mode (switches to dark). */}
      <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} aria-hidden="true" className="text-lg" />
    </button>
  );
}
