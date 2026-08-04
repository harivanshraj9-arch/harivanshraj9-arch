import { useRef, useState } from "react";
import { toast } from "sonner";
import { X, Upload, CheckCircle2, XCircle, AlertTriangle, UserPlus, FileSpreadsheet, Loader2, ChevronRight } from "lucide-react";
import { hrmsApi } from "@/lib/hrmsApi";
import { inr } from "@/lib/format";

/**
 * PayrollImportDialog — import historical salary sheets.
 * Steps: idle (pick file + month) → preview (mapping + duplicates) → result.
 */
export default function PayrollImportDialog({ open, month, onClose, onImported }) {
  const [step, setStep] = useState("idle");
  const [file, setFile] = useState(null);
  const [pickedMonth, setPickedMonth] = useState(month || new Date().toISOString().slice(0, 7));
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [showInvalid, setShowInvalid] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    setStep("idle"); setFile(null); setPreview(null); setResult(null); setLoading(false);
    setCreateMissing(true); setOverwrite(true); setShowInvalid(false);
  };
  const closeAll = () => { reset(); onClose?.(); };

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const n = f.name.toLowerCase();
    if (!(n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".xlsm"))) {
      toast.error("Only .xlsx, .xls, .xlsm supported"); return;
    }
    setFile(f);
  };

  const runPreview = async () => {
    if (!file) { toast.error("Choose a file"); return; }
    if (!/^\d{4}-\d{2}$/.test(pickedMonth)) { toast.error("Pick a valid month"); return; }
    setLoading(true);
    try {
      const data = await hrmsApi.payrollImportPreview(file, pickedMonth);
      setPreview(data); setStep("preview");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to read sheet");
    } finally { setLoading(false); }
  };

  const commit = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const data = await hrmsApi.payrollImportCommit({
        month: preview.month,
        rows: preview.rows,
        create_missing: createMissing,
        overwrite,
      });
      setResult(data); setStep("result");
      toast.success(`Imported ${data.imported} payslips`);
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally { setLoading(false); }
  };

  const rowsShown = preview?.rows?.filter(r => showInvalid ? !r.valid : true) || [];
  const totalNet = preview?.rows?.reduce((s, r) => (r.valid ? s + (r.net_salary || 0) : s), 0) || 0;

  return (
    <div data-testid="payroll-import-dialog" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                Step {step === "idle" ? 1 : step === "preview" ? 2 : 3} / 3
              </div>
              <h2 className="font-heading text-xl font-bold">
                {step === "idle" && "Import Old Salary Sheet"}
                {step === "preview" && `Review · ${preview?.month}`}
                {step === "result" && "Import Complete"}
              </h2>
            </div>
          </div>
          <button onClick={closeAll} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "idle" && (
            <div className="py-4 max-w-lg mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold">Pick month & sheet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your sheet should have columns like <b>Name / Emp Code / Basic / HRA / DA / PF / ESIC / Net</b>.
                We auto-map common variants. Employees are matched by <b>Emp Code</b> first, then by <b>Name</b>.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Salary month</span>
                  <input data-testid="pi-month" type="month" value={pickedMonth} onChange={e => setPickedMonth(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Excel file</span>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-left truncate hover:bg-muted">
                    {file ? file.name : "Choose file…"}
                  </button>
                </label>
              </div>
              <button data-testid="pi-preview" onClick={runPreview} disabled={loading || !file}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? "Reading…" : "Preview Sheet"}
              </button>
            </div>
          )}

          {step === "preview" && preview && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <Chip testid="pi-chip-total" label="Total Rows" value={preview.counts.total_rows} tint="text-[hsl(var(--primary))]" />
                <Chip testid="pi-chip-matched" label="Matched" value={preview.counts.matched} tint="text-emerald-500" />
                <Chip testid="pi-chip-new" label="New Employees" value={preview.counts.new_employees} tint="text-[hsl(var(--energy))]" />
                <Chip testid="pi-chip-duplicates" label="Duplicate Month" value={preview.counts.duplicates} tint="text-sky-500" />
                <Chip testid="pi-chip-invalid" label="Invalid" value={preview.counts.invalid} tint="text-[hsl(var(--destructive))]" />
              </div>

              <div className="mb-4 rounded-xl bg-muted p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold truncate">{preview.filename}</span>
                  {preview.counts.empty_skipped > 0 && <span className="text-muted-foreground">· {preview.counts.empty_skipped} empty skipped</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Net payout:</span>
                  <span className="font-bold tabular-nums">{inr(totalNet)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input data-testid="pi-create-missing" type="checkbox" checked={createMissing} onChange={e => setCreateMissing(e.target.checked)} />
                  Auto-create missing employees ({preview.counts.new_employees})
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input data-testid="pi-overwrite" type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                  Overwrite existing month payslips ({preview.counts.duplicates})
                </label>
                <label className="inline-flex items-center gap-2 text-sm ml-auto">
                  <input type="checkbox" checked={showInvalid} onChange={e => setShowInvalid(e.target.checked)} />
                  Show only invalid rows
                </label>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr>
                        <Th>#</Th><Th>Match</Th><Th>Name / Code</Th>
                        <Th className="text-right">Basic</Th><Th className="text-right">Gross</Th>
                        <Th className="text-right">PF</Th><Th className="text-right">ESIC</Th>
                        <Th className="text-right">Deductions</Th><Th className="text-right">Net</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsShown.length === 0 && <tr><td colSpan={10} className="text-center py-6 text-muted-foreground">No rows</td></tr>}
                      {rowsShown.slice(0, 500).map(r => (
                        <tr key={r.row} className={`border-t border-border ${!r.valid ? "bg-[hsl(var(--destructive))]/5" : r.will_create_employee ? "bg-[hsl(var(--energy))]/10" : r.is_duplicate ? "bg-sky-500/5" : ""}`}>
                          <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{r.row}</td>
                          <td className="px-3 py-1.5">
                            <MatchBadge type={r.matched_by} />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="font-semibold">{r.name || "—"}</div>
                            {r.emp_code && <div className="text-[10px] text-muted-foreground">{r.emp_code}</div>}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.basic ? inr(r.basic) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{inr(r.gross_earnings)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.pf_employee ? inr(r.pf_employee) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.esic_employee ? inr(r.esic_employee) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{inr(r.total_deductions)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold text-emerald-500">{inr(r.net_salary)}</td>
                          <td className="px-3 py-1.5">
                            {!r.valid ? (
                              <span className="inline-flex items-center gap-1 text-[hsl(var(--destructive))] font-semibold">
                                <XCircle className="w-3 h-3" /> {r.errors?.[0] || "Invalid"}
                              </span>
                            ) : r.is_duplicate ? (
                              <span className="inline-flex items-center gap-1 text-sky-500 font-semibold">
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rowsShown.length > 500 && (
                        <tr><td colSpan={10} className="text-center py-2 text-muted-foreground">Showing 500 of {rowsShown.length} · all will be imported</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-2xl font-bold">Import finished</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Dashboard, payroll register and reports have been refreshed for <b>{result.month}</b>.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <ResultCard label="Imported" value={result.imported} tint="text-emerald-500" />
                <ResultCard label="New Employees" value={result.created_employees} tint="text-[hsl(var(--energy))]" />
                <ResultCard label="Skipped" value={result.skipped_duplicate} tint="text-sky-500" />
                <ResultCard label="Failed" value={result.failed} tint="text-[hsl(var(--destructive))]" />
              </div>
              {result.errors?.length > 0 && (
                <div className="rounded-xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-[hsl(var(--destructive))]">Errors ({result.errors.length})</div>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i}><span className="font-mono text-muted-foreground">Row {e.row}:</span> {e.error}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={reset} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Import Another</button>
                <button data-testid="pi-done" onClick={closeAll} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
                  Done <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {step !== "result" && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {step === "preview" && preview && (
                <span>{preview.counts.valid} valid · {preview.counts.new_employees} new employees · {preview.counts.duplicates} existing</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={closeAll} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
              {step === "preview" && (
                <button data-testid="pi-confirm" onClick={commit} disabled={loading || preview.counts.valid === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Confirm Import ({preview.counts.valid - (overwrite ? 0 : preview.counts.duplicates)})
                </button>
              )}
            </div>
          </div>
        )}
        <input ref={fileRef} data-testid="pi-file" type="file" accept=".xlsx,.xls,.xlsm" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={`px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);

const Chip = ({ testid, label, value, tint }) => (
  <div data-testid={testid} className="rounded-xl border border-border bg-card p-3">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
    <div className={`font-heading text-2xl font-bold tabular-nums mt-1 ${tint || ""}`}>{value}</div>
  </div>
);

const ResultCard = ({ label, value, tint }) => (
  <div className="rounded-xl border border-border bg-card p-4 text-center">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
    <div className={`font-heading text-3xl font-black tabular-nums mt-1 ${tint}`}>{value}</div>
  </div>
);

const MatchBadge = ({ type }) => {
  if (type === "code") return <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> Code</span>;
  if (type === "name") return <span className="inline-flex items-center gap-1 text-[hsl(var(--primary))] text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> Name</span>;
  return <span className="inline-flex items-center gap-1 text-[hsl(var(--energy))] text-[10px] font-bold uppercase"><UserPlus className="w-3 h-3" /> New</span>;
};
