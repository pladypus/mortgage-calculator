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

export function PaymentChart({ payment, theme: mode }: { payment: MonthlyPayment; theme: Theme }) {
  // Colour follows the part (fixed slot), never its rank, so hiding a zero slice repaints nothing.
  const slices = PARTS.map((p, i) => ({ ...p, value: payment[p.key], color: PALETTE[mode][i] }));
  const visible = slices.filter((s) => s.value > 0);

  return (
    <div className="chart">
      <div className="donut">
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
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
              itemStyle={{ color: "var(--text-primary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-total">{formatMoney(payment.total, 0)}</span>
          <span className="donut-caption">per month</span>
        </div>
      </div>

      <table className="legend">
        <caption className="sr-only">Monthly payment breakdown</caption>
        <tbody>
          {slices.map((s) => (
            <tr key={s.key} className={s.value > 0 ? "" : "muted"}>
              <th scope="row">
                <span className="swatch" style={{ background: s.color }} />
                {s.label}
              </th>
              <td>{formatMoney(s.value)}</td>
              <td className="pct">
                {payment.total > 0 ? `${((s.value / payment.total) * 100).toFixed(0)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
