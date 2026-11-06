/**
 * National-average mortgage rates from Freddie Mac's weekly Primary Mortgage
 * Market Survey (PMMS). The build fetches the survey into `public/rates.json`,
 * because Freddie Mac's CSV can't be read cross-origin from the browser.
 *
 * Kept free of imports so `scripts/fetch-rates.ts` can run it directly in Node.
 */
export interface MarketRates {
  /** Survey week as an ISO date (YYYY-MM-DD). */
  date: string;
  rate30: number;
  rate15: number;
}

export const PMMS_CSV_URL = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv";

const isPlausibleRate = (n: number) => Number.isFinite(n) && n > 0 && n < 30;

/** Turn the survey's M/D/YYYY dates into YYYY-MM-DD. */
function isoDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, month, day, year] = m;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * The most recent week in the PMMS history CSV that has both a 30- and a
 * 15-year rate, or null if the file doesn't look like the survey.
 */
export function parsePmmsCsv(csv: string): MarketRates | null {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((h) => h.trim()) ?? [];
  const col = { date: header.indexOf("date"), rate30: header.indexOf("pmms30"), rate15: header.indexOf("pmms15") };
  if (Object.values(col).some((i) => i < 0)) return null;

  let latest: MarketRates | null = null;
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const date = isoDate(cells[col.date] ?? "");
    const rate30 = parseFloat(cells[col.rate30] ?? "");
    const rate15 = parseFloat(cells[col.rate15] ?? "");
    if (!date || !isPlausibleRate(rate30) || !isPlausibleRate(rate15)) continue;
    if (!latest || date > latest.date) latest = { date, rate30, rate15 };
  }
  return latest;
}

/** Validate `rates.json` as loaded by the page. */
export function isMarketRates(data: unknown): data is MarketRates {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
    typeof d.rate30 === "number" &&
    isPlausibleRate(d.rate30) &&
    typeof d.rate15 === "number" &&
    isPlausibleRate(d.rate15)
  );
}

/**
 * The survey only covers 30- and 15-year loans, so other terms use whichever
 * is closer (20 and 10 years → 15-year rate).
 */
export function rateForTerm(rates: MarketRates, termYears: number) {
  const useThirty = Math.abs(termYears - 30) < Math.abs(termYears - 15);
  return { surveyTerm: useThirty ? 30 : 15, rate: useThirty ? rates.rate30 : rates.rate15 };
}
