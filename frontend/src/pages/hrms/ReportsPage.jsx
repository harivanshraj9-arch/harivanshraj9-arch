import { useState } from "react";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";
import { monthISO, todayISO } from "@/lib/format";

const REPORTS = [
  { key: "employees", title: "Employee Master", desc: "All employees with salary, joining and status", type: "employees" },
  { key: "attendance", title: "Attendance Report", desc: "Daily attendance for date range", type: "attendance" },
  { key: "payroll", title: "Payroll Report", desc: "Full payroll register for a month", type: "payroll" },
  { key: "pf", title: "PF Report", desc: "Monthly PF register (employee + employer)", type: "pf" },
  { key: "esic", title: "ESIC Report", desc: "Monthly ESIC register", type: "esic" },
];

export default function ReportsPage() {
  const [month, setMonth] = useState(monthISO());
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());

  const url = (t) => {
    if (t === "employees") return hrmsApi.urlEmployees();
    if (t === "attendance") return hrmsApi.urlAttendance(start, end);
    if (t === "payroll") return hrmsApi.urlPayroll(month);
    if (t === "pf") return hrmsApi.urlPF(month);
    if (t === "esic") return hrmsApi.urlESIC(month);
    return "#";
  };

  return (
    <HrmsLayout title="Reports" subtitle="Export attendance, payroll and statutory reports">
      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Payroll / PF / ESIC month</span>
          <input data-testid="report-month" type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Attendance start</span>
          <input data-testid="report-start" type="date" value={start} onChange={e => setStart(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Attendance end</span>
          <input data-testid="report-end" type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <div key={r.key} data-testid={`report-card-${r.key}`}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Report</div>
                <h3 className="font-heading font-bold">{r.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{r.desc}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <a data-testid={`dl-${r.key}`} href={url(r.type)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
                <Download className="w-3.5 h-3.5" /> Excel
              </a>
              <button data-testid={`print-${r.key}`} onClick={() => window.open(url(r.type), "_blank")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
                <Printer className="w-3.5 h-3.5" /> View / Print
              </button>
            </div>
          </div>
        ))}
      </div>
    </HrmsLayout>
  );
}
