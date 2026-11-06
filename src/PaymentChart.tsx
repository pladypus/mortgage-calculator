import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MonthlyPayment } from "./mortgage";
import { formatMoney } from "./format";
import type { Theme } from "./theme";

// Validated categorical slots 1–5, stepped separately for light and dark surfaces.
const PALETTE = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
};
const SURFACE = { light: "#ffffff", dark: "#1a1a19" };

const PARTS = [
  { key: "principalAndInterest", label: "Principal & interest" },
  { key: "propertyTax", label: "Property tax" },
  { key: "insurance", label: "Homeowners insurance" },
  { key: "pmi", label: "PMI" },
  { key: "hoa", label: "HOA fees" },
] as const;

/** Every legend cell: padding, rule and size. */
const cell = "border-b border-line py-1.5 text-[0.92rem]";

export function PaymentChart({ payment, theme: mode }: { payment: MonthlyPayment; theme: Theme }) {
  // Colour follows the part (fixed slot), never its rank, so hiding a zero slice repaints nothing.
  const slices = PARTS.map((p, i) => ({ ...p, value: payment[p.key], color: PALETTE[mode][i] }));
  const visible = slices.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto aspect-square w-full max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke={SURFACE[mode]}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {visible.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(raw, name) => {
                const v = Number(raw);
                return [`${formatMoney(v)} (${((v / payment.total) * 100).toFixed(1)}%)`, name];
              }}
              contentStyle={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-line)",
                borderRadius: 8,
                color: "var(--color-fg)",
              }}
              itemStyle={{ color: "var(--color-fg)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-[1.4rem] font-bold tabular-nums">{formatMoney(payment.total, 0)}</span>
          <span className="text-[0.8rem] text-fg-muted">per month</span>
        </div>
      </div>

      <table className="w-full border-collapse tabular-nums">
        <caption className="sr-only">Monthly payment breakdown</caption>
        <tbody>
          {slices.map((s) => {
            // Zero parts stay listed but greyed out, since their slice is hidden.
            const muted = s.value <= 0;
            return (
              <tr key={s.key}>
                <th scope="row" className={`${cell} text-left font-normal ${muted ? "text-fg-muted" : "text-fg"}`}>
                  <span
                    className={`mr-2.5 inline-block size-2.5 rounded-[3px] align-baseline ${muted ? "opacity-35" : ""}`}
                    style={{ background: s.color }}
                  />
                  {s.label}
                </th>
                <td className={`${cell} text-right ${muted ? "text-fg-muted" : "text-fg"}`}>
                  {formatMoney(s.value)}
                </td>
                <td className={`${cell} w-14 text-right ${muted ? "text-fg-muted" : "text-fg-secondary"}`}>
                  {payment.total > 0 ? `${((s.value / payment.total) * 100).toFixed(0)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
