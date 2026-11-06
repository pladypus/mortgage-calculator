import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
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
import { fieldClass, fieldLabelClass, fieldPairClass, inputClass, inputWrapClass } from "./classes";

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
            className="cursor-pointer text-sky-600 underline underline-offset-2"
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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mortgage calculator</h1>
          <p className="mt-1 mb-6 text-zinc-600 dark:text-zinc-300">Estimate your monthly payment. Results update as you type.</p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      <div className="grid grid-cols-1 gap-8 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:grid-cols-2 md:p-6">
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <NumberField id="price" label="Home price" prefix="$" value={inputs.homePrice} onChange={set("homePrice")} step={1000} />

          <div className={fieldPairClass}>
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

          <div className={fieldPairClass}>
            <NumberField id="rate" label="Interest rate" suffix="%" decimals={3} step={0.125} value={inputs.annualRatePercent} onChange={set("annualRatePercent")} />
            <div className={fieldClass}>
              <label htmlFor="term" className={fieldLabelClass}>Loan term</label>
              <div className={inputWrapClass}>
                {/* A transparent <select> makes the native option list fall back to a white
                    background while inheriting dark-mode text, so give both explicit colours. */}
                <select
                  id="term"
                  className={`${inputClass} cursor-pointer bg-white dark:bg-zinc-900 *:bg-white dark:*:bg-zinc-900 *:text-zinc-900 dark:*:text-zinc-100`}
                  value={inputs.termYears}
                  onChange={(e) => set("termYears")(Number(e.target.value))}
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{t} years</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <details className="group border-t border-zinc-300 dark:border-zinc-800 pt-3">
            <summary className="cursor-pointer font-semibold text-zinc-600 dark:text-zinc-300 group-open:mb-3">Advanced options</summary>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Amounts start as typical estimates. Enter your own to replace them.</p>
            <div className={`${fieldPairClass} mb-3`}>
              <NumberField id="tax" label="Property tax" prefix="$" suffix="/yr" step={100} {...costField("propertyTaxYearly")} />
              <NumberField id="insurance" label="Homeowners insurance" prefix="$" suffix="/yr" step={100} {...costField("insuranceYearly")} />
            </div>
            <div className={`${fieldPairClass} mb-3`}>
              <NumberField id="pmi" label="PMI" prefix="$" suffix="/mo" step={10} {...costField("pmiMonthly")} />
              <NumberField id="hoa" label="HOA fees" prefix="$" suffix="/mo" step={25} value={inputs.hoaMonthly} onChange={set("hoaMonthly")} />
            </div>
          </details>

          <button
            type="button"
            className="cursor-pointer self-start rounded-lg border border-zinc-300 dark:border-zinc-800 px-3.5 py-2 text-zinc-600 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() => { setInputs(DEFAULTS); setOverrides({}); }}
          >
            Reset to defaults
          </button>
        </form>

        <section className="min-w-0" aria-live="polite">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Estimated monthly payment</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{formatMoney(payment.total)}</p>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">Loan amount {formatMoney(payment.loanAmount, 0)}</p>
          <PaymentChart payment={payment} theme={theme} />
        </section>
      </div>

      <footer className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <p>Estimates only. Your actual payment depends on your lender, location and credit.</p>
        <p className="mt-2">
          <a
            href="https://github.com/pladypus/mortgage-calculator"
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <FontAwesomeIcon icon={faGithub} aria-hidden="true" className="mr-1.5" />Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
