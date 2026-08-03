import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CATEGORY_META, DEFAULT_META } from "@/lib/categoryMeta";

const KIND_COLOR = {
  spreadsheet: "hsl(var(--chart-1))",
  document: "hsl(var(--chart-3))",
  folder: "hsl(var(--chart-2))",
  dashboard: "hsl(var(--chart-4))",
};

const TAILWIND_TO_HEX = {
  "text-[hsl(var(--primary))]": "hsl(222 100% 55%)",
  "text-[hsl(var(--energy))]": "hsl(72 100% 50%)",
  "text-[hsl(var(--destructive))]": "hsl(4 90% 62%)",
  "text-emerald-500": "#10b981",
  "text-fuchsia-500": "#d946ef",
  "text-sky-500": "#0ea5e9",
  "text-orange-500": "#f97316",
};

const colorFor = (cat) => {
  const m = CATEGORY_META[cat] || DEFAULT_META;
  return TAILWIND_TO_HEX[m.accent] || "hsl(var(--muted-foreground))";
};

export default function StatsCharts({ stats }) {
  if (!stats) return null;
  const byCat = stats.by_category || [];
  const byKind = (stats.by_kind || []).map((k) => ({ ...k, name: k.name?.[0].toUpperCase() + k.name?.slice(1) }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Donut */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Distribution</div>
            <h3 className="font-heading text-xl font-bold mt-1">Resources by Category</h3>
          </div>
          <span className="text-xs text-muted-foreground">{byCat.length} groups</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCat}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="none"
                >
                  {byCat.map((entry, i) => (
                    <Cell key={i} fill={colorFor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {byCat.map((c) => {
              const total = byCat.reduce((s, x) => s + x.count, 0) || 1;
              const pct = Math.round((c.count / total) * 100);
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorFor(c.name) }} />
                  <span className="text-sm font-medium flex-1">{c.name}</span>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">{c.count} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">By Type</div>
          <h3 className="font-heading text-xl font-bold mt-1">Resource Kinds</h3>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byKind} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {byKind.map((k, i) => (
                  <Cell key={i} fill={KIND_COLOR[k.name?.toLowerCase()] || "hsl(var(--primary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
