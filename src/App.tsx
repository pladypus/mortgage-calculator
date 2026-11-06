import { useMemo, useState } from "react";
import { NumberField } from "./NumberField";
import { PaymentChart } from "./PaymentChart";
import { calculatePayment, PMI_THRESHOLD_PERCENT, type MortgageInputs } from "./mortgage";
import { formatMoney } from "./format";

const TERMS = [30, 20, 15, 10];

const DEFAULTS: MortgageInputs = {
  homePrice: 400_000,
  downPaymentPercent: 20,
  annualRatePercent: 6.5,
  termYears: 30,
  propertyTaxPercent: 1,
  insurancePercent: 0.35,
  pmiPercent: 0.5,
  hoaMonthly: 0,
};

export default function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULTS);
  const set = <K extends keyof MortgageInputs>(key: K) => (value: MortgageInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const payment = useMemo(() => calculatePayment(inputs), [inputs]);
  // The percent is the source of truth, so changing the price keeps the same down-payment share.
  const downPaymentDollars = (inputs.homePrice * inputs.downPaymentPercent) / 100;
  const pmiApplies = inputs.downPaymentPercent < PMI_THRESHOLD_PERCENT;

  return (
    <main className="page">
      <header>
        <h1>Mortgage calculator</h1>
        <p className="subtitle">Estimate your monthly payment. Results update as you type.</p>
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
            <p className="hint">Defaults are typical estimates. Change them to match your situation.</p>
            <div className="field-pair">
              <NumberField id="tax" label="Property tax (yearly)" suffix="% of price" decimals={3} step={0.05} value={inputs.propertyTaxPercent} onChange={set("propertyTaxPercent")} />
              <NumberField id="insurance" label="Insurance (yearly)" suffix="% of price" decimals={3} step={0.05} value={inputs.insurancePercent} onChange={set("insurancePercent")} />
            </div>
            <div className="field-pair">
              <NumberField id="pmi" label="PMI (yearly)" suffix="% of loan" decimals={3} step={0.05} value={inputs.pmiPercent} onChange={set("pmiPercent")} />
              <NumberField id="hoa" label="HOA fees" prefix="$" suffix="/mo" step={25} value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
            </div>
            <p className="hint">
              {pmiApplies
                ? `PMI applies because the down payment is under ${PMI_THRESHOLD_PERCENT}%.`
                : `No PMI: the down payment is ${PMI_THRESHOLD_PERCENT}% or more.`}
            </p>
          </details>

          <button type="button" className="reset" onClick={() => setInputs(DEFAULTS)}>Reset to defaults</button>
        </form>

        <section className="results" aria-live="polite">
          <p className="results-label">Estimated monthly payment</p>
          <p className="results-total">{formatMoney(payment.total)}</p>
          <p className="results-loan">Loan amount {formatMoney(payment.loanAmount, 0)}</p>
          <PaymentChart payment={payment} />
        </section>
      </div>

      <footer>Estimates only. Your actual payment depends on your lender, location and credit.</footer>
    </main>
  );
}
