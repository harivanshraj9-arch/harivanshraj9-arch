import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { inr } from "@/lib/format";
import { expenseApi } from "@/lib/expenseApi";

const PAYMENT_STYLES = {
  Cash: "bg-emerald-500/10 text-emerald-500",
  UPI: "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]",
  Bank: "bg-sky-500/10 text-sky-500",
  Card: "bg-fuchsia-500/10 text-fuchsia-500",
};

export default function ExpenseTable({
  rows = [], total = 0, page, pageSize, sortBy, order,
  onSortChange, onPageChange, onEdit, onChanged,
}) {
  const [confirmId, setConfirmId] = useState(null);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, page * pageSize + rows.length);

  const handleDelete = async (id) => {
    try {
      await expenseApi.remove(id);
      toast.success("Expense deleted");
      onChanged?.();
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setConfirmId(null);
    }
  };

  const SortHeader = ({ label, field, testid }) => {
    const active = sortBy === field;
    return (
      <button
        type="button"
        data-testid={testid}
        onClick={() => onSortChange(field, active && order === "desc" ? "asc" : "desc")}
        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors
          ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        {active && (order === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    );
  };

  return (
    <div data-testid="expense-table" className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3"><SortHeader label="Date" field="date" testid="sort-date" /></th>
              <th className="text-left px-4 py-3"><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Category</span></th>
              <th className="text-right px-4 py-3"><SortHeader label="Amount" field="amount" testid="sort-amount" /></th>
              <th className="text-left px-4 py-3"><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mode</span></th>
              <th className="text-left px-4 py-3"><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span></th>
              <th className="text-right px-4 py-3"><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No expenses found. Add your first one from the form above.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} data-testid={`expense-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-sm font-medium">{r.date}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs font-semibold">
                    {r.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">{inr(r.amount)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${PAYMENT_STYLES[r.payment_mode] || "bg-muted"}`}>
                    {r.payment_mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground max-w-[280px]">
                  <div className="flex items-center gap-2">
                    {r.attachment && (
                      <a href={r.attachment} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-[hsl(var(--primary))] hover:underline" title={r.attachment_name}>
                        <Paperclip className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="truncate">{r.description || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      data-testid={`edit-${r.id}`}
                      onClick={() => onEdit?.(r)}
                      className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      data-testid={`delete-${r.id}`}
                      onClick={() => setConfirmId(r.id)}
                      className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No expenses found.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground">{r.date}</div>
                <div className="mt-0.5 font-semibold">{r.category}</div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">{inr(r.amount)}</div>
                <span className={`inline-flex mt-1 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_STYLES[r.payment_mode] || "bg-muted"}`}>
                  {r.payment_mode}
                </span>
              </div>
            </div>
            {r.description && <div className="mt-2 text-sm text-muted-foreground">{r.description}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => onEdit?.(r)} className="px-3 py-1 text-xs rounded-full border border-border hover:bg-muted">Edit</button>
              <button onClick={() => setConfirmId(r.id)} className="px-3 py-1 text-xs rounded-full border border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground">
          {total === 0 ? "0 results" : `Showing ${start}–${end} of ${total}`}
        </div>
        <div className="flex items-center gap-1">
          <button
            data-testid="page-prev"
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="w-8 h-8 rounded-md border border-border hover:bg-muted disabled:opacity-40 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2">
            {page + 1} / {pages}
          </span>
          <button
            data-testid="page-next"
            disabled={page + 1 >= pages}
            onClick={() => onPageChange(page + 1)}
            className="w-8 h-8 rounded-md border border-border hover:bg-muted disabled:opacity-40 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-testid="delete-confirm">
          <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6">
            <div className="w-11 h-11 rounded-full bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-lg font-bold">Delete this expense?</h4>
            <p className="text-sm text-muted-foreground mt-1">This action cannot be undone.</p>
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setConfirmId(null)} className="px-4 py-1.5 rounded-full border border-border text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                data-testid="delete-confirm-btn"
                onClick={() => handleDelete(confirmId)}
                className="px-4 py-1.5 rounded-full bg-[hsl(var(--destructive))] text-white text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
