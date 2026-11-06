import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import type { Theme } from "./theme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface-2 text-fg-secondary hover:border-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/* Sun in dark mode (switches to light), moon in light mode (switches to dark). */}
      <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} aria-hidden="true" className="text-[18px]" />
    </button>
  );
}
