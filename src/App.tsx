import { useState } from "react";
import { NumberField } from "./NumberField";
import { PaymentChart } from "./PaymentChart";
import {
  calculatePayment,
  estimateCosts,
  ESTIMATE_RATES,
  PMI_THRESHOLD_PERCENT,
  type EstimatedCosts,
  type MortgageInputs,
} from "./mortgage";
import { formatMoney } from "./format";
import { useTheme } from "./theme";
import { ThemeToggle } from "./ThemeToggle";

const TERMS = [30, 20, 15, 10];

type FormState = Omit<MortgageInputs, keyof EstimatedCosts>;

const DEFAULTS: FormState = {
  homePrice: 400_000,
  downPaymentPercent: 20,
  annualRatePercent: 6.5,
  termYears: 30,
  hoaMonthly: 0,
};

const ESTIMATE_NOTES: Record<keyof EstimatedCosts, string> = {
  propertyTaxYearly: `Estimated at ${ESTIMATE_RATES.propertyTaxPercentOfPrice}% of price`,
  insuranceYearly: `Estimated at ${ESTIMATE_RATES.insurancePercentOfPrice}% of price`,
  pmiMonthly: `Estimated at ${ESTIMATE_RATES.pmiPercentOfLoan}% of loan per year`,
};

export default function App() {
  const { theme, toggle } = useTheme();
  const [inputs, setInputs] = useState<FormState>(DEFAULTS);
  // Dollar amounts the user typed. A cost without one follows its percentage estimate,
  // so it keeps up with price and down-payment changes until the user takes it over.
  const [overrides, setOverrides] = useState<Partial<EstimatedCosts>>({});
  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const estimates = estimateCosts(inputs.homePrice, inputs.downPaymentPercent);
  const costs: EstimatedCosts = { ...estimates, ...overrides };

  const pmiEstimateIsZero = inputs.downPaymentPercent >= PMI_THRESHOLD_PERCENT;
  const estimateNote = (key: keyof EstimatedCosts) =>
    key === "pmiMonthly" && pmiEstimateIsZero
      ? `Estimated $0: lenders drop PMI at ${PMI_THRESHOLD_PERCENT}%+ down`
      : ESTIMATE_NOTES[key];

  // A typed amount is always used as-is and never changed automatically.
  const costField = (key: keyof EstimatedCosts) => ({
    value: costs[key],
    onChange: (v: number) => setOverrides((prev) => ({ ...prev, [key]: v })),
    note:
      overrides[key] === undefined ? (
        estimateNote(key)
      ) : (
        <>
          Your amount ·{" "}
          <button
            type="button"
            className="link-button"
            onClick={() =>
              setOverrides(({ [key]: _dropped, ...rest }) => rest)
            }
          >
            use estimate ({formatMoney(estimates[key], 0)})
          </button>
        </>
      ),
  });

  const payment = calculatePayment({ ...inputs, ...costs });
  // The percent is the source of truth, so changing the price keeps the same down-payment share.
  const downPaymentDollars = (inputs.homePrice * inputs.downPaymentPercent) / 100;

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Mortgage calculator</h1>
          <p className="subtitle">Estimate your monthly payment. Results update as you type.</p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      <div className="card">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <NumberField id="price" label="Home price" prefix="$" value={inputs.homePrice} onChange={set("homePrice")} step={1000} />

          <div className="field-pair">
            <NumberField
              id="down-dollars"
              label="Down payment"
              prefix="$"
              value={downPaymentDollars}
              step={1000}
              onChange={(d) =>
                set("downPaymentPercent")(inputs.homePrice > 0 ? (d / inputs.homePrice) * 100 : 0)
              }
            />
            <NumberField
              id="down-percent"
              label="Down payment %"
              suffix="%"
              decimals={2}
              step={1}
              value={inputs.downPaymentPercent}
              onChange={set("downPaymentPercent")}
            />
          </div>

          <div className="field-pair">
            <NumberField id="rate" label="Interest rate" suffix="%" decimals={3} step={0.125} value={inputs.annualRatePercent} onChange={set("annualRatePercent")} />
            <div className="field">
              <label htmlFor="term">Loan term</label>
              <div className="input-wrap">
                <select id="term" value={inputs.termYears} onChange={(e) => set("termYears")(Number(e.target.value))}>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{t} years</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <details className="advanced">
            <summary>Advanced options</summary>
            <p className="hint">Amounts start as typical estimates. Enter your own to replace them.</p>
            <div className="field-pair">
              <NumberField id="tax" label="Property tax" prefix="$" suffix="/yr" step={100} {...costField("propertyTaxYearly")} />
              <NumberField id="insurance" label="Homeowners insurance" prefix="$" suffix="/yr" step={100} {...costField("insuranceYearly")} />
            </div>
            <div className="field-pair">
              <NumberField id="pmi" label="PMI" prefix="$" suffix="/mo" step={10} {...costField("pmiMonthly")} />
              <NumberField id="hoa" label="HOA fees" prefix="$" suffix="/mo" step={25} value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
            </div>
          </details>

          <button type="button" className="reset" onClick={() => { setInputs(DEFAULTS); setOverrides({}); }}>Reset to defaults</button>
        </form>

        <section className="results" aria-live="polite">
          <p className="results-label">Estimated monthly payment</p>
          <p className="results-total">{formatMoney(payment.total)}</p>
          <p className="results-loan">Loan amount {formatMoney(payment.loanAmount, 0)}</p>
          <PaymentChart payment={payment} theme={theme} />
        </section>
      </div>

      <footer>
        Estimates only. Your actual payment depends on your lender, location and credit.
        {' · '}
        <a href="https://github.com/pladypus/mortgage-calculator">Source on GitHub</a>
      </footer>
    </main>
  );
}
