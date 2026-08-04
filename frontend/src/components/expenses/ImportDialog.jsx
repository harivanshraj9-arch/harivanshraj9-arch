import { useState, useRef } from "react";
import { toast } from "sonner";
import { X, Upload, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, Loader2, ChevronRight } from "lucide-react";
import { http } from "@/lib/api";
import { inr } from "@/lib/format";

/**
 * ImportDialog – Excel import workflow
 * Steps:
 *   1) 'idle'    – file picker
 *   2) 'preview' – table with validation & duplicate detection, user confirms
 *   3) 'result'  – success/skip/fail counts
 */
export default function ImportDialog({ open, onClose, onImported }) {
  const [step, setStep] = useState("idle");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    setStep("idle");
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
    setSkipDuplicates(true);
    setShowInvalidOnly(false);
  };

  const closeAll = () => { reset(); onClose?.(); };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const nameLower = f.name.toLowerCase();
    if (!(nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls") || nameLower.endsWith(".xlsm"))) {
      toast.error("Only .xlsx, .xls, .xlsm files are supported");
      return;
    }
    setFile(f);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await http.post("/expenses/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(data);
      setStep("preview");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to read Excel file");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const { data } = await http.post("/expenses/import/commit", {
        rows: preview.rows,
        skip_duplicates: skipDuplicates,
      });
      setResult(data);
      setStep("result");
      toast.success(`Imported ${data.imported} expenses`);
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const rowsToShow = preview?.rows?.filter((r) => (showInvalidOnly ? !r.valid : true)) || [];
  const totalAmount = preview?.rows?.reduce((s, r) => (r.valid ? s + (r.amount || 0) : s), 0) || 0;

  return (
    <div data-testid="import-dialog" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {step === "idle" ? "Step 1 / 3" : step === "preview" ? "Step 2 / 3" : "Step 3 / 3"}
              </div>
              <h2 className="font-heading text-xl font-bold">
                {step === "idle" && "Import Historical Expenses"}
                {step === "preview" && "Review & Confirm"}
                {step === "result" && "Import Complete"}
              </h2>
            </div>
          </div>
          <button
            data-testid="import-close"
            onClick={closeAll}
            className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "idle" && (
            <IdleStep onPick={() => fileRef.current?.click()} loading={loading} />
          )}
          {step === "preview" && preview && (
            <PreviewStep
              preview={preview}
              rowsToShow={rowsToShow}
              totalAmount={totalAmount}
              showInvalidOnly={showInvalidOnly}
              setShowInvalidOnly={setShowInvalidOnly}
              skipDuplicates={skipDuplicates}
              setSkipDuplicates={setSkipDuplicates}
            />
          )}
          {step === "result" && result && (
            <ResultStep result={result} onDone={closeAll} onImportAnother={reset} />
          )}
        </div>

        {/* Footer */}
        {step !== "result" && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {step === "idle" && "Accepts .xlsx, .xls, .xlsm"}
              {step === "preview" && preview && (
                <span>
                  {preview.counts.valid} valid · {preview.counts.invalid} invalid · {preview.counts.duplicates} duplicates
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeAll}
                className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              {step === "preview" && (
                <button
                  data-testid="import-confirm"
                  onClick={commit}
                  disabled={loading || preview.counts.valid === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50 hover:scale-[0.98] transition-transform"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Confirm Import ({skipDuplicates ? preview.counts.valid - preview.counts.duplicates : preview.counts.valid})
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          data-testid="import-file-input"
          type="file"
          accept=".xlsx,.xls,.xlsm"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}

const IdleStep = ({ onPick, loading }) => (
  <div className="py-8">
    <div className="text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
        <FileSpreadsheet className="w-8 h-8" />
      </div>
      <h3 className="font-heading text-2xl font-bold">Drop or pick your Excel file</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll auto-detect columns like <b>Date</b>, <b>Category</b>, <b>Amount</b>, <b>Payment Mode</b>, and <b>Description</b>.
        Duplicates are highlighted before anything is saved.
      </p>
      <button
        data-testid="import-pick-file"
        onClick={onPick}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold hover:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {loading ? "Reading file…" : "Choose Excel file"}
      </button>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
        <TipCard title="Smart Mapping" body="Handles variants like PaymentMode, Mode, Remarks, DETAILS." />
        <TipCard title="Dedup Check" body="Compares Date + Amount + Category + Description against existing." />
        <TipCard title="Custom Categories" body="Unknown categories are kept as custom, not blocked." />
      </div>
    </div>
  </div>
);

const TipCard = ({ title, body }) => (
  <div className="rounded-xl border border-border bg-background p-3">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{title}</div>
    <div className="mt-1 text-xs">{body}</div>
  </div>
);

const PreviewStep = ({
  preview, rowsToShow, totalAmount, showInvalidOnly, setShowInvalidOnly,
  skipDuplicates, setSkipDuplicates,
}) => {
  const c = preview.counts;
  return (
    <div>
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryChip testid="chip-total" label="Total Rows" value={c.total_rows} icon={FileSpreadsheet} tint="bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]" />
        <SummaryChip testid="chip-valid" label="Valid" value={c.valid} icon={CheckCircle2} tint="bg-emerald-500/10 text-emerald-500" />
        <SummaryChip testid="chip-duplicates" label="Duplicates" value={c.duplicates} icon={AlertTriangle} tint="bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]" />
        <SummaryChip testid="chip-invalid" label="Invalid" value={c.invalid} icon={XCircle} tint="bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]" />
      </div>

      {/* File info */}
      <div className="mb-4 rounded-xl bg-muted p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-semibold truncate">{preview.filename}</span>
          {c.empty_skipped > 0 && <span className="text-muted-foreground">· {c.empty_skipped} empty rows skipped</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">Detected total:</span>
          <span className="font-bold tabular-nums">{inr(totalAmount)}</span>
        </div>
      </div>

      {preview.new_categories?.length > 0 && (
        <div className="mb-3 rounded-xl border border-[hsl(var(--energy))]/40 bg-[hsl(var(--energy))]/10 p-3">
          <div className="text-xs font-bold uppercase tracking-wider mb-1">New categories will be added:</div>
          <div className="flex flex-wrap gap-1.5">
            {preview.new_categories.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-background/60 text-xs font-semibold">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            data-testid="toggle-skip-duplicates"
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="rounded border-border"
          />
          Skip duplicates ({c.duplicates})
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            data-testid="toggle-invalid-only"
            type="checkbox"
            checked={showInvalidOnly}
            onChange={(e) => setShowInvalidOnly(e.target.checked)}
            className="rounded border-border"
          />
          Show only invalid rows
        </label>
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="text-left px-3 py-2 font-bold">#</th>
                <th className="text-left px-3 py-2 font-bold">Date</th>
                <th className="text-left px-3 py-2 font-bold">Category</th>
                <th className="text-right px-3 py-2 font-bold">Amount</th>
                <th className="text-left px-3 py-2 font-bold">Mode</th>
                <th className="text-left px-3 py-2 font-bold">Description</th>
                <th className="text-left px-3 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody data-testid="preview-tbody">
              {rowsToShow.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No rows to display</td></tr>
              )}
              {rowsToShow.slice(0, 500).map((r) => (
                <tr key={r.row} data-testid={`preview-row-${r.row}`}
                  className={`border-t border-border ${!r.valid ? "bg-[hsl(var(--destructive))]/5" : r.is_duplicate ? "bg-[hsl(var(--energy))]/10" : ""}`}>
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{r.row}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.date || "—"}</td>
                  <td className="px-3 py-1.5">{r.category || "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{r.amount != null ? inr(r.amount) : "—"}</td>
                  <td className="px-3 py-1.5">{r.payment_mode}</td>
                  <td className="px-3 py-1.5 max-w-[260px] truncate" title={r.description}>{r.description || "—"}</td>
                  <td className="px-3 py-1.5">
                    {!r.valid ? (
                      <span className="inline-flex items-center gap-1 text-[hsl(var(--destructive))] font-semibold">
                        <XCircle className="w-3 h-3" /> {r.errors?.[0] || "Invalid"}
                      </span>
                    ) : r.is_duplicate ? (
                      <span className="inline-flex items-center gap-1 text-[hsl(var(--energy))] font-semibold">
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
              {rowsToShow.length > 500 && (
                <tr><td colSpan={7} className="text-center py-3 text-muted-foreground text-xs">
                  Showing first 500 of {rowsToShow.length}. All rows will be imported.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryChip = ({ testid, label, value, icon: Icon, tint }) => (
  <div data-testid={testid} className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
      <div className={`w-6 h-6 rounded-md ${tint} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className="font-heading text-2xl font-bold tabular-nums">{value}</div>
  </div>
);

const ResultStep = ({ result, onDone, onImportAnother }) => (
  <div className="py-4">
    <div className="text-center mb-6">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h3 className="font-heading text-2xl font-bold">Import finished</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Your reports, charts and budget calculations have already been refreshed.
      </p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <ResultChip testid="result-total" label="Total Rows" value={result.total_rows} tint="text-muted-foreground" />
      <ResultChip testid="result-imported" label="Imported" value={result.imported} tint="text-emerald-500" />
      <ResultChip testid="result-skipped" label="Skipped" value={result.skipped_duplicate} tint="text-[hsl(var(--energy))]" />
      <ResultChip testid="result-failed" label="Failed" value={result.failed} tint="text-[hsl(var(--destructive))]" />
    </div>

    {result.errors?.length > 0 && (
      <div className="rounded-xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 p-3">
        <div className="text-xs font-bold uppercase tracking-wider mb-2 text-[hsl(var(--destructive))]">
          Error details ({result.errors.length})
        </div>
        <div className="max-h-40 overflow-y-auto text-xs space-y-1">
          {result.errors.slice(0, 30).map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="font-mono text-muted-foreground shrink-0">Row {e.row}:</span>
              <span>{e.error}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onImportAnother} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">
        Import Another
      </button>
      <button
        data-testid="import-done"
        onClick={onDone}
        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
      >
        Done <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const ResultChip = ({ testid, label, value, tint }) => (
  <div data-testid={testid} className="rounded-xl border border-border bg-card p-4 text-center">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
    <div className={`font-heading text-3xl font-black tabular-nums mt-1 ${tint}`}>{value}</div>
  </div>
);
