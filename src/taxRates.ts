/**
 * Effective property-tax rates by ZIP code, from the Census Bureau's American
 * Community Survey (ACS) 5-year estimates: the total real estate tax that
 * homeowners in an area pay divided by the total value of their homes.
 *
 * Totals are used rather than medians because the ACS caps the median tax at
 * "$10,000+", which makes high-tax areas look cheap.
 *
 * `scripts/build-tax-rates.ts` turns the ACS files into `public/tax-rates.json`.
 * Kept free of imports so that script can run it directly in Node.
 */
export interface TaxRatesFile {
  /** Which survey the rates came from, e.g. "ACS 2020–2024". */
  source: string;
  /** Effective rate, as a percent of value, by 5-digit ZIP. */
  zips: Record<string, number>;
  /** Pooled rate for each 3-digit ZIP prefix, for ZIPs with too little data. */
  prefixes: Record<string, number>;
}

export interface AreaFigures {
  ownerHomes: number;
  totalTax: number;
  totalTaxMoe: number;
  totalValue: number;
  totalValueMoe: number;
}

/** ACS jam value: the estimate is controlled, so it has no sampling error. */
const CONTROLLED_MOE = -555555555;
const MIN_OWNER_HOMES = 50;
const MAX_RELATIVE_MOE = 0.5;
const isPlausibleRate = (percent: number) => percent >= 0.05 && percent <= 5;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Read an ACS table-based summary file (pipe-delimited, one row per area) into
 * the requested columns for each ZIP Code Tabulation Area.
 */
export function readZctaColumns(dat: string, columns: string[]): Map<string, number[]> {
  const lines = dat.split(/\r?\n/);
  const header = lines[0].split("|");
  const indexes = columns.map((c) => {
    const i = header.indexOf(c);
    if (i < 0) throw new Error(`Column ${c} not in ${header.slice(0, 4).join("|")}…`);
    return i;
  });
  const out = new Map<string, number[]>();
  for (const line of lines.slice(1)) {
    const m = /^860Z200US(\d{5})\|/.exec(line);
    if (!m) continue;
    const cells = line.split("|");
    out.set(m[1], indexes.map((i) => Number(cells[i])));
  }
  return out;
}

function isReliable(f: AreaFigures) {
  const moeOk = (moe: number, estimate: number) =>
    moe === CONTROLLED_MOE || (moe >= 0 && moe / estimate <= MAX_RELATIVE_MOE);
  return (
    f.ownerHomes >= MIN_OWNER_HOMES &&
    moeOk(f.totalTaxMoe, f.totalTax) &&
    moeOk(f.totalValueMoe, f.totalValue)
  );
}

export function buildTaxRates(source: string, areas: Map<string, AreaFigures>): TaxRatesFile {
  const zips: Record<string, number> = {};
  const pooled = new Map<string, { tax: number; value: number }>();

  for (const [zip, f] of [...areas].sort(([a], [b]) => a.localeCompare(b))) {
    // Negative figures are ACS codes for "no estimate".
    if (!(f.totalTax > 0 && f.totalValue > 0)) continue;
    const percent = (f.totalTax / f.totalValue) * 100;
    if (isReliable(f) && isPlausibleRate(percent)) zips[zip] = round2(percent);

    const prefix = zip.slice(0, 3);
    const p = pooled.get(prefix) ?? { tax: 0, value: 0 };
    pooled.set(prefix, { tax: p.tax + f.totalTax, value: p.value + f.totalValue });
  }

  const prefixes: Record<string, number> = {};
  for (const [prefix, p] of pooled) {
    const percent = (p.tax / p.value) * 100;
    if (isPlausibleRate(percent)) prefixes[prefix] = round2(percent);
  }
  return { source, zips, prefixes };
}

export interface ZipTaxRate {
  percent: number;
  /** What the rate describes: the ZIP itself, or its 3-digit prefix ("070xx"). */
  area: string;
}

export function taxRateForZip(rates: TaxRatesFile, zip: string): ZipTaxRate | null {
  if (!/^\d{5}$/.test(zip)) return null;
  if (zip in rates.zips) return { percent: rates.zips[zip], area: zip };
  const prefix = zip.slice(0, 3);
  if (prefix in rates.prefixes) return { percent: rates.prefixes[prefix], area: `${prefix}xx` };
  return null;
}

export function isTaxRatesFile(data: unknown): data is TaxRatesFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.source === "string" &&
    typeof d.zips === "object" && d.zips !== null &&
    typeof d.prefixes === "object" && d.prefixes !== null
  );
}
