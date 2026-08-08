import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Save, Trash2, Download, Calendar as CalIcon } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";
import { todayISO, monthISO } from "@/lib/format";

const STATUS_STYLES = {
  Present: "bg-emerald-500/10 text-emerald-500",
  Absent: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  "Half Day": "bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]",
  Leave: "bg-sky-500/10 text-sky-500",
  "Weekly Off": "bg-muted text-muted-foreground",
  Holiday: "bg-fuchsia-500/10 text-fuchsia-500",
};

const CELL_ABBR = {
  Present: "P", Absent: "A", "Half Day": "H", Leave: "L",
  "Weekly Off": "WO", Holiday: "HO",
};

export default function AttendancePage() {
  const [view, setView] = useState("daily"); // daily | register
  const [dailyDate, setDailyDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [employees, setEmployees] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [dailyRows, setDailyRows] = useState({}); // emp_id -> row
  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    const l = await hrmsApi.lookups();
    const { items } = await hrmsApi.listEmployees({ status: "Active", limit: 5000 });
    setLookups(l);
    setEmployees(items);
    // initialize dailyRows
    const map = {};
    items.forEach(e => { map[e.id] = { employee_id: e.id, date: dailyDate, status: "Present", check_in: "", check_out: "", remarks: "" }; });
    setDailyRows(map);
  };

  const loadExisting = async (dateISO) => {
    const { items } = await hrmsApi.listAttendance({ start: dateISO, end: dateISO, limit: 5000 });
    setDailyRows(prev => {
      const next = { ...prev };
      items.forEach(a => {
        if (next[a.employee_id]) next[a.employee_id] = { ...next[a.employee_id], ...a };
      });
      return next;
    });
  };

  const loadRegister = async () => {
    const r = await hrmsApi.register(month);
    setRegister(r);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadEmployees();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (employees.length && view === "daily") {
      // reset then load
      const map = {};
      employees.forEach(e => { map[e.id] = { employee_id: e.id, date: dailyDate, status: "Present", check_in: "", check_out: "", remarks: "" }; });
      setDailyRows(map);
      loadExisting(dailyDate);
    }
    // eslint-disable-next-line
  }, [dailyDate, employees.length, view]);

  useEffect(() => {
    if (view === "register") loadRegister();
    // eslint-disable-next-line
  }, [view, month]);

  const setRow = (empId, patch) => {
    setDailyRows(prev => ({ ...prev, [empId]: { ...prev[empId], ...patch, date: dailyDate } }));
  };

  const applyStatusToAll = (status) => {
    setDailyRows(prev => {
      const next = {};
      Object.entries(prev).forEach(([id, row]) => { next[id] = { ...row, status }; });
      return next;
    });
    toast.success(`Marked all as ${status}`);
  };

  const saveDaily = async () => {
    setSaving(true);
    try {
      const entries = Object.values(dailyRows).map(r => ({
        employee_id: r.employee_id, date: dailyDate,
        check_in: r.check_in || null, check_out: r.check_out || null,
        status: r.status, remarks: r.remarks || "",
      }));
      const res = await hrmsApi.bulkAttendance(entries);
      toast.success(`Saved · ${res.inserted} added, ${res.updated} updated`);
      loadExisting(dailyDate);
    } catch (e) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrmsLayout title="Attendance" subtitle="Daily marking, monthly register, and bulk updates">
      {/* View switch */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-muted p-1 gap-1">
          <ViewBtn active={view === "daily"} onClick={() => setView("daily")} testid="view-daily" label="Daily" />
          <ViewBtn active={view === "register"} onClick={() => setView("register")} testid="view-register" label="Monthly Register" />
        </div>
        <a data-testid="att-export"
          href={hrmsApi.urlAttendance(view === "register" ? `${month}-01` : dailyDate, view === "register" ? `${month}-31` : dailyDate)}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> Export Excel
        </a>
      </div>

      {view === "daily" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-muted-foreground" />
              <input data-testid="att-date" type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)}
                className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
            </div>
            <div className="flex flex-wrap gap-1 ml-auto">
              <span className="text-xs text-muted-foreground self-center mr-2">Bulk mark:</span>
              {(lookups?.attendance_statuses || []).map(s => (
                <button key={s} onClick={() => applyStatusToAll(s)} data-testid={`bulk-${s.replace(/\s/g, '-').toLowerCase()}`}
                  className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
            <button data-testid="att-save" onClick={saveDaily} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Attendance
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <Th>Code</Th><Th>Name</Th><Th>Department</Th><Th>Status</Th>
                    <Th>In</Th><Th>Out</Th><Th>Remarks</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
                  {!loading && employees.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Add employees first.</td></tr>
                  )}
                  {employees.map(e => {
                    const r = dailyRows[e.id] || {};
                    return (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2 font-mono text-xs">{e.emp_code}</td>
                        <td className="px-3 py-2 font-semibold">{e.name}</td>
                        <td className="px-3 py-2 text-xs">{e.department}</td>
                        <td className="px-3 py-2">
                          <select data-testid={`att-status-${e.emp_code}`} value={r.status || "Present"} onChange={ev => setRow(e.id, { status: ev.target.value })}
                            className={`text-xs font-bold px-2 py-1 rounded-full border-0 focus:outline-none ${STATUS_STYLES[r.status] || "bg-muted"}`}>
                            {(lookups?.attendance_statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="time" value={r.check_in || ""} onChange={ev => setRow(e.id, { check_in: ev.target.value })}
                            className="h-8 px-2 rounded-md bg-background border border-border text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="time" value={r.check_out || ""} onChange={ev => setRow(e.id, { check_out: ev.target.value })}
                            className="h-8 px-2 rounded-md bg-background border border-border text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.remarks || ""} onChange={ev => setRow(e.id, { remarks: ev.target.value })}
                            placeholder="Optional"
                            className="h-8 px-2 rounded-md bg-background border border-border text-xs w-full" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile attendance cards */}
          <div className="md:hidden space-y-2">
            {loading && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading…</div>}
            {!loading && employees.length === 0 && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Add employees first.</div>}
            {employees.map(e => {
              const r = dailyRows[e.id] || {};
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{e.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{e.emp_code} · {e.department}</div>
                    </div>
                    <select data-testid={`att-status-${e.emp_code}`} value={r.status || "Present"} onChange={ev => setRow(e.id, { status: ev.target.value })}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-0 focus:outline-none ${STATUS_STYLES[r.status] || "bg-muted"}`}>
                      {(lookups?.attendance_statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold">In</label>
                      <input type="time" value={r.check_in || ""} onChange={ev => setRow(e.id, { check_in: ev.target.value })}
                        className="mt-0.5 w-full h-9 px-2 rounded-md bg-background border border-border" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold">Out</label>
                      <input type="time" value={r.check_out || ""} onChange={ev => setRow(e.id, { check_out: ev.target.value })}
                        className="mt-0.5 w-full h-9 px-2 rounded-md bg-background border border-border" />
                    </div>
                  </div>
                  <input value={r.remarks || ""} onChange={ev => setRow(e.id, { remarks: ev.target.value })}
                    placeholder="Remarks (optional)"
                    className="mt-2 w-full h-9 px-3 rounded-md bg-background border border-border text-xs" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "register" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Month</span>
            <input data-testid="reg-month" type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          </div>
          {register && <RegisterTable register={register} />}
        </>
      )}
    </HrmsLayout>
  );
}

const ViewBtn = ({ active, onClick, label, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
      ${active ? "bg-background shadow" : "text-muted-foreground hover:text-foreground"}`}>
    {label}
  </button>
);

const Th = ({ children }) => (
  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</th>
);

function RegisterTable({ register }) {
  const days = useMemo(() => Array.from({ length: register.days_in_month }, (_, i) => i + 1), [register.days_in_month]);
  const dateFor = (d) => `${register.month}-${String(d).padStart(2, "0")}`;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead className="bg-muted/70 border-b border-border sticky top-0">
            <tr>
              <th className="sticky left-0 bg-muted/70 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[180px]">Employee</th>
              {days.map(d => <th key={d} className="px-2 py-2 text-center text-[10px] font-bold text-muted-foreground w-8">{d}</th>)}
              <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground">P</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground">A</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground">L</th>
            </tr>
          </thead>
          <tbody>
            {register.employees.length === 0 && (
              <tr><td colSpan={days.length + 4} className="py-8 text-center text-muted-foreground">No active employees</td></tr>
            )}
            {register.employees.map(e => {
              let p = 0, a = 0, l = 0;
              return (
                <tr key={e.emp_code} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="sticky left-0 bg-card px-3 py-1.5 font-semibold whitespace-nowrap">
                    <span className="font-mono text-[10px] text-muted-foreground mr-1">{e.emp_code}</span>
                    {e.name}
                  </td>
                  {days.map(d => {
                    const cell = e.days[dateFor(d)];
                    if (cell?.status === "Present") p++;
                    if (cell?.status === "Absent") a++;
                    if (cell?.status === "Leave") l++;
                    return (
                      <td key={d} className={`text-center py-1 ${cell ? STATUS_STYLES[cell.status] || "" : ""}`}
                        title={cell ? `${cell.status}${cell.check_in ? ` · ${cell.check_in}-${cell.check_out}` : ""}` : ""}>
                        {cell ? CELL_ABBR[cell.status] || "·" : ""}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right font-bold text-emerald-500 tabular-nums">{p}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-[hsl(var(--destructive))] tabular-nums">{a}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-sky-500 tabular-nums">{l}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Legend color="bg-emerald-500/10 text-emerald-500" label="P Present" />
        <Legend color="bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]" label="A Absent" />
        <Legend color="bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]" label="H Half Day" />
        <Legend color="bg-sky-500/10 text-sky-500" label="L Leave" />
        <Legend color="bg-fuchsia-500/10 text-fuchsia-500" label="HO Holiday" />
        <Legend color="bg-muted" label="WO Weekly Off" />
      </div>
    </div>
  );
}
const Legend = ({ color, label }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${color} font-semibold`}>{label}</span>
);
