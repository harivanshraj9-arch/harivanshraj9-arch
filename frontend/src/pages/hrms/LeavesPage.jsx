import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Send, Calendar } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";

const STATUS_STYLES = {
  Pending: "bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]",
  Approved: "bg-emerald-500/10 text-emerald-500",
  Rejected: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function LeavesPage() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [filters, setFilters] = useState({ status: "All", type: "All" });
  const [balance, setBalance] = useState(null);
  const [balanceEmp, setBalanceEmp] = useState("");

  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", type: "Casual",
    from_date: "", to_date: "", reason: "",
  });

  const load = async () => {
    const [leaves, emps, l] = await Promise.all([
      hrmsApi.listLeaves(filters),
      hrmsApi.listEmployees({ status: "Active", limit: 5000 }),
      lookups ? Promise.resolve(lookups) : hrmsApi.lookups(),
    ]);
    setRows(leaves.items);
    setEmployees(emps.items);
    if (!lookups) setLookups(l);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.status, filters.type]);

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  const apply = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.from_date || !form.to_date) {
      toast.error("Employee, from-date and to-date are required"); return;
    }
    try {
      await hrmsApi.applyLeave(form);
      toast.success("Leave applied");
      setShowApply(false);
      setForm({ employee_id: "", type: "Casual", from_date: "", to_date: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail?.[0]?.msg || "Apply failed");
    }
  };

  const decide = async (id, status) => {
    if (status === "Rejected" && !window.confirm("Reject this leave?")) return;
    try {
      await hrmsApi.decideLeave(id, status);
      toast.success(status);
      load();
    } catch { toast.error("Update failed"); }
  };

  const loadBalance = async (empId) => {
    setBalanceEmp(empId);
    if (!empId) { setBalance(null); return; }
    try { setBalance(await hrmsApi.balance(empId)); }
    catch { toast.error("Failed"); }
  };

  return (
    <HrmsLayout title="Leave Management" subtitle="Apply, approve and track leave balances">
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <select data-testid="leave-filter-status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="All">All Statuses</option>
          {(lookups?.leave_statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select data-testid="leave-filter-type" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="All">All Types</option>
          {(lookups?.leave_types || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        <button data-testid="leave-apply-btn" onClick={() => setShowApply(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
          <Send className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Balance</div>
            <h3 className="font-heading text-lg font-bold">Leave balance for</h3>
          </div>
          <select data-testid="balance-employee" value={balanceEmp} onChange={e => loadBalance(e.target.value)}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
            <option value="">— Select employee —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.emp_code} · {e.name}</option>)}
          </select>
        </div>
        {balance && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(balance.balance).map(([type, rem]) => (
              <div key={type} className="rounded-lg bg-muted p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{type}</div>
                <div className="text-lg font-bold tabular-nums">{rem}</div>
                <div className="text-[10px] text-muted-foreground">used {balance.used[type] || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaves table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <Th>Employee</Th><Th>Type</Th><Th>From</Th><Th>To</Th><Th>Days</Th>
                <Th>Reason</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No leaves found</td></tr>
              )}
              {rows.map(l => {
                const emp = empMap[l.employee_id];
                return (
                  <tr key={l.id} data-testid={`leave-row-${l.id}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{emp?.name || "Unknown"}</div>
                      <div className="text-[11px] text-muted-foreground">{emp?.emp_code}</div>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold">{l.type}</td>
                    <td className="px-3 py-2 text-xs">{l.from_date}</td>
                    <td className="px-3 py-2 text-xs">{l.to_date}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{l.days}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={l.reason}>{l.reason || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[l.status] || "bg-muted"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.status === "Pending" && (
                        <div className="flex justify-end gap-1">
                          <button data-testid={`approve-${l.id}`} onClick={() => decide(l.id, "Approved")}
                            className="w-8 h-8 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500 inline-flex items-center justify-center" title="Approve">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button data-testid={`reject-${l.id}`} onClick={() => decide(l.id, "Rejected")}
                            className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center" title="Reject">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={apply} className="w-full max-w-lg rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Apply Leave</h3>
              <button type="button" onClick={() => setShowApply(false)} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2 block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Employee</span>
                <select data-testid="apply-employee" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                  <option value="">— Select —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.emp_code} · {e.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</span>
                <select data-testid="apply-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                  {(lookups?.leave_types || []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <div />
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">From</span>
                <input data-testid="apply-from" type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">To</span>
                <input data-testid="apply-to" type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
              </label>
              <label className="sm:col-span-2 block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason</span>
                <textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowApply(false)} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
              <button data-testid="apply-submit" type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
                <Send className="w-4 h-4" /> Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </HrmsLayout>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);
