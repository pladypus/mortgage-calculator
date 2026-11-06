export interface MortgageInputs {
  homePrice: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  termYears: number;
  propertyTaxYearly: number;
  insuranceYearly: number;
  pmiMonthly: number;
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

export type EstimatedCosts = Pick<MortgageInputs, "propertyTaxYearly" | "insuranceYearly" | "pmiMonthly">;

export const PMI_THRESHOLD_PERCENT = 20;

/** Rates used to estimate the advanced costs until the user enters their own amounts. */
export const ESTIMATE_RATES = {
  propertyTaxPercentOfPrice: 1,
  insurancePercentOfPrice: 0.35,
  pmiPercentOfLoan: 0.5,
} as const;

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function loanAmountFor(homePrice: number, downPaymentPercent: number) {
  const downPct = Math.min(safe(downPaymentPercent), 100);
  return safe(homePrice) * (1 - downPct / 100);
}

export function estimateCosts(
  homePrice: number,
  downPaymentPercent: number,
  /** The local effective rate when known, e.g. from the buyer's ZIP code. */
  propertyTaxPercent: number = ESTIMATE_RATES.propertyTaxPercentOfPrice,
): EstimatedCosts {
  const price = safe(homePrice);
  const loan = loanAmountFor(homePrice, downPaymentPercent);
  return {
    propertyTaxYearly: (price * propertyTaxPercent) / 100,
    insuranceYearly: (price * ESTIMATE_RATES.insurancePercentOfPrice) / 100,
    // Lenders drop PMI at 20% down; only the estimate applies that rule, so an
    // amount the user enters is always charged.
    pmiMonthly:
      safe(downPaymentPercent) < PMI_THRESHOLD_PERCENT
        ? (loan * ESTIMATE_RATES.pmiPercentOfLoan) / 100 / 12
        : 0,
  };
}

export function calculatePayment(inputs: MortgageInputs): MonthlyPayment {
  const loanAmount = loanAmountFor(inputs.homePrice, inputs.downPaymentPercent);
  const months = Math.round(safe(inputs.termYears) * 12);
  const r = safe(inputs.annualRatePercent) / 100 / 12;

  let principalAndInterest = 0;
  if (loanAmount > 0 && months > 0) {
    principalAndInterest =
      r === 0
        ? loanAmount / months
        : (loanAmount * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  }

  const propertyTax = safe(inputs.propertyTaxYearly) / 12;
  const insurance = safe(inputs.insuranceYearly) / 12;
  const pmi = safe(inputs.pmiMonthly);
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
