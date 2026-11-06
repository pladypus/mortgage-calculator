import { describe, expect, it } from "vitest";
import { calculatePayment, estimateCosts, type MortgageInputs } from "./mortgage";

const base: MortgageInputs = {
  homePrice: 400_000,
  downPaymentPercent: 20,
  annualRatePercent: 6.5,
  termYears: 30,
  propertyTaxYearly: 4_000,
  insuranceYearly: 1_400,
  pmiMonthly: 150,
  hoaMonthly: 0,
};

describe("calculatePayment", () => {
  it("computes standard amortized principal & interest", () => {
    // $320,000 at 6.5% for 30 years ≈ $2,022.62/mo
    const r = calculatePayment(base);
    expect(r.loanAmount).toBe(320_000);
    expect(r.principalAndInterest).toBeCloseTo(2022.62, 2);
  });

  it("spreads yearly tax and insurance dollars across 12 months", () => {
    const r = calculatePayment(base);
    expect(r.propertyTax).toBeCloseTo(4000 / 12, 6);
    expect(r.insurance).toBeCloseTo(1400 / 12, 6);
  });

  it("charges whatever monthly PMI it is given, at any down payment", () => {
    // The 20% rule lives in the estimate; an amount the user entered is always charged.
    expect(calculatePayment({ ...base, downPaymentPercent: 10 }).pmi).toBe(150);
    expect(calculatePayment({ ...base, downPaymentPercent: 25 }).pmi).toBe(150);
    expect(calculatePayment({ ...base, pmiMonthly: 0 }).pmi).toBe(0);
  });

  it("handles a 0% interest rate", () => {
    const r = calculatePayment({ ...base, annualRatePercent: 0 });
    expect(r.principalAndInterest).toBeCloseTo(320_000 / 360, 6);
  });

  it("sums every part into the total, including HOA", () => {
    const r = calculatePayment({ ...base, downPaymentPercent: 10, hoaMonthly: 250 });
    expect(r.total).toBeCloseTo(
      r.principalAndInterest + r.propertyTax + r.insurance + r.pmi + 250,
      6,
    );
  });

  it("returns zero principal & interest when the home is fully paid in cash", () => {
    const r = calculatePayment({ ...base, downPaymentPercent: 100 });
    expect(r.loanAmount).toBe(0);
    expect(r.principalAndInterest).toBe(0);
  });

  it("treats negative or non-finite inputs as zero rather than producing NaN", () => {
    const r = calculatePayment({
      ...base,
      homePrice: NaN,
      propertyTaxYearly: -1,
      insuranceYearly: NaN,
      pmiMonthly: -10,
      hoaMonthly: -5,
    });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBe(0);
  });
});

describe("estimateCosts", () => {
  it("estimates tax at 1% and insurance at 0.35% of price per year", () => {
    const e = estimateCosts(400_000, 20);
    expect(e.propertyTaxYearly).toBeCloseTo(4_000, 6);
    expect(e.insuranceYearly).toBeCloseTo(1_400, 6);
  });

  it("uses a local property-tax rate when given one", () => {
    expect(estimateCosts(400_000, 20, 1.58).propertyTaxYearly).toBeCloseTo(6_320, 6);
  });

  it("estimates PMI at 0.5% of the loan per year, as a monthly amount", () => {
    // loan 360,000 * 0.5% / 12 = 150
    expect(estimateCosts(400_000, 10).pmiMonthly).toBeCloseTo(150, 6);
  });

  it("estimates no PMI at 20% down or more", () => {
    expect(estimateCosts(400_000, 20).pmiMonthly).toBe(0);
    expect(estimateCosts(400_000, 35).pmiMonthly).toBe(0);
    expect(estimateCosts(400_000, 19.99).pmiMonthly).toBeGreaterThan(0);
  });

  it("returns zeros for unusable inputs", () => {
    expect(estimateCosts(NaN, 20)).toEqual({ propertyTaxYearly: 0, insuranceYearly: 0, pmiMonthly: 0 });
  });
});
