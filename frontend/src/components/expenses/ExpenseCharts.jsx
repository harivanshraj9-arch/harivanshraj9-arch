import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { inr, shortInr } from "@/lib/format";
import { TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(222 100% 55%)", "hsl(4 90% 62%)", "hsl(42 100% 50%)", "#10b981",
  "#d946ef", "#0ea5e9", "#f97316", "#a855f7", "#14b8a6", "#eab308",
];

const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const dt = new Date(Number(y), Number(mo) - 1, 1);
  return dt.toLocaleString("en-US", { month: "short", year: "2-digit" });
};

const dayLabel = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("en-US", { day: "2-digit", month: "short" });
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export function MonthlyExpenseChart({ data = [] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ChartCard title="Monthly Expenses" subtitle={`Last ${data.length} months`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={shortInr} />
          <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => inr(v)} />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategoryPieChart({ data = [] }) {
  const totalAll = data.reduce((s, d) => s + d.total, 0);
  return (
    <ChartCard title="Category Breakdown" subtitle={`This month · ${inr(totalAll)}`}>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 text-xs">
            {data.slice(0, 8).map((d, i) => {
              const pct = totalAll ? ((d.total / totalAll) * 100).toFixed(0) : 0;
              return (
                <div key={d.category} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 font-medium">{d.category}</span>
                  <span className="tabular-nums text-muted-foreground">{pct}%</span>
                  <span className="tabular-nums font-bold w-16 text-right">{shortInr(d.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function WeeklyTrendChart({ data = [] }) {
  const chartData = data.map((d) => ({ ...d, label: dayLabel(d.date) }));
  return (
    <ChartCard title="Daily Trend" subtitle={`Last ${data.length} days`}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={shortInr} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(v)} />
          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCategories({ data = [] }) {
  const top = data.slice(0, 5);
  const max = top.reduce((m, d) => Math.max(m, d.total), 0) || 1;
  return (
    <ChartCard title="Top Spending Categories" subtitle="This month">
      {top.length === 0 ? <EmptyChart /> : (
        <ul data-testid="top-categories" className="space-y-3">
          {top.map((d, i) => (
            <li key={d.category}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="font-semibold">{d.category}</span>
                  <span className="text-muted-foreground text-xs">· {d.count}x</span>
                </span>
                <span className="font-bold tabular-nums">{inr(d.total)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full" style={{ background: COLORS[i % COLORS.length], width: `${(d.total / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

export function BudgetVsActual({ budget = 0, actual = 0 }) {
  const data = [{ name: "Budget", value: budget }, { name: "Actual", value: actual }];
  return (
    <ChartCard title="Budget vs Actual" subtitle={budget ? `${((actual / budget) * 100).toFixed(1)}% used` : "No budget set"}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={shortInr} />
          <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(v)} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            <Cell fill="hsl(var(--primary))" />
            <Cell fill={actual > budget && budget > 0 ? "hsl(var(--destructive))" : "hsl(var(--energy))"} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const ChartCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Analytics</div>
      <h3 className="font-heading text-lg font-bold mt-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const EmptyChart = () => (
  <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
    <TrendingUp className="w-5 h-5 opacity-40" />
    Add expenses to see analytics
  </div>
);
