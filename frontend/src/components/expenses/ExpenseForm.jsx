import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, X, Paperclip, Trash2 } from "lucide-react";
import { expenseApi } from "@/lib/expenseApi";
import { todayISO } from "@/lib/format";

const DEFAULT_CATEGORIES = ["Food", "Fuel", "Travel", "Office", "Electricity", "Salary", "Shopping", "Medical", "Miscellaneous"];
const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Card"];

const empty = () => ({
  date: todayISO(),
  category: "Food",
  amount: "",
  payment_mode: "Cash",
  description: "",
  attachment: null,
  attachment_name: null,
});

export default function ExpenseForm({ editing, onSaved, onCancel, categories = DEFAULT_CATEGORIES }) {
  const [form, setForm] = useState(empty);
  const [customCat, setCustomCat] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        date: editing.date,
        category: editing.category,
        amount: String(editing.amount),
        payment_mode: editing.payment_mode,
        description: editing.description || "",
        attachment: editing.attachment || null,
        attachment_name: editing.attachment_name || null,
      });
      setCustomCat(!categories.includes(editing.category));
    } else {
      setForm(empty());
      setCustomCat(false);
    }
  }, [editing, categories]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("attachment", reader.result);
      set("attachment_name", file.name);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!form.date) return "Date is required";
    if (!form.category?.trim()) return "Category is required";
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return "Amount must be a positive number";
    if (!PAYMENT_MODES.includes(form.payment_mode)) return "Invalid payment mode";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        category: form.category.trim().slice(0, 60),
        amount: parseFloat(form.amount),
        payment_mode: form.payment_mode,
        description: (form.description || "").trim(),
        attachment: form.attachment,
        attachment_name: form.attachment_name,
      };
      let saved;
      if (editing) {
        saved = await expenseApi.update(editing.id, payload);
        toast.success("Expense updated");
      } else {
        saved = await expenseApi.create(payload);
        toast.success("Expense added");
      }
      setForm(empty());
      setCustomCat(false);
      onSaved?.(saved);
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form data-testid="expense-form" onSubmit={submit} className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
            {editing ? "Edit" : "New Entry"}
          </div>
          <h3 className="font-heading text-xl font-bold mt-1">
            {editing ? "Update expense" : "Add expense"}
          </h3>
        </div>
        {editing && (
          <button type="button" onClick={onCancel} data-testid="expense-form-cancel"
            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <input
            data-testid="expense-input-date"
            type="date" value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <Label>Category</Label>
          {customCat ? (
            <div className="flex gap-2">
              <input
                data-testid="expense-input-custom-category"
                type="text" placeholder="Custom category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              />
              <button type="button" onClick={() => { setCustomCat(false); set("category", categories[0]); }}
                className="text-xs px-3 rounded-lg border border-border hover:bg-muted">Preset</button>
            </div>
          ) : (
            <select
              data-testid="expense-input-category"
              value={form.category}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setCustomCat(true);
                  set("category", "");
                } else {
                  set("category", e.target.value);
                }
              }}
              className={inputCls}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">➕ Custom…</option>
            </select>
          )}
        </div>

        <div>
          <Label>Amount (₹)</Label>
          <input
            data-testid="expense-input-amount"
            type="number" step="0.01" min="0" inputMode="decimal"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>

        <div>
          <Label>Payment Mode</Label>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted">
            {PAYMENT_MODES.map((m) => (
              <button
                type="button"
                key={m}
                data-testid={`expense-payment-${m.toLowerCase()}`}
                onClick={() => set("payment_mode", m)}
                className={`text-xs font-semibold py-1.5 rounded-md transition-colors
                  ${form.payment_mode === m ? "bg-background shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label>Description / Remarks</Label>
          <textarea
            data-testid="expense-input-description"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional notes"
            className={`${inputCls} resize-y min-h-[64px]`}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Attachment (optional, max 2 MB)</Label>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer border border-dashed border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span className="truncate">{form.attachment_name || "Choose bill or image…"}</span>
              <input data-testid="expense-input-file" type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
            </label>
            {form.attachment && (
              <button type="button" onClick={() => { set("attachment", null); set("attachment_name", null); }}
                className="w-9 h-9 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center" title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          data-testid="expense-form-save"
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50 hover:scale-[0.98] transition-transform"
        >
          <Save className="w-4 h-4" />
          {editing ? "Update" : "Save"} Expense
        </button>
        <button
          type="button"
          onClick={() => { setForm(empty()); setCustomCat(false); onCancel?.(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

const Label = ({ children }) => (
  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
    {children}
  </label>
);

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] transition-colors";
