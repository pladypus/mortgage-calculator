import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { caretAfterDigits, cleanNumberText, groupThousands, numberCharsBefore } from "./format";
import { fieldClass, fieldLabelClass, inputClass, inputWrapClass } from "./classes";

const affixClass = "whitespace-nowrap px-0.5 text-sm text-zinc-500 dark:text-zinc-400";

interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  /** Amount the Up/Down arrow keys add or subtract. */
  step?: number;
  /** Decimal places shown when the field isn't being edited. */
  decimals?: number;
  /** Thousands separators (1,234,567). Defaults to on for dollar fields. */
  grouping?: boolean;
  /** Small line under the input, e.g. where a default came from. */
  note?: ReactNode;
}

/**
 * A numeric text input. It keeps the user's own text while focused, so derived
 * updates (e.g. the linked down-payment $/% pair) never fight the cursor, and
 * for grouped fields re-inserts commas as they type without moving the caret.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  decimals = 0,
  grouping = prefix === "$",
  note,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  // Allow cents while typing a dollar amount even though it displays whole dollars.
  const typingDecimals = Math.max(decimals, 2);

  const format = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString("en-US", { maximumFractionDigits: decimals, useGrouping: grouping })
      : "";
  const shown = draft ?? format(value);

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  const commit = (n: number) => onChange(Number.isFinite(n) ? n : 0);

  return (
    <div className={fieldClass}>
      <label htmlFor={id} className={fieldLabelClass}>{label}</label>
      <div className={inputWrapClass}>
        {prefix && <span className={affixClass}>{prefix}</span>}
        <input
          ref={inputRef}
          className={inputClass}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={shown}
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const raw = e.target.value;
            const typedBeforeCaret = numberCharsBefore(raw, e.target.selectionStart ?? raw.length);
            const clean = cleanNumberText(raw, typingDecimals);
            const next = grouping ? groupThousands(clean) : clean;
            pendingCaret.current = caretAfterDigits(next, typedBeforeCaret);
            setDraft(next);
            commit(parseFloat(clean));
          }}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const n = Math.max(0, (Number.isFinite(value) ? value : 0) + (e.key === "ArrowUp" ? step : -step));
            setDraft(format(n));
            commit(n);
          }}
        />
        {suffix && <span className={affixClass}>{suffix}</span>}
      </div>
      {note && <p className="text-xs text-zinc-500 dark:text-zinc-400">{note}</p>}
    </div>
  );
}
