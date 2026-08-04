import { motion } from "framer-motion";
import { CalendarDays, CalendarRange, CalendarCheck, Wallet, PiggyBank, Receipt, AlertTriangle, TrendingUp } from "lucide-react";
import { inr } from "@/lib/format";

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ExpenseSummaryCards({ summary, compact = false }) {
  if (!summary) return null;

  const cards = [
    { key: "today", title: "Today", value: inr(summary.today), icon: CalendarDays, tint: "bg-[hsl(var(--primary))]/12", accent: "text-[hsl(var(--primary))]" },
    { key: "week", title: "This Week", value: inr(summary.week), icon: CalendarRange, tint: "bg-sky-500/10", accent: "text-sky-500" },
    { key: "month", title: "This Month", value: inr(summary.month), icon: CalendarCheck, tint: "bg-emerald-500/10", accent: "text-emerald-500" },
    { key: "budget", title: "Month Budget", value: inr(summary.budget), icon: Wallet, tint: "bg-[hsl(var(--energy))]/15", accent: "text-[hsl(var(--energy))]" },
    { key: "remaining", title: "Remaining", value: inr(summary.remaining), icon: PiggyBank, tint: summary.remaining < 0 ? "bg-[hsl(var(--destructive))]/10" : "bg-fuchsia-500/10", accent: summary.remaining < 0 ? "text-[hsl(var(--destructive))]" : "text-fuchsia-500" },
    { key: "entries", title: "Entries (Month)", value: summary.entries_month, icon: Receipt, tint: "bg-orange-500/10", accent: "text-orange-500" },
  ];

  const list = compact ? cards.slice(0, 4) : cards;

  return (
    <div>
      {summary.warn && (
        <div data-testid="budget-warning" className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border ${summary.over_budget ? "border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]" : "border-[hsl(var(--energy))]/40 bg-[hsl(var(--energy))]/10 text-foreground"}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">
            {summary.over_budget
              ? `You are over the monthly budget by ${inr(Math.abs(summary.remaining))}`
              : `Heads up — ${summary.utilization?.toFixed(0)}% of your budget is already used`}
          </span>
          {summary.budget > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs font-bold">
              <TrendingUp className="w-3 h-3" />
              {summary.utilization?.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-6"} gap-4`}
      >
        {list.map((c) => (
          <motion.div
            key={c.key}
            variants={item}
            data-testid={`expense-card-${c.key}`}
            className="rounded-2xl border border-border bg-card p-5 hover:border-foreground/25 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-9 h-9 rounded-lg ${c.tint} ${c.accent} flex items-center justify-center`}>
                <c.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {c.title}
              </span>
            </div>
            <div className="font-heading text-2xl font-bold leading-tight tabular-nums">
              {c.value}
            </div>
          </motion.div>
        ))}
      </motion.div>
      {summary.budget > 0 && !compact && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Budget Utilization</div>
            <div className="text-sm font-bold tabular-nums">
              {summary.utilization?.toFixed(1)}% <span className="text-muted-foreground text-xs font-normal">of {inr(summary.budget)}</span>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${summary.over_budget ? "bg-[hsl(var(--destructive))]" : summary.utilization > 80 ? "bg-[hsl(var(--energy))]" : "bg-[hsl(var(--primary))]"}`}
              style={{ width: `${Math.min(100, Math.max(0, summary.utilization || 0))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Avg daily: <span className="font-bold text-foreground">{inr(summary.avg_daily)}</span></span>
            <span>Remaining: <span className={`font-bold ${summary.remaining < 0 ? "text-[hsl(var(--destructive))]" : "text-foreground"}`}>{inr(summary.remaining)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
