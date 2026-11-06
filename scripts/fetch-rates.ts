// Download Freddie Mac's latest national-average rates into public/rates.json,
// which the page loads at startup. Run in CI before `npm run build`; exits
// non-zero (and writes nothing) if the survey can't be fetched or parsed.
import { writeFile } from "node:fs/promises";
import { parsePmmsCsv, PMMS_CSV_URL } from "../src/rates.ts";

const OUT = new URL("../public/rates.json", import.meta.url);

const res = await fetch(PMMS_CSV_URL, { signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`Fetching ${PMMS_CSV_URL} failed: HTTP ${res.status}`);

const rates = parsePmmsCsv(await res.text());
if (!rates) throw new Error(`${PMMS_CSV_URL} didn't contain any usable rates`);

await writeFile(OUT, `${JSON.stringify(rates, null, 2)}\n`);
console.log(`Wrote rates for week of ${rates.date}: 30-yr ${rates.rate30}%, 15-yr ${rates.rate15}%`);
