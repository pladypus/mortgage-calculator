import { useState } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  /** Decimal places shown when the field isn't being edited. */
  decimals?: number;
}

/**
 * A numeric input that keeps the user's raw text while focused, so derived
 * updates (e.g. the linked down-payment $/% pair) never fight the cursor.
 */
export function NumberField({ id, label, value, onChange, prefix, suffix, step = 1, decimals = 0 }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown =
    draft ??
    (Number.isFinite(value)
      ? value.toLocaleString("en-US", { maximumFractionDigits: decimals, useGrouping: false })
      : "");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={shown}
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
    </div>
  );
}
