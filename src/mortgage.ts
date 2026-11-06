export interface MortgageInputs {
  homePrice: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  termYears: number;
  /** Annual property tax as a percent of home price. */
  propertyTaxPercent: number;
  /** Annual homeowners insurance as a percent of home price. */
  insurancePercent: number;
  /** Annual PMI as a percent of the loan amount; only charged under 20% down. */
  pmiPercent: number;
  hoaMonthly: number;
}

export interface MonthlyPayment {
  loanAmount: number;
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  hoa: number;
  total: number;
}

export const PMI_THRESHOLD_PERCENT = 20;

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function calculatePayment(inputs: MortgageInputs): MonthlyPayment {
  const price = safe(inputs.homePrice);
  const downPct = Math.min(safe(inputs.downPaymentPercent), 100);
  const loanAmount = price * (1 - downPct / 100);
  const months = Math.round(safe(inputs.termYears) * 12);
  const r = safe(inputs.annualRatePercent) / 100 / 12;

  let principalAndInterest = 0;
  if (loanAmount > 0 && months > 0) {
    principalAndInterest =
      r === 0
        ? loanAmount / months
        : (loanAmount * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  }

  const propertyTax = (price * safe(inputs.propertyTaxPercent)) / 100 / 12;
  const insurance = (price * safe(inputs.insurancePercent)) / 100 / 12;
  const pmi =
    downPct < PMI_THRESHOLD_PERCENT
      ? (loanAmount * safe(inputs.pmiPercent)) / 100 / 12
      : 0;
  const hoa = safe(inputs.hoaMonthly);

  return {
    loanAmount,
    principalAndInterest,
    propertyTax,
    insurance,
    pmi,
    hoa,
    total: principalAndInterest + propertyTax + insurance + pmi + hoa,
  };
}
