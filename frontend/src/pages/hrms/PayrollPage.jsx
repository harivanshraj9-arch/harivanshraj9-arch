import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Download, Printer, X } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";
import { inr } from "@/lib/format";
import { monthISO } from "@/lib/format";

export default function PayrollPage() {
  const [month, setMonth] = useState(monthISO());
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [settings, setSettings] = useState(null);

  const load = async () => {
    const [p, s, e, cfg] = await Promise.all([
      hrmsApi.listPayroll({ month }),
      hrmsApi.paySummary(month).catch(() => null),
      hrmsApi.listEmployees({ status: "Active", limit: 5000 }),
      hrmsApi.settings(),
    ]);
    setPayslips(p.items);
    setSummary(s);
    setEmployees(e.items);
    setSettings(cfg);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  const generate = async () => {
    if (!window.confirm(`Generate payroll for ${month}? This replaces any existing payslips for this month.`)) return;
    setGenerating(true);
    try {
      const r = await hrmsApi.generatePayroll({ month });
      toast.success(`Generated ${r.generated} payslips`);
      load();
    } catch { toast.error("Generation failed"); }
    finally { setGenerating(false); }
  };

  const deleteMonth = async () => {
    if (!window.confirm(`Delete all payslips for ${month}?`)) return;
    try {
      const r = await hrmsApi.deleteMonthPayroll(month);
      toast.success(`Deleted ${r.deleted} payslips`);
      load();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <HrmsLayout title="Payroll" subtitle="Auto-generate salaries with PF, ESIC and PT deductions">
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Payroll Month</span>
        <input data-testid="payroll-month" type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        <div className="flex-1" />
        <button data-testid="payroll-generate" onClick={generate} disabled={generating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
          <Play className="w-4 h-4" /> {generating ? "Generating…" : "Generate Payroll"}
        </button>
        <a data-testid="payroll-export-excel" href={hrmsApi.urlPayroll(month)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> Excel
        </a>
        <a data-testid="pf-export" href={hrmsApi.urlPF(month)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> PF
        </a>
        <a data-testid="esic-export" href={hrmsApi.urlESIC(month)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> ESIC
        </a>
        {payslips.length > 0 && (
          <button onClick={deleteMonth} className="text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10">
            Delete Month
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SumCard testid="sum-employees" label="Employees" value={summary?.employees ?? 0} />
        <SumCard testid="sum-gross" label="Gross" value={inr(summary?.gross || 0)} />
        <SumCard testid="sum-net" label="Net Payout" value={inr(summary?.net || 0)} tint="text-emerald-500" />
        <SumCard testid="sum-pf" label="PF Total" value={inr(summary?.pf_total || 0)} tint="text-[hsl(var(--energy))]" />
        <SumCard testid="sum-esic" label="ESIC Total" value={inr(summary?.esic_total || 0)} tint="text-fuchsia-500" />
        <SumCard testid="sum-ded" label="Statutory Cost" value={inr((summary?.pf_employer || 0) + (summary?.esic_employer || 0))} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <Th>Emp Code</Th><Th>Name</Th><Th className="text-right">Present</Th>
                <Th className="text-right">Gross</Th><Th className="text-right">PF</Th>
                <Th className="text-right">ESIC</Th><Th className="text-right">Deductions</Th>
                <Th className="text-right">Net</Th><Th className="text-right">Payslip</Th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">
                  No payslips for {month}. Click Generate Payroll to create.
                </td></tr>
              )}
              {payslips.map(p => {
                const emp = empMap[p.employee_id];
                return (
                  <tr key={p.employee_id + p.month} data-testid={`slip-${p.employee_id}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs">{emp?.emp_code || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{emp?.name || "Deleted"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.days_present}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(p.gross_earnings)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(p.pf_employee)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(p.esic_employee)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(p.total_deductions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-500">{inr(p.net_salary)}</td>
                    <td className="px-3 py-2 text-right">
                      <button data-testid={`view-slip-${p.employee_id}`} onClick={() => setSelectedSlip(p)}
                        className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlip && (
        <PayslipDialog slip={selectedSlip} employee={empMap[selectedSlip.employee_id]} settings={settings} onClose={() => setSelectedSlip(null)} />
      )}
    </HrmsLayout>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);

const SumCard = ({ testid, label, value, tint }) => (
  <div data-testid={testid} className="rounded-2xl border border-border bg-card p-3">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
    <div className={`font-heading text-lg font-bold tabular-nums mt-1 ${tint || ""}`}>{value}</div>
  </div>
);

function PayslipDialog({ slip, employee, settings, onClose }) {
  const [y, m] = slip.month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const earnings = [
    ["Basic", slip.basic], ["HRA", slip.hra], ["DA", slip.da],
    ["Conveyance", slip.conveyance], ["Special Allowance", slip.special_allowance],
    ["Bonus", slip.bonus], ["Incentive", slip.incentive], ["Overtime", slip.overtime],
    ["Arrears", slip.arrears], ["Reimbursements", slip.reimbursements],
  ].filter(([, v]) => v > 0);
  const deductions = [
    ["PF Employee (12%)", slip.pf_employee], ["ESIC Employee (0.75%)", slip.esic_employee],
    ["Professional Tax", slip.professional_tax], ["TDS", slip.tds],
    ["Advance", slip.advance], ["Loan EMI", slip.loan_emi], ["Other", slip.other_deductions],
  ].filter(([, v]) => v > 0);

  const printSlip = () => {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) { toast.error("Enable popups to print"); return; }
    const html = `<!DOCTYPE html><html><head><title>Payslip ${employee?.name || ''} — ${monthLabel}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
  h1, h2, h3 { margin: 0; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  .num { text-align: right; }
  .tot { border-top: 2px solid #111; font-weight: 700; }
  .net { margin-top: 24px; padding: 12px; background: #f4f4f5; text-align: right; font-size: 18px; font-weight: 700; }
  .muted { color: #666; font-size: 12px; }
</style></head><body>
<div class="head">
  <div>
    <h1>${settings?.company_name || 'Prathvi Power Solutions'}</h1>
    <div class="muted">${settings?.company_address || ''}</div>
  </div>
  <div style="text-align:right;">
    <h3>Payslip</h3>
    <div class="muted">${monthLabel}</div>
  </div>
</div>
<div class="grid" style="margin-bottom:16px;">
  <div>
    <div class="muted">Employee</div>
    <b>${employee?.name || ''}</b> <span class="muted">(${employee?.emp_code || ''})</span>
  </div>
  <div>
    <div class="muted">Designation</div>
    <b>${employee?.designation || '—'}</b>
    <div class="muted">${employee?.department || ''}</div>
  </div>
  <div>
    <div class="muted">PAN / UAN / ESIC</div>
    <b>${employee?.pan || '—'} / ${employee?.uan || '—'} / ${employee?.esic_number || '—'}</b>
  </div>
  <div>
    <div class="muted">Bank</div>
    <b>${employee?.bank_name || '—'}</b>
    <div class="muted">A/c ${employee?.account_number || '—'} · ${employee?.ifsc || '—'}</div>
  </div>
  <div>
    <div class="muted">Present / Leave / Absent</div>
    <b>${slip.days_present} / ${slip.days_leave} / ${slip.days_absent}</b>
    <div class="muted">Working days: ${slip.working_days}</div>
  </div>
</div>

<div class="grid">
  <div>
    <h3 style="margin-bottom:6px;">Earnings</h3>
    <table>
      ${earnings.map(([k, v]) => `<tr><td>${k}</td><td class="num">₹ ${Number(v).toFixed(2)}</td></tr>`).join("")}
      <tr class="tot"><td>Gross Earnings</td><td class="num">₹ ${Number(slip.gross_earnings).toFixed(2)}</td></tr>
    </table>
  </div>
  <div>
    <h3 style="margin-bottom:6px;">Deductions</h3>
    <table>
      ${deductions.map(([k, v]) => `<tr><td>${k}</td><td class="num">₹ ${Number(v).toFixed(2)}</td></tr>`).join("")}
      <tr class="tot"><td>Total Deductions</td><td class="num">₹ ${Number(slip.total_deductions).toFixed(2)}</td></tr>
    </table>
    <div class="muted" style="margin-top:6px;">Employer contribution — PF: ₹${slip.pf_employer.toFixed(2)}, ESIC: ₹${slip.esic_employer.toFixed(2)}</div>
  </div>
</div>

<div class="net">Net Salary: ₹ ${Number(slip.net_salary).toFixed(2)}</div>
<div class="muted" style="margin-top:24px;">This is a system-generated payslip and does not require a signature.</div>
<script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
</body></html>`;
    win.document.open(); win.document.write(html); win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div data-testid="payslip-dialog" className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Payslip</div>
            <h3 className="font-heading text-lg font-bold">{employee?.name} · {monthLabel}</h3>
          </div>
          <div className="flex gap-2">
            <button data-testid="print-slip" onClick={printSlip} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-heading font-bold mb-2">Earnings</h4>
            <ul className="space-y-1 text-sm">
              {earnings.map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-border py-1">
                  <span>{k}</span><span className="tabular-nums font-semibold">{inr(v)}</span>
                </li>
              ))}
              <li className="flex justify-between pt-2 border-t-2 border-foreground text-base">
                <span className="font-bold">Gross</span><span className="tabular-nums font-bold">{inr(slip.gross_earnings)}</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-2">Deductions</h4>
            <ul className="space-y-1 text-sm">
              {deductions.map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-border py-1">
                  <span>{k}</span><span className="tabular-nums font-semibold">{inr(v)}</span>
                </li>
              ))}
              <li className="flex justify-between pt-2 border-t-2 border-foreground text-base">
                <span className="font-bold">Total</span><span className="tabular-nums font-bold">{inr(slip.total_deductions)}</span>
              </li>
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              Employer contrib · PF: <b>{inr(slip.pf_employer)}</b> · ESIC: <b>{inr(slip.esic_employer)}</b>
            </div>
          </div>
        </div>
        <div className="p-4 bg-muted flex items-center justify-between">
          <span className="font-heading font-bold">Net Salary</span>
          <span className="font-heading text-2xl font-black tabular-nums text-emerald-500">{inr(slip.net_salary)}</span>
        </div>
      </div>
    </div>
  );
}
