import { useEffect, useMemo, useState, useCallback } from "react";
import { Menu, X, Zap, Wallet, TrendingUp } from "lucide-react";
import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import ExpenseSummaryCards from "@/components/expenses/ExpenseSummaryCards";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import BudgetManager from "@/components/expenses/BudgetManager";
import ExportBar from "@/components/expenses/ExportBar";
import {
  MonthlyExpenseChart, CategoryPieChart, WeeklyTrendChart,
  TopCategories, BudgetVsActual,
} from "@/components/expenses/ExpenseCharts";
import { expenseApi } from "@/lib/expenseApi";
import { useTheme } from "@/lib/theme";
import { inr } from "@/lib/format";

const PAGE_SIZE = 10;

const emptyFilters = {
  q: "", category: "All", payment_mode: "All", start: "", end: "",
  sort_by: "date", order: "desc", page: 0,
};

export default function ExpensesPage() {
  const { theme, toggle } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [categoryChart, setCategoryChart] = useState([]);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    const s = await expenseApi.summary();
    setSummary(s);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const [m, c, w] = await Promise.all([
      expenseApi.analyticsMonthly(6),
      expenseApi.analyticsCategory(),
      expenseApi.analyticsWeekly(14),
    ]);
    setMonthlyChart(m.data || []);
    setCategoryChart(c.data || []);
    setWeeklyChart(w.data || []);
  }, []);

  const loadRows = useCallback(async () => {
    const opts = {
      q: filters.q, category: filters.category, payment_mode: filters.payment_mode,
      start: filters.start, end: filters.end,
      sort_by: filters.sort_by, order: filters.order,
      limit: PAGE_SIZE, skip: filters.page * PAGE_SIZE,
    };
    const [list, countRes] = await Promise.all([
      expenseApi.list(opts),
      expenseApi.count(opts),
    ]);
    setRows(list);
    setTotal(countRes.total || 0);
  }, [filters]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadAnalytics(), loadRows()]);
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadAnalytics, loadRows]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const handleSaved = async () => {
    setEditing(null);
    await Promise.all([loadSummary(), loadAnalytics(), loadRows()]);
  };

  return (
    <div data-testid="expenses-page" className="min-h-screen flex bg-background text-foreground">
      <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="expenses" />

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="expenses" onClose={() => setMobileNav(false)} />
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 glass glass-dark dark:glass-dark [.light_&]:glass-light border-b border-border">
          <div className="px-4 sm:px-8 h-16 flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center" onClick={() => setMobileNav((v) => !v)}>
              {mobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-heading font-black">PPS</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Module</div>
              <div className="font-heading font-bold">Daily Expenses</div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Today</span>
              <span className="font-bold tabular-nums">{summary ? inr(summary.today) : "—"}</span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-8 space-y-8 max-w-[1600px]">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <div className="absolute inset-0 grid-lines opacity-20" />
            <div className="relative px-6 sm:px-10 py-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-bold uppercase tracking-wider">
                  <Wallet className="w-3 h-3" /> Finance
                </span>
                {summary?.budget > 0 && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                    ${summary.over_budget ? "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"
                      : summary.utilization > 80 ? "bg-[hsl(var(--energy))]/15 text-foreground"
                      : "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]"}`}>
                    <TrendingUp className="w-3 h-3" /> {summary.utilization.toFixed(0)}% used
                  </span>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-balance max-w-2xl">
                Daily Expense <span className="text-[hsl(var(--primary))]">Command Center</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
                Track every rupee — from fuel and food to salaries and utilities.
                Set budgets, see live analytics and export whenever you need.
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <ExpenseSummaryCards summary={summary} />

          {/* Form + Budget */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ExpenseForm
                editing={editing}
                onSaved={handleSaved}
                onCancel={() => setEditing(null)}
              />
            </div>
            <div>
              <BudgetManager summary={summary} onSaved={loadSummary} />
            </div>
          </section>

          {/* Analytics */}
          <section className="space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Insights</div>
              <h2 className="font-heading text-2xl font-bold mt-1">Reports &amp; Analytics</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MonthlyExpenseChart data={monthlyChart} />
              <CategoryPieChart data={categoryChart} />
              <WeeklyTrendChart data={weeklyChart} />
              <div className="grid grid-cols-1 gap-4">
                <TopCategories data={categoryChart} />
                <BudgetVsActual budget={summary?.budget || 0} actual={summary?.month || 0} />
              </div>
            </div>
          </section>

          {/* History */}
          <section id="history" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Records</div>
                <h2 className="font-heading text-2xl font-bold mt-1">Expense History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg daily this month: <span className="font-bold text-foreground">{summary ? inr(summary.avg_daily) : "—"}</span>
                </p>
              </div>
              <ExportBar filters={filters} rows={rows} summary={summary} onRestored={refreshAll} />
            </div>

            <ExpenseFilters filters={filters} setFilters={setFilters} />

            <ExpenseTable
              rows={rows}
              total={total}
              page={filters.page}
              pageSize={PAGE_SIZE}
              sortBy={filters.sort_by}
              order={filters.order}
              onSortChange={(sort_by, order) => setFilters((f) => ({ ...f, sort_by, order, page: 0 }))}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              onEdit={(r) => { setEditing(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onChanged={handleSaved}
            />
          </section>

          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">
            © 2026 Prathvi Power Solutions · Daily Expenses Module
          </footer>
        </div>
      </main>

      <Toaster
        position="top-right"
        theme={theme}
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
    </div>
  );
}
