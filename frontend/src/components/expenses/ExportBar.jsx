import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Printer, FileSpreadsheet, HardDriveDownload, HardDriveUpload, FileUp } from "lucide-react";
import { expenseApi } from "@/lib/expenseApi";
import { inr } from "@/lib/format";
import ImportDialog from "@/components/expenses/ImportDialog";

export default function ExportBar({ filters, rows = [], summary, onRestored }) {
  const fileRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);

  const downloadExcel = () => {
    const url = expenseApi.exportExcelUrl(filters);
    window.open(url, "_blank");
  };

  const printReport = () => {
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) { toast.error("Please allow popups to print"); return; }
    const html = `<!DOCTYPE html>
<html><head><title>Expense Report — Prathvi Power Solutions</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .muted { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f4f4f5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  tfoot td { font-weight: 700; }
  .num { text-align: right; }
  .kpi { display: flex; gap: 24px; margin: 12px 0 4px; flex-wrap: wrap; }
  .kpi div { font-size: 12px; } .kpi b { display: block; font-size: 16px; }
</style></head><body>
<h1>Prathvi Power Solutions — Expense Report</h1>
<div class="muted">Generated ${new Date().toLocaleString()}</div>
<div class="kpi">
  <div>Today <b>${inr(summary?.today || 0)}</b></div>
  <div>Week <b>${inr(summary?.week || 0)}</b></div>
  <div>Month <b>${inr(summary?.month || 0)}</b></div>
  <div>Budget <b>${inr(summary?.budget || 0)}</b></div>
  <div>Remaining <b>${inr(summary?.remaining || 0)}</b></div>
</div>
<table>
  <thead>
    <tr><th>Date</th><th>Category</th><th class="num">Amount</th><th>Mode</th><th>Description</th></tr>
  </thead>
  <tbody>
    ${rows.map(r => `<tr>
      <td>${r.date}</td><td>${escapeHtml(r.category)}</td>
      <td class="num">${inr(r.amount)}</td><td>${r.payment_mode}</td>
      <td>${escapeHtml(r.description || "")}</td>
    </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr><td colspan="2">Total (${rows.length} entries)</td>
    <td class="num">${inr(rows.reduce((s, r) => s + Number(r.amount || 0), 0))}</td>
    <td colspan="2"></td></tr>
  </tfoot>
</table>
<script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
</body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const savePDF = () => {
    // Uses browser print → Save as PDF
    toast("Choose 'Save as PDF' in the print dialog", { icon: "🖨️" });
    printReport();
  };

  const backup = async () => {
    try {
      const data = await expenseApi.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pps-expenses-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) {
      toast.error("Backup failed");
    }
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Restore expenses from this backup? Existing entries with same id will be updated (merge mode).")) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await expenseApi.restore({
        expenses: data.expenses || [],
        budgets: data.budgets || [],
        mode: "merge",
      });
      toast.success(`Restored ${res.restored_expenses} expenses`);
      onRestored?.();
    } catch (err) {
      toast.error("Invalid backup file");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div data-testid="export-bar" className="flex flex-wrap gap-2">
      <button
        data-testid="btn-import-excel"
        onClick={() => setImportOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <FileUp className="w-3.5 h-3.5" /> Import Excel
      </button>
      <ActionBtn testid="btn-export-excel" onClick={downloadExcel} icon={FileSpreadsheet} label="Excel" />
      <ActionBtn testid="btn-export-pdf" onClick={savePDF} icon={Download} label="PDF" />
      <ActionBtn testid="btn-print" onClick={printReport} icon={Printer} label="Print" />
      <ActionBtn testid="btn-backup" onClick={backup} icon={HardDriveDownload} label="Backup" />
      <button
        data-testid="btn-restore"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted"
      >
        <HardDriveUpload className="w-3.5 h-3.5" /> Restore
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={restore} className="hidden" />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={onRestored} />
    </div>
  );
}

const ActionBtn = ({ testid, onClick, icon: Icon, label }) => (
  <button
    data-testid={testid}
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted"
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
