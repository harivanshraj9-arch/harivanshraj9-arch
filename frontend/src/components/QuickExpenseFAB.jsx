import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";

const CATEGORIES = ["Food", "Fuel", "Travel", "Office", "Electricity", "Salary", "Shopping", "Medical", "Miscellaneous"];
const MODES = ["Cash", "UPI", "Bank", "Card"];
const LAST_KEY = "pps_quick_expense_last";

/**
 * Global floating "+" button available on every public page.
 * Tapping opens a compact 3-field form (Amount, Category, Payment mode).
 * Remembers last used category + mode for one-tap repeat entry.
 * Hidden on /admin and /expenses (already has its own form).
 */
export default function QuickExpenseFAB() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(() => {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      return {
        amount: "",
        category: last?.category || "Fuel",
        payment_mode: last?.payment_mode || "UPI",
        description: "",
      };
    } catch {
      return { amount: "", category: "Fuel", payment_mode: "UPI", description: "" };
    }
  });

  // Hidden on admin routes and (redundant on) /expenses
  if (location.pathname.startsWith("/admin") || location.pathname === "/expenses") return null;

  const submit = async (e) => {
    e?.preventDefault();
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    setBusy(true);
    try {
      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          amount: amt,
          category: f.category,
          payment_mode: f.payment_mode,
          description: f.description.trim(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      localStorage.setItem(LAST_KEY, JSON.stringify({ category: f.category, payment_mode: f.payment_mode }));
      toast.success(`₹${amt.toFixed(2)} logged`);
      setF((s) => ({ ...s, amount: "", description: "" }));
      setOpen(false);
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating button - lg has small right-lower, mobile has above bottom nav */}
      <button
        data-testid="fab-quick-expense"
        onClick={() => setOpen(true)}
        aria-label="Log expense"
        className="lg:hidden fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-[hsl(var(--primary))] text-white shadow-2xl shadow-[hsl(var(--primary))]/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
      <button
        data-testid="fab-quick-expense-desktop"
        onClick={() => setOpen(true)}
        aria-label="Log expense"
        className="hidden lg:flex fixed right-6 bottom-6 z-40 h-12 pl-4 pr-5 rounded-full bg-[hsl(var(--primary))] text-white shadow-2xl shadow-[hsl(var(--primary))]/30 items-center gap-2 hover:brightness-110 active:scale-95 transition"
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-semibold">Quick Expense</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={submit}
            className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Quick Log</div>
                <h3 className="font-heading text-lg font-black">Add Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Amount */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Amount (₹)</label>
                <input
                  data-testid="fab-amount"
                  autoFocus
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  value={f.amount}
                  onChange={(e) => setF((s) => ({ ...s, amount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 w-full h-14 px-4 rounded-xl bg-background border border-border text-2xl font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              {/* Category chips */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Category</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setF((s) => ({ ...s, category: c }))}
                      className={`px-3 h-9 rounded-full text-xs font-semibold ${
                        f.category === c
                          ? "bg-foreground text-background"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Payment Mode</label>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setF((s) => ({ ...s, payment_mode: m }))}
                      className={`h-10 rounded-lg text-xs font-semibold ${
                        f.payment_mode === m
                          ? "bg-foreground text-background"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Note (optional)</label>
                <input
                  value={f.description}
                  onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Where / why"
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                data-testid="fab-save"
                type="submit"
                disabled={busy || !f.amount}
                className="w-full h-12 rounded-xl bg-foreground text-background font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Log Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
