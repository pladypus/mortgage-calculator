import { describe, expect, it } from "vitest";
import { isMarketRates, parsePmmsCsv, rateForTerm } from "./rates";

const CSV = `date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread
4/2/1971,7.33, ,,,,,,
10/29/2026,7.24,,6.6,,,,,
11/5/2026,7.18,,6.57,,,,,
`;

describe("parsePmmsCsv", () => {
  it("returns the latest week with both rates", () => {
    expect(parsePmmsCsv(CSV)).toEqual({ date: "2026-11-05", rate30: 7.18, rate15: 6.57 });
  });

  it("skips weeks missing a rate", () => {
    expect(parsePmmsCsv(`${CSV}11/12/2026,7.1,,,,,,,\n`)?.date).toBe("2026-11-05");
  });

  it("handles CRLF line endings", () => {
    expect(parsePmmsCsv(CSV.replace(/\n/g, "\r\n"))?.rate30).toBe(7.18);
  });

  it("rejects files that aren't the survey", () => {
    expect(parsePmmsCsv("<html>Not found</html>")).toBeNull();
    expect(parsePmmsCsv("date,pmms30,pmms15\n")).toBeNull();
  });
});

describe("isMarketRates", () => {
  it("accepts well-formed rates", () => {
    expect(isMarketRates({ date: "2026-11-05", rate30: 7.18, rate15: 6.57 })).toBe(true);
  });

  it("rejects malformed or implausible data", () => {
    expect(isMarketRates(null)).toBe(false);
    expect(isMarketRates({ date: "11/5/2026", rate30: 7.18, rate15: 6.57 })).toBe(false);
    expect(isMarketRates({ date: "2026-11-05", rate30: "7.18", rate15: 6.57 })).toBe(false);
    expect(isMarketRates({ date: "2026-11-05", rate30: 0, rate15: 6.57 })).toBe(false);
  });
});

describe("rateForTerm", () => {
  const rates = { date: "2026-11-05", rate30: 7.18, rate15: 6.57 };
  it.each([
    [30, 30, 7.18],
    [20, 15, 6.57],
    [15, 15, 6.57],
    [10, 15, 6.57],
  ])("%i-year loan uses the %i-year survey rate", (term, surveyTerm, rate) => {
    expect(rateForTerm(rates, term)).toEqual({ surveyTerm, rate });
  });
});
