import { Search, X, Filter } from "lucide-react";

const CATEGORIES = ["All", "Food", "Fuel", "Travel", "Office", "Electricity", "Salary", "Shopping", "Medical", "Miscellaneous"];
const MODES = ["All", "Cash", "UPI", "Bank", "Card"];

export default function ExpenseFilters({ filters, setFilters, categories = CATEGORIES }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 0 }));

  return (
    <div data-testid="expense-filters" className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Filters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            data-testid="expense-search"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search description, category, mode…"
            className="w-full h-10 pl-9 pr-9 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
          {filters.q && (
            <button onClick={() => set("q", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted hover:bg-secondary flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select data-testid="filter-category" value={filters.category} onChange={(e) => set("category", e.target.value)}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </select>

        <select data-testid="filter-mode" value={filters.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          {MODES.map((m) => <option key={m} value={m}>{m === "All" ? "All Modes" : m}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            data-testid="filter-start"
            type="date" value={filters.start} onChange={(e) => set("start", e.target.value)}
            className="h-10 px-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
          <input
            data-testid="filter-end"
            type="date" value={filters.end} onChange={(e) => set("end", e.target.value)}
            className="h-10 px-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
        </div>
      </div>
      {(filters.q || filters.category !== "All" || filters.payment_mode !== "All" || filters.start || filters.end) && (
        <button
          data-testid="filter-reset"
          onClick={() => setFilters({ ...filters, q: "", category: "All", payment_mode: "All", start: "", end: "", page: 0 })}
          className="mt-3 text-xs px-3 py-1 rounded-full border border-border hover:bg-muted"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
