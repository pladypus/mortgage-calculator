export function formatMoney(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Typed characters that carry meaning in a number field (commas are display-only). */
const isNumberChar = (c: string) => (c >= "0" && c <= "9") || c === ".";

/**
 * Reduce raw field text to digits and at most one decimal point, with no more
 * than `decimals` fractional digits. A trailing point is kept mid-typing.
 */
export function cleanNumberText(text: string, decimals: number): string {
  let out = "";
  let seenPoint = false;
  let fraction = 0;
  for (const c of text) {
    if (c === ".") {
      if (decimals > 0 && !seenPoint) {
        seenPoint = true;
        out += c;
      }
    } else if (c >= "0" && c <= "9") {
      if (seenPoint) {
        if (fraction >= decimals) continue;
        fraction++;
      }
      out += c;
    }
  }
  return out;
}

/** Insert thousands separators into the integer part of already-clean text. */
export function groupThousands(clean: string): string {
  const point = clean.indexOf(".");
  const int = point === -1 ? clean : clean.slice(0, point);
  const rest = point === -1 ? "" : clean.slice(point);
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + rest;
}

/** Index in `shown` just after the `count`-th digit or point, so commas don't move the caret. */
export function caretAfterDigits(shown: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < shown.length; i++) {
    if (isNumberChar(shown[i]) && ++seen === count) return i + 1;
  }
  return shown.length;
}

/** How many digits/points precede `caret` in `text`. */
export function numberCharsBefore(text: string, caret: number): number {
  let n = 0;
  for (let i = 0; i < caret && i < text.length; i++) if (isNumberChar(text[i])) n++;
  return n;
}
