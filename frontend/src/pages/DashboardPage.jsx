import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, Zap, Wallet, ArrowRight } from "lucide-react";
import { Toaster, toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Hero from "@/components/Hero";
import KpiGrid from "@/components/KpiGrid";
import ResourceCard from "@/components/ResourceCard";
import CategoryFilter from "@/components/CategoryFilter";
import SearchBar from "@/components/SearchBar";
import StatsCharts from "@/components/StatsCharts";
import ActivityFeed from "@/components/ActivityFeed";
import ExpenseSummaryCards from "@/components/expenses/ExpenseSummaryCards";
import { fetchResources, fetchStats, fetchActivity, logActivity, toggleStar } from "@/lib/api";
import { expenseApi } from "@/lib/expenseApi";
import { useTheme } from "@/lib/theme";

export default function DashboardPage() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => location.state?.category || "All");
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);

  const load = async () => {
    try {
      const [r, s, a, es] = await Promise.all([
        fetchResources(),
        fetchStats(),
        fetchActivity(8),
        expenseApi.summary().catch(() => null),
      ]);
      setResources(r);
      setStats(s);
      setActivity(a);
      setExpenseSummary(es);
    } catch (e) {
      console.error(e);
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (location.state?.category) {
      setCategory(location.state.category);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const counts = useMemo(() => {
    const c = {};
    resources.forEach((r) => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resources, category, query]);

  const starredResources = useMemo(() => resources.filter((r) => r.starred).slice(0, 6), [resources]);

  const handleOpen = async (r) => {
    try {
      await logActivity(r.id, "opened");
      const [a, s] = await Promise.all([fetchActivity(8), fetchStats()]);
      setActivity(a);
      setStats(s);
    } catch (e) { /* silent */ }
  };

  const handleToggleStar = async (r) => {
    try {
      const updated = await toggleStar(r.id, !r.starred);
      setResources((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      const s = await fetchStats();
      setStats(s);
      toast.success(updated.starred ? "Starred" : "Removed star", { description: updated.title });
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleSelectCategory = (c) => {
    setCategory(c);
    setMobileNav(false);
    document.getElementById("resources-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div data-testid="dashboard-page" className="min-h-screen flex bg-background text-foreground">
      <Sidebar
        active={category}
        onSelect={handleSelectCategory}
        theme={theme}
        onToggleTheme={toggle}
        counts={counts}
      />

      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar
              active={category}
              onSelect={handleSelectCategory}
              theme={theme}
              onToggleTheme={toggle}
              counts={counts}
            />
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 glass glass-dark dark:glass-dark [.light_&]:glass-light border-b border-border">
          <div className="px-4 sm:px-8 h-16 flex items-center gap-3">
            <button
              data-testid="mobile-menu"
              className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Menu"
            >
              {mobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="lg:hidden flex items-center gap-2 mr-2">
              <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-heading font-black">Prathvi Power</span>
            </div>
            <div className="flex-1 max-w-2xl">
              <SearchBar value={query} onChange={setQuery} />
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System nominal
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-8 space-y-8 max-w-[1600px]">
          {/* Hero */}
          <Hero total={stats?.total_resources || 0} categories={stats?.categories || 0} />

          {/* Daily Expenses snapshot */}
          {expenseSummary && (
            <section data-testid="overview-expenses-snapshot">
              <div className="mb-4 flex items-end justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Finance</div>
                  <h2 className="font-heading text-2xl font-bold mt-1 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[hsl(var(--primary))]" />
                    Daily Expenses
                  </h2>
                </div>
                <button
                  data-testid="open-expenses-module"
                  onClick={() => navigate("/expenses")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[0.98] transition-transform"
                >
                  Open module <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <ExpenseSummaryCards summary={expenseSummary} compact />
            </section>
          )}

          {/* KPIs */}
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Snapshot</div>
                <h2 className="font-heading text-2xl font-bold mt-1">At a glance</h2>
              </div>
            </div>
            <KpiGrid stats={stats} />
          </section>

          {/* Charts + Activity */}
          <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-3">
              <StatsCharts stats={stats} />
            </div>
            <div className="xl:col-span-1">
              <ActivityFeed items={activity} />
            </div>
          </section>

          {/* Starred quick access */}
          {starredResources.length > 0 && (
            <section data-testid="starred-section">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Pinned</div>
                  <h2 className="font-heading text-2xl font-bold mt-1">Quick access</h2>
                </div>
                <span className="text-xs text-muted-foreground">{starredResources.length} starred</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {starredResources.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onOpen={handleOpen}
                    onToggleStar={handleToggleStar}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Resources */}
          <section id="resources-section">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Library</div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold mt-1">
                  {category === "All" ? "All resources" : category}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filtered.length} of {resources.length} · every asset one tap away
                </p>
              </div>
              <CategoryFilter active={category} onChange={setCategory} counts={counts} />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 h-52 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="font-heading font-bold text-lg">No matches</div>
                <p className="text-sm text-muted-foreground mt-1">Try a different search or category.</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.04 } } }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filtered.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onOpen={handleOpen}
                    onToggleStar={handleToggleStar}
                  />
                ))}
              </motion.div>
            )}
          </section>

          <footer className="pt-6 pb-10 border-t border-border flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <div>© 2026 Prathvi Power Solutions · Master Dashboard</div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All grid nodes reporting
            </div>
          </footer>
        </div>
      </main>

      <MobileBottomNav />

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
