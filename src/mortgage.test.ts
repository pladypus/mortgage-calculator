import { describe, expect, it } from "vitest";
import { calculatePayment, type MortgageInputs } from "./mortgage";

const base: MortgageInputs = {
  homePrice: 400_000,
  downPaymentPercent: 20,
  annualRatePercent: 6.5,
  termYears: 30,
  propertyTaxPercent: 1,
  insurancePercent: 0.35,
  pmiPercent: 0.5,
  hoaMonthly: 0,
};

describe("calculatePayment", () => {
  it("computes standard amortized principal & interest", () => {
    // $320,000 at 6.5% for 30 years ≈ $2,022.62/mo
    const r = calculatePayment(base);
    expect(r.loanAmount).toBe(320_000);
    expect(r.principalAndInterest).toBeCloseTo(2022.62, 2);
  });

  it("derives monthly tax and insurance from home price", () => {
    const r = calculatePayment(base);
    expect(r.propertyTax).toBeCloseTo(4000 / 12, 6);
    expect(r.insurance).toBeCloseTo(1400 / 12, 6);
  });

  it("charges no PMI at 20% down or more", () => {
    expect(calculatePayment(base).pmi).toBe(0);
    expect(calculatePayment({ ...base, downPaymentPercent: 25 }).pmi).toBe(0);
  });

  it("charges PMI on the loan amount when down payment is under 20%", () => {
    const r = calculatePayment({ ...base, downPaymentPercent: 10 });
    // loan 360,000 * 0.5% / 12 = 150
    expect(r.pmi).toBeCloseTo(150, 6);
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
    const r = calculatePayment({ ...base, homePrice: NaN, hoaMonthly: -5 });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBe(0);
  });
});
