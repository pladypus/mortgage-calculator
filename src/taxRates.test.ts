import { describe, expect, it } from "vitest";
import { buildTaxRates, isTaxRatesFile, readZctaColumns, taxRateForZip, type AreaFigures } from "./taxRates";

const area = (overrides: Partial<AreaFigures> = {}): AreaFigures => ({
  ownerHomes: 1_000,
  totalTax: 2_000_000,
  totalTaxMoe: 100_000,
  totalValue: 100_000_000,
  totalValueMoe: 5_000_000,
  ...overrides,
});

describe("readZctaColumns", () => {
  const dat = [
    "GEO_ID|B25090_E001|B25090_M001",
    "0100000US|123|-555555555",
    "860Z200US07030|114952400|7977876",
    "860Z200US00601|0|-222222222",
    "",
  ].join("\n");

  it("reads the requested columns for ZIP areas only, keeping leading zeros", () => {
    const rows = readZctaColumns(dat, ["B25090_M001", "B25090_E001"]);
    expect([...rows]).toEqual([
      ["07030", [7977876, 114952400]],
      ["00601", [-222222222, 0]],
    ]);
  });

  it("fails loudly if the file layout changes", () => {
    expect(() => readZctaColumns(dat, ["B25090_E002"])).toThrow(/B25090_E002/);
  });
});

describe("buildTaxRates", () => {
  it("divides total tax by total value", () => {
    const rates = buildTaxRates("test", new Map([["07078", area({ totalTax: 125_389_900, totalValue: 7_947_407_000 })]]));
    expect(rates.zips["07078"]).toBe(1.58);
  });

  it("leaves out ZIPs with too few homes or too wide a margin of error", () => {
    const rates = buildTaxRates(
      "test",
      new Map([
        ["10001", area({ ownerHomes: 20 })],
        ["10002", area({ totalTaxMoe: 1_500_000 })],
        ["10003", area({ totalValueMoe: -222_222_222 })],
        ["10004", area({ totalValueMoe: -555_555_555 })],
      ]),
    );
    expect(Object.keys(rates.zips)).toEqual(["10004"]);
  });

  it("leaves out implausible rates", () => {
    const rates = buildTaxRates("test", new Map([["10001", area({ totalTax: 10_000_000 })]]));
    expect(rates.zips).toEqual({});
  });

  it("pools every ZIP with figures into its 3-digit prefix", () => {
    const rates = buildTaxRates(
      "test",
      new Map([
        ["10001", area({ totalTax: 1_000_000, totalValue: 100_000_000 })],
        ["10002", area({ ownerHomes: 10, totalTax: 3_000_000, totalValue: 100_000_000 })],
        ["10003", area({ totalTax: -666_666_666 })],
        ["11201", area()],
      ]),
    );
    expect(rates.prefixes).toEqual({ "100": 2, "112": 2 });
  });
});

describe("taxRateForZip", () => {
  const rates = { source: "test", zips: { "07030": 1.13 }, prefixes: { "070": 2.05 } };

  it("uses the ZIP's own rate when there is one", () => {
    expect(taxRateForZip(rates, "07030")).toEqual({ percent: 1.13, area: "07030" });
  });

  it("falls back to the 3-digit prefix", () => {
    expect(taxRateForZip(rates, "07099")).toEqual({ percent: 2.05, area: "070xx" });
  });

  it("returns null for unknown or incomplete ZIPs", () => {
    expect(taxRateForZip(rates, "99999")).toBeNull();
    expect(taxRateForZip(rates, "0703")).toBeNull();
  });
});

describe("isTaxRatesFile", () => {
  it("checks the file's shape", () => {
    expect(isTaxRatesFile({ source: "x", zips: {}, prefixes: {} })).toBe(true);
    expect(isTaxRatesFile({ zips: {} })).toBe(false);
    expect(isTaxRatesFile("nope")).toBe(false);
  });
});
