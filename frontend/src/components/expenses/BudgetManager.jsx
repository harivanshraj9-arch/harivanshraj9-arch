import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Wallet, Save } from "lucide-react";
import { inr } from "@/lib/format";
import { expenseApi } from "@/lib/expenseApi";

export default function BudgetManager({ summary, onSaved }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (summary?.budget) setAmount(String(summary.budget));
  }, [summary?.budget]);

  const save = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    setSaving(true);
    try {
      await expenseApi.setBudget(val);
      toast.success("Budget updated");
      onSaved?.();
    } catch (e2) {
      toast.error("Failed to update budget");
    } finally {
      setSaving(false);
    }
  };

  const utilization = summary?.utilization || 0;
  const over = summary?.over_budget;

  return (
    <form data-testid="budget-manager" onSubmit={save} className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))] flex items-center justify-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Budget</div>
          <h3 className="font-heading text-lg font-bold">Monthly Budget</h3>
        </div>
      </div>

      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        Budget for {summary?.month_key || "this month"} (₹)
      </label>
      <div className="flex gap-2">
        <input
          data-testid="budget-input"
          type="number" step="0.01" min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50000"
          className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        />
        <button
          data-testid="budget-save"
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save
        </button>
      </div>

      {summary?.budget > 0 && (
        <div className="mt-5">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${over ? "bg-[hsl(var(--destructive))]" : utilization > 80 ? "bg-[hsl(var(--energy))]" : "bg-[hsl(var(--primary))]"}`}
              style={{ width: `${Math.min(100, Math.max(0, utilization))}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <StatBlock label="Used" value={inr(summary?.month || 0)} />
            <StatBlock label="Remaining" value={inr(summary?.remaining || 0)} accent={summary?.remaining < 0 ? "text-[hsl(var(--destructive))]" : ""} />
            <StatBlock label="Utilization" value={`${utilization.toFixed(1)}%`} accent={over ? "text-[hsl(var(--destructive))]" : ""} />
          </div>
        </div>
      )}
    </form>
  );
}

const StatBlock = ({ label, value, accent = "" }) => (
  <div className="rounded-lg bg-muted p-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
    <div className={`text-sm font-bold tabular-nums mt-0.5 ${accent}`}>{value}</div>
  </div>
);
