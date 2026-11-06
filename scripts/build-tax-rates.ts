// Build public/tax-rates.json from the Census Bureau's ACS 5-year summary files.
// The bulk files need no API key, unlike the Census API.
//
//   node scripts/build-tax-rates.ts                 # newest published survey
//   node scripts/build-tax-rates.ts 2024            # the 2020–2024 survey
//   node scripts/build-tax-rates.ts --latest-year   # just print the newest year
//
// The deploy workflow caches the output by survey year, so the ~60 MB download
// only happens when the Census Bureau publishes a new survey (each December).
// Exits non-zero and writes nothing if the files can't be fetched or read.
import { writeFile } from "node:fs/promises";
import { buildTaxRates, readZctaColumns, type AreaFigures } from "../src/taxRates.ts";

const OUT = new URL("../public/tax-rates.json", import.meta.url);
const TIMEOUT_MS = 300_000;

const tableUrl = (year: number, table: string) =>
  `https://www2.census.gov/programs-surveys/acs/summary_file/${year}/table-based-SF/data/5YRData/acsdt5y${year}-${table}.dat`;

/** The end year of the newest 5-year survey whose files are published. */
async function latestYear() {
  const thisYear = new Date().getFullYear();
  for (let year = thisYear; year >= thisYear - 4; year--) {
    const res = await fetch(tableUrl(year, "b25090"), { method: "HEAD", signal: AbortSignal.timeout(30_000) });
    if (res.ok) return year;
    if (res.status !== 404) throw new Error(`Checking for the ${year} survey failed: HTTP ${res.status}`);
  }
  throw new Error(`No ACS 5-year survey found for ${thisYear - 4}–${thisYear}`);
}

async function table(year: number, name: string, columns: string[]) {
  const url = tableUrl(year, name);
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Fetching ${url} failed: HTTP ${res.status}`);
  return readZctaColumns(await res.text(), columns);
}

async function build(year: number) {
  const [owners, taxes, values] = await Promise.all([
    table(year, "b25003", ["B25003_E002"]), // Owner-occupied housing units
    table(year, "b25090", ["B25090_E001", "B25090_M001"]), // Aggregate real estate taxes paid
    table(year, "b25082", ["B25082_E001", "B25082_M001"]), // Aggregate value of owner-occupied homes
  ]);

  const areas = new Map<string, AreaFigures>();
  for (const [zip, [totalTax, totalTaxMoe]] of taxes) {
    const value = values.get(zip);
    if (!value) continue;
    areas.set(zip, {
      ownerHomes: owners.get(zip)?.[0] ?? 0,
      totalTax,
      totalTaxMoe,
      totalValue: value[0],
      totalValueMoe: value[1],
    });
  }

  const rates = buildTaxRates(`ACS ${year - 4}–${year}`, areas);
  await writeFile(OUT, `${JSON.stringify(rates)}\n`);
  console.log(
    `Wrote ${rates.source}: ${Object.keys(rates.zips).length} ZIPs and ` +
      `${Object.keys(rates.prefixes).length} prefixes (${areas.size} ZIPs in the survey)`,
  );
}

const arg = process.argv[2];
if (arg === "--latest-year") {
  console.log(await latestYear());
} else if (arg === undefined) {
  await build(await latestYear());
} else if (/^\d{4}$/.test(arg)) {
  await build(Number(arg));
} else {
  throw new Error(`Unknown argument ${arg}. Pass a survey end year, --latest-year, or nothing.`);
}
