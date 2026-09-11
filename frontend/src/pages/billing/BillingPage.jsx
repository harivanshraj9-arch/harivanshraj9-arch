import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, Plus, Pencil, Trash2, Search, Download, Upload,
  Power, Save, FileText, History, ClipboardList, Sparkles, ScrollText, Printer, Loader2,
  FileSpreadsheet, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { Toaster, toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useTheme } from "@/lib/theme";
import { billingApi } from "@/lib/billingApi";
import { inr } from "@/lib/format";
import { amountToWords } from "@/lib/amountInWords";
import { printInvoice, previewInvoice } from "@/lib/invoiceRenderer";

const TABS = [
  { key: "rates", label: "Rate Master", icon: ClipboardList },
  { key: "new", label: "New Invoice (WCC)", icon: Sparkles },
  { key: "bulk", label: "Bulk WCC", icon: Upload },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "import", label: "Data Import", icon: FileSpreadsheet },
  { key: "statement", label: "Statement", icon: ScrollText },
  { key: "company", label: "Company", icon: History },
  { key: "audit", label: "Audit Log", icon: ScrollText },
];

export default function BillingPage() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [tab, setTab] = useState(new URLSearchParams(location.search).get("tab") || "rates");
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div data-testid="billing-page" className="min-h-screen flex bg-background text-foreground">
      <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="billing" />
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="billing" onClose={() => setMobileNav(false)} />
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}
      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 glass glass-dark dark:glass-dark [.light_&]:glass-light border-b border-border">
          <div className="px-4 sm:px-8 h-16 flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center" onClick={() => setMobileNav(v => !v)}>
              {mobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center"><Zap className="w-4 h-4" /></div>
              <span className="font-heading font-black">Billing</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Module</div>
              <div className="font-heading font-bold">Vendor Billing · R K Enterprises</div>
            </div>
          </div>
          <nav className="px-4 sm:px-8 border-t border-border overflow-x-auto no-scrollbar">
            <div className="flex gap-1 py-2">
              {TABS.map(t => (
                <button key={t.key} data-testid={`bill-tab-${t.key}`} onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${tab === t.key ? "bg-foreground text-background" : "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
        <div className="px-4 sm:px-8 py-6 space-y-6 max-w-[1600px]">
          {tab === "rates" && <RateMaster />}
          {tab === "new" && <NewInvoice />}
          {tab === "bulk" && <BulkWCC />}
          {tab === "invoices" && <InvoiceList />}
          {tab === "import" && <HistoricalImport />}
          {tab === "statement" && <StatementPage />}
          {tab === "company" && <CompanyForm />}
          {tab === "audit" && <AuditLog />}
          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">© 2026 Prathvi Power Solutions · Vendor Billing</footer>
        </div>
      </main>
      <MobileBottomNav />
      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }}} />
    </div>
  );
}

/* ============= RATE MASTER ============= */
function RateMaster() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState({ q: "", category: "All", active: "All" });
  const [dialog, setDialog] = useState(null);
  const fileRef = useRef();

  const load = async () => {
    const opts = { q: filter.q, category: filter.category };
    if (filter.active !== "All") opts.active = filter.active === "Active";
    const d = await billingApi.listRates(opts);
    setRows(d.items); setCats(d.categories);
  };
  useEffect(() => { load(); }, [filter.q, filter.category, filter.active]); // eslint-disable-line

  const importExcel = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const r = await billingApi.importRates(f);
      toast.success(`Imported ${r.imported}, updated ${r.updated}`); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Import failed"); }
    finally { e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Rate Master</h1>
        <p className="mt-1 text-sm text-muted-foreground">All work items, rates, HSN and GST — the single source of truth for invoices.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input data-testid="rate-search" value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))}
            placeholder="Search product, HSN, category…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="All">All Categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.active} onChange={e => setFilter(f => ({ ...f, active: e.target.value }))}
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="All">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
        </select>
        <button data-testid="rate-import" onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted"><Upload className="w-3.5 h-3.5" /> Import</button>
        <a data-testid="rate-export" href={billingApi.exportRatesUrl()} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted"><Download className="w-3.5 h-3.5" /> Export</a>
        <button data-testid="rate-new" onClick={() => setDialog({})}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"><Plus className="w-4 h-4" /> Add Rate</button>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={importExcel} className="hidden" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <Th>Product</Th><Th>Category</Th><Th>Unit</Th><Th>HSN</Th>
                <Th className="text-right">Rate</Th><Th className="text-right">GST</Th>
                <Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No rates found</td></tr>}
              {rows.map(r => (
                <tr key={r.id} data-testid={`rate-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.category}</td>
                  <td className="px-3 py-2 text-xs">{r.unit}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.hsn || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{inr(r.rate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.gst_pct}%</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${r.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{r.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setDialog(r)} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={async () => { await billingApi.toggleRate(r.id); load(); }} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center" title="Toggle"><Power className="w-3.5 h-3.5" /></button>
                    <button onClick={async () => { if (window.confirm(`Delete '${r.name}'?`)) { await billingApi.deleteRate(r.id); load(); toast.success("Deleted"); } }}
                      className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile rate cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No rates found</div>}
        {rows.map(r => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.category} · Unit {r.unit} · HSN {r.hsn || "—"}</div>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${r.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{r.active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <div><span className="text-muted-foreground text-xs">Rate</span> <span className="font-bold tabular-nums">{inr(r.rate)}</span></div>
              <div><span className="text-muted-foreground text-xs">GST</span> <span className="font-semibold">{r.gst_pct}%</span></div>
            </div>
            <div className="mt-2 flex gap-1">
              <button onClick={() => setDialog(r)} className="flex-1 h-9 rounded-lg border border-border text-xs inline-flex items-center justify-center gap-1"><Pencil className="w-3 h-3"/>Edit</button>
              <button onClick={async () => { await billingApi.toggleRate(r.id); load(); }} className="flex-1 h-9 rounded-lg border border-border text-xs inline-flex items-center justify-center gap-1"><Power className="w-3 h-3"/>Toggle</button>
              <button onClick={async () => { if (window.confirm(`Delete '${r.name}'?`)) { await billingApi.deleteRate(r.id); load(); toast.success("Deleted"); } }}
                className="flex-1 h-9 rounded-lg border border-border text-xs hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center gap-1"><Trash2 className="w-3 h-3"/>Del</button>
            </div>
          </div>
        ))}
      </div>

      {dialog && <RateDialog rate={dialog} categories={cats} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
    </div>
  );
}

function RateDialog({ rate, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", description: "", category: categories[0] || "Other Work", unit: "No.",
    rate: 0, hsn: "", gst_pct: 18, active: true, effective_from: new Date().toISOString().slice(0, 10),
    ...rate,
  });
  const isEdit = !!rate.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim().length < 2) { toast.error("Name required"); return; }
    try {
      if (isEdit) await billingApi.updateRate(rate.id, form);
      else await billingApi.createRate(form);
      toast.success(isEdit ? "Updated" : "Added");
      onSaved();
    } catch (err) { toast.error(err?.response?.data?.detail?.[0]?.msg || "Save failed"); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={save} className="w-full max-w-2xl bg-card border border-border rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold">{isEdit ? "Edit Rate" : "Add Rate"}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Product Name*" full><I data-testid="rate-name" value={form.name} onChange={v => set("name", v)} /></F>
          <F label="Category"><Sel value={form.category} onChange={v => set("category", v)} options={categories} /></F>
          <F label="Unit"><I value={form.unit} onChange={v => set("unit", v)} /></F>
          <F label="Rate (₹)*"><Num data-testid="rate-value" value={form.rate} onChange={v => set("rate", v)} /></F>
          <F label="GST %"><Num value={form.gst_pct} onChange={v => set("gst_pct", v)} /></F>
          <F label="HSN"><I value={form.hsn} onChange={v => set("hsn", v)} /></F>
          <F label="Effective From"><I type="date" value={form.effective_from} onChange={v => set("effective_from", v)} /></F>
          <F label="Description" full><textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /></F>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
          <button data-testid="rate-save" type="submit" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold"><Save className="w-4 h-4" /> Save</button>
        </div>
      </form>
    </div>
  );
}

/* ============= NEW INVOICE (WCC AI) ============= */
function NewInvoice() {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // {matched, unknown, filename}
  const [customer, setCustomer] = useState({ customer: "", customer_gstin: "", customer_address: "", place_of_supply: "", is_igst: false, notes: "" });
  const [lines, setLines] = useState([]); // editable
  const [saving, setSaving] = useState(false);
  const [newProductPrompt, setNewProductPrompt] = useState(null); // { unknown row + form }
  const fileRef = useRef();

  const parse = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const d = await billingApi.parseWCC(file);
      setPreview(d);
      // Build initial lines from matched
      setLines(d.matched.map(m => ({
        rate_id: m.rate_id, name: m.name, hsn: m.hsn, unit: m.unit,
        quantity: m.quantity, rate: m.rate, gst_pct: m.gst_pct,
      })));
      toast.success(`AI mapped ${d.matched.length} items · ${d.unknown.length} unknown`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Parsing failed"); }
    finally { setParsing(false); }
  };

  const addUnknownAsNew = (u) => setNewProductPrompt({ ...u, category: "Other Work", unit: "No.", rate: 0, gst_pct: 18, hsn: "" });

  const saveNewProduct = async () => {
    try {
      const created = await billingApi.createRate(newProductPrompt);
      setLines(prev => [...prev, {
        rate_id: created.id, name: created.name, hsn: created.hsn, unit: created.unit,
        quantity: newProductPrompt.quantity, rate: created.rate, gst_pct: created.gst_pct,
      }]);
      setPreview(p => ({ ...p, unknown: p.unknown.filter(x => x.name !== newProductPrompt.name) }));
      setNewProductPrompt(null);
      toast.success("Product added to Rate Master");
    } catch { toast.error("Failed to save"); }
  };

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    lines.forEach(l => {
      const amt = Number(l.quantity || 0) * Number(l.rate || 0);
      sub += amt; tax += amt * Number(l.gst_pct || 0) / 100;
    });
    const cgst = customer.is_igst ? 0 : tax / 2;
    const sgst = customer.is_igst ? 0 : tax / 2;
    const igst = customer.is_igst ? tax : 0;
    const gt = sub + cgst + sgst + igst;
    const roundOff = Math.round(gt) - gt;
    return { subtotal: sub, cgst, sgst, igst, round_off: roundOff, grand_total: gt + roundOff, total_tax: tax };
  }, [lines, customer.is_igst]);

  const saveInvoice = async () => {
    if (lines.length === 0) { toast.error("Add at least one line"); return; }
    setSaving(true);
    try {
      const inv = await billingApi.createInvoice({
        ...customer, wcc_filename: preview?.filename,
        lines: lines.map(l => ({ rate_id: l.rate_id, name: l.name, hsn: l.hsn, unit: l.unit, quantity: Number(l.quantity), rate: Number(l.rate), gst_pct: Number(l.gst_pct) })),
      });
      toast.success(`Invoice ${inv.invoice_no} saved`);
      // Reset
      setFile(null); setPreview(null); setLines([]);
      setCustomer({ customer: "", customer_gstin: "", customer_address: "", place_of_supply: "", is_igst: false, notes: "" });
      // Show print with company header
      const co = await billingApi.getCompany();
      printInvoice(inv, co);
    } catch (err) { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">New Invoice from WCC</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload a WCC PDF — AI reads the Billable Quantity column and maps items to your Rate Master automatically.</p>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button data-testid="wcc-pick" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">
            <Upload className="w-4 h-4" /> {file ? file.name : "Choose WCC PDF"}
          </button>
          <input ref={fileRef} data-testid="wcc-file" type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0])} className="hidden" />
          <button data-testid="wcc-parse" onClick={parse} disabled={!file || parsing}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {parsing ? "Reading…" : "AI Extract"}
          </button>
        </div>
        {preview?.unknown?.length > 0 && (
          <div className="mt-4 rounded-xl border border-[hsl(var(--energy))]/40 bg-[hsl(var(--energy))]/10 p-3">
            <div className="text-sm font-bold mb-2">New products detected ({preview.unknown.length})</div>
            <div className="space-y-1">
              {preview.unknown.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-1.5">
                  <span>{u.name} <span className="text-muted-foreground text-xs">× {u.quantity}</span></span>
                  <button data-testid={`add-unknown-${i}`} onClick={() => addUnknownAsNew(u)} className="text-xs px-3 py-1 rounded-full bg-foreground text-background font-semibold">+ Add rate</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer */}
      {preview && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-heading text-lg font-bold mb-3">Customer / Buyer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Customer Name"><I data-testid="cust-name" value={customer.customer} onChange={v => setCustomer(c => ({ ...c, customer: v }))} /></F>
              <F label="GSTIN"><I value={customer.customer_gstin} onChange={v => setCustomer(c => ({ ...c, customer_gstin: v }))} /></F>
              <F label="Address" full><textarea rows={2} value={customer.customer_address} onChange={e => setCustomer(c => ({ ...c, customer_address: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /></F>
              <F label="Place of Supply"><I value={customer.place_of_supply} onChange={v => setCustomer(c => ({ ...c, place_of_supply: v }))} /></F>
              <F label="Tax Type">
                <div className="flex gap-1 h-10 p-1 rounded-lg bg-muted">
                  <button type="button" onClick={() => setCustomer(c => ({ ...c, is_igst: false }))}
                    className={`flex-1 rounded-md text-xs font-semibold ${!customer.is_igst ? "bg-background shadow" : "text-muted-foreground"}`}>CGST + SGST</button>
                  <button type="button" onClick={() => setCustomer(c => ({ ...c, is_igst: true }))}
                    className={`flex-1 rounded-md text-xs font-semibold ${customer.is_igst ? "bg-background shadow" : "text-muted-foreground"}`}>IGST (Inter-state)</button>
                </div>
              </F>
            </div>
          </div>

          {/* Lines editor */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr><Th>Item</Th><Th>HSN</Th><Th className="text-right">Qty</Th><Th className="text-right">Rate</Th><Th className="text-right">GST %</Th><Th className="text-right">Amount</Th><Th></Th></tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const amt = Number(l.quantity || 0) * Number(l.rate || 0);
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5">{l.name}</td>
                        <td className="px-3 py-1.5 text-xs font-mono">{l.hsn || "—"}</td>
                        <td className="px-3 py-1.5"><input type="number" step="0.01" value={l.quantity} onChange={e => setLines(p => p.map((x, ix) => ix === i ? { ...x, quantity: parseFloat(e.target.value) || 0 } : x))} className="w-20 h-8 px-2 rounded-md bg-background border border-border text-right text-xs" /></td>
                        <td className="px-3 py-1.5"><input type="number" step="0.01" value={l.rate} onChange={e => setLines(p => p.map((x, ix) => ix === i ? { ...x, rate: parseFloat(e.target.value) || 0 } : x))} className="w-24 h-8 px-2 rounded-md bg-background border border-border text-right text-xs" /></td>
                        <td className="px-3 py-1.5 text-right"><input type="number" step="0.01" value={l.gst_pct} onChange={e => setLines(p => p.map((x, ix) => ix === i ? { ...x, gst_pct: parseFloat(e.target.value) || 0 } : x))} className="w-16 h-8 px-2 rounded-md bg-background border border-border text-right text-xs" /></td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-bold">{inr(amt)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button onClick={() => setLines(p => p.filter((_, ix) => ix !== i))} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/40">
                  <tr><td colSpan={5} className="px-3 py-1.5 text-right text-xs font-bold text-muted-foreground">Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums font-bold">{inr(totals.subtotal)}</td><td /></tr>
                  {!customer.is_igst && <>
                    <tr><td colSpan={5} className="px-3 py-1 text-right text-xs text-muted-foreground">CGST</td><td className="px-3 py-1 text-right tabular-nums">{inr(totals.cgst)}</td><td /></tr>
                    <tr><td colSpan={5} className="px-3 py-1 text-right text-xs text-muted-foreground">SGST</td><td className="px-3 py-1 text-right tabular-nums">{inr(totals.sgst)}</td><td /></tr>
                  </>}
                  {customer.is_igst && <tr><td colSpan={5} className="px-3 py-1 text-right text-xs text-muted-foreground">IGST</td><td className="px-3 py-1 text-right tabular-nums">{inr(totals.igst)}</td><td /></tr>}
                  <tr><td colSpan={5} className="px-3 py-1 text-right text-xs text-muted-foreground">Round Off</td><td className="px-3 py-1 text-right tabular-nums">{inr(totals.round_off)}</td><td /></tr>
                  <tr><td colSpan={5} className="px-3 py-2 text-right font-bold">GRAND TOTAL</td><td className="px-3 py-2 text-right tabular-nums font-black text-lg text-emerald-500">{inr(totals.grand_total)}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button data-testid="save-invoice" onClick={saveInvoice} disabled={saving || lines.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Invoice
            </button>
          </div>
        </>
      )}

      {newProductPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5">
            <h3 className="font-heading text-lg font-bold mb-1">New Product Detected</h3>
            <p className="text-xs text-muted-foreground mb-4">Add "{newProductPrompt.name}" to Rate Master. It will never ask again.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Name" full><I value={newProductPrompt.name} onChange={v => setNewProductPrompt(p => ({ ...p, name: v }))} /></F>
              <F label="Rate (₹)"><Num data-testid="new-prod-rate" value={newProductPrompt.rate} onChange={v => setNewProductPrompt(p => ({ ...p, rate: v }))} /></F>
              <F label="GST %"><Num value={newProductPrompt.gst_pct} onChange={v => setNewProductPrompt(p => ({ ...p, gst_pct: v }))} /></F>
              <F label="HSN"><I value={newProductPrompt.hsn} onChange={v => setNewProductPrompt(p => ({ ...p, hsn: v }))} /></F>
              <F label="Unit"><I value={newProductPrompt.unit} onChange={v => setNewProductPrompt(p => ({ ...p, unit: v }))} /></F>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNewProductPrompt(null)} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
              <button data-testid="new-prod-save" onClick={saveNewProduct} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold"><Save className="w-4 h-4" /> Save & Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============= INVOICE LIST ============= */
const PAYMENT_STYLES = {
  Paid: "bg-emerald-500/10 text-emerald-500",
  "Partly Paid": "bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]",
  Unpaid: "bg-muted text-muted-foreground",
  Overdue: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
};

const SOURCE_STYLES = {
  wcc: "bg-emerald-500/10 text-emerald-700",
  manual: "bg-slate-500/10 text-slate-700",
  historical: "bg-amber-500/15 text-amber-700",
};

function FilterField({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function ThSort({ children, onClick, icon, className = "" }) {
  return (
    <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground select-none">
        {children} {icon}
      </button>
    </th>
  );
}

function Pagination({ page, pages, total, pageSize, onChange }) {
  if (pages <= 1) return (
    <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground text-center">
      {total} invoice{total === 1 ? "" : "s"}
    </div>
  );
  const goPrev = () => onChange(Math.max(1, page - 1));
  const goNext = () => onChange(Math.min(pages, page + 1));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  // Build compact page numbers: first, ..., current-1, current, current+1, ..., last
  const pageBtns = [];
  const push = (p) => pageBtns.push(p);
  const seen = new Set();
  [1, page - 1, page, page + 1, pages].forEach(p => { if (p >= 1 && p <= pages && !seen.has(p)) { seen.add(p); push(p); } });
  pageBtns.sort((a, b) => a - b);
  return (
    <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs" data-testid="inv-pagination">
      <div className="text-muted-foreground">Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b></div>
      <div className="flex items-center gap-1">
        <button onClick={goPrev} disabled={page === 1} className="h-7 px-2 rounded border border-border disabled:opacity-30 hover:bg-muted">Prev</button>
        {pageBtns.map((p, i) => {
          const gap = i > 0 && p - pageBtns[i - 1] > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="text-muted-foreground px-0.5">…</span>}
              <button
                data-testid={`inv-page-${p}`}
                onClick={() => onChange(p)}
                className={`h-7 min-w-[28px] px-1.5 rounded ${p === page ? "bg-foreground text-background font-bold" : "border border-border hover:bg-muted"}`}
              >{p}</button>
            </span>
          );
        })}
        <button onClick={goNext} disabled={page === pages} className="h-7 px-2 rounded border border-border disabled:opacity-30 hover:bg-muted">Next</button>
      </div>
    </div>
  );
}

function InvoiceList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [customer, setCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSummary, setPageSummary] = useState(null); // filtered summary
  const [facets, setFacets] = useState({ customers: [], sources: [], statuses: [] });
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [company, setCompany] = useState(null);
  const [payDialog, setPayDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounced search query
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setQDebounced(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change → reset to page 1
  useEffect(() => { setPage(1); }, [status, source, customer, startDate, endDate, sortBy, sortDir]);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, s, c] = await Promise.all([
        billingApi.listInvoices({
          q: qDebounced || undefined,
          status: status || undefined,
          source: source || undefined,
          customer: customer || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page, page_size: pageSize,
        }),
        billingApi.summary(),
        billingApi.getCompany(),
      ]);
      setRows(inv.items); setTotal(inv.total); setPages(inv.pages || 1);
      setPageSummary(inv.summary);
      setSummary(s); setCompany(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [qDebounced, status, source, customer, startDate, endDate, sortBy, sortDir, page]);

  useEffect(() => {
    billingApi.invoiceFacets().then(setFacets).catch(() => { });
  }, []);

  const clearFilters = () => {
    setQ(""); setStatus(""); setSource(""); setCustomer(""); setStartDate(""); setEndDate("");
    setSortBy("date"); setSortDir("desc");
  };
  const activeFilterCount =
    (qDebounced ? 1 : 0) + (status ? 1 : 0) + (source ? 1 : 0) +
    (customer ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortIcon = ({ col }) => sortBy !== col ? <span className="opacity-30">↕</span> : (sortDir === "asc" ? <span>↑</span> : <span>↓</span>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="font-heading text-3xl font-black tracking-tight">Invoices</h1></div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input data-testid="inv-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search invoice, customer, GSTIN…" className="w-full h-10 pl-9 pr-8 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-3 h-3" /></button>}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SumTile testid="tile-invoices" label="Invoices" value={summary.total_invoices} />
          <SumTile testid="tile-billed" label="Total Billed" value={inr(summary.total_billed)} />
          <SumTile testid="tile-paid" label="Collected" value={inr(summary.total_paid)} tint="text-emerald-500" />
          <SumTile testid="tile-outstanding" label="Outstanding" value={inr(summary.outstanding)} tint="text-[hsl(var(--energy))]" />
          <SumTile testid="tile-overdue" label="Overdue" value={inr(summary.overdue_amount)} tint="text-[hsl(var(--destructive))]" />
        </div>
      )}

      {/* ---- Filter bar ---- */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-2">
          <FilterField label="Status">
            <select data-testid="filter-status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs min-w-[130px]">
              <option value="">Any</option>
              {(facets.statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterField>
          <FilterField label="Source">
            <select data-testid="filter-source" value={source} onChange={e => setSource(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs min-w-[130px]">
              <option value="">Any</option>
              {(facets.sources || []).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </FilterField>
          <FilterField label="Customer">
            <select data-testid="filter-customer" value={customer} onChange={e => setCustomer(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs min-w-[220px] max-w-[260px] truncate">
              <option value="">Any</option>
              {(facets.customers || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FilterField>
          <FilterField label="From">
            <input data-testid="filter-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs" />
          </FilterField>
          <FilterField label="To">
            <input data-testid="filter-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs" />
          </FilterField>
          <button
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            data-testid="filter-reset"
            className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" /> Reset {activeFilterCount ? `(${activeFilterCount})` : ""}
          </button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
        </div>

        {pageSummary && activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border text-xs flex flex-wrap gap-4">
            <span className="text-muted-foreground">Filtered:</span>
            <span><b>{pageSummary.count}</b> invoices</span>
            <span>Billed <b className="tabular-nums">{inr(pageSummary.total_billed)}</b></span>
            <span>Paid <b className="tabular-nums text-emerald-600">{inr(pageSummary.total_paid)}</b></span>
            <span>Outstanding <b className="tabular-nums text-[hsl(var(--energy))]">{inr(pageSummary.total_outstanding)}</b></span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <ThSort onClick={() => toggleSort("invoice_no")} icon={<SortIcon col="invoice_no" />}>Invoice</ThSort>
              <ThSort onClick={() => toggleSort("date")} icon={<SortIcon col="date" />}>Date</ThSort>
              <ThSort onClick={() => toggleSort("customer")} icon={<SortIcon col="customer" />}>Customer</ThSort>
              <Th>Source</Th>
              <ThSort onClick={() => toggleSort("grand_total")} icon={<SortIcon col="grand_total" />} className="text-right">Grand Total</ThSort>
              <Th className="text-right">Paid</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">{loading ? "Loading…" : "No invoices match the current filters"}</td></tr>}
            {rows.map(r => {
              const outstanding = r.grand_total - (r.paid_amount || 0);
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs">{r.invoice_no}</td>
                  <td className="px-3 py-2 text-xs">{r.date}</td>
                  <td className="px-3 py-2">{r.customer || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${SOURCE_STYLES[r.source] || "bg-muted"}`}>
                      {r.source || "manual"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{inr(r.grand_total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div>{inr(r.paid_amount || 0)}</div>
                    {outstanding > 0.5 && <div className="text-[10px] text-[hsl(var(--energy))]">Due {inr(outstanding)}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <button data-testid={`pay-status-${r.id}`} onClick={() => setPayDialog(r)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${PAYMENT_STYLES[r.payment_status] || "bg-muted"}`}>
                      {r.payment_status || "Unpaid"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setSelected(r)} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted">View</button>
                    <a href={billingApi.invoiceExcelUrl(r.id)} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted ml-1">Excel</a>
                    <a href={billingApi.invoicePdfUrl(r.id)} target="_blank" rel="noopener noreferrer" data-testid={`pdf-${r.id}`} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted ml-1 text-blue-700 border-blue-500/40">PDF</a>
                    <button onClick={() => printInvoice(r, company)} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted ml-1">Print</button>
                    <button onClick={async () => { if (window.confirm(`Delete ${r.invoice_no}?`)) { await billingApi.deleteInvoice(r.id); toast.success("Deleted"); load(); } }} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {/* Mobile invoice cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No invoices yet</div>}
        {rows.map(r => {
          const outstanding = r.grand_total - (r.paid_amount || 0);
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted-foreground">{r.invoice_no}</div>
                  <div className="font-semibold truncate">{r.customer || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.date}</div>
                </div>
                <button data-testid={`pay-status-${r.id}`} onClick={() => setPayDialog(r)}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${PAYMENT_STYLES[r.payment_status] || "bg-muted"}`}>
                  {r.payment_status || "Unpaid"}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-muted-foreground">Total</span> <div className="font-bold tabular-nums">{inr(r.grand_total)}</div></div>
                <div className="text-right">
                  <span className="text-muted-foreground">Paid</span>
                  <div className="tabular-nums">{inr(r.paid_amount || 0)}</div>
                  {outstanding > 0.5 && <div className="text-[10px] text-[hsl(var(--energy))]">Due {inr(outstanding)}</div>}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                <button onClick={() => setSelected(r)} className="h-8 rounded-lg border border-border text-xs">View</button>
                <a href={billingApi.invoiceExcelUrl(r.id)} target="_blank" rel="noopener noreferrer" className="h-8 rounded-lg border border-border text-xs inline-flex items-center justify-center">Excel</a>
                <a href={billingApi.invoicePdfUrl(r.id)} target="_blank" rel="noopener noreferrer" className="h-8 rounded-lg border border-blue-500/40 text-blue-700 text-xs inline-flex items-center justify-center">PDF</a>
                <button onClick={() => printInvoice(r, company)} className="h-8 rounded-lg border border-border text-xs">Print</button>
              </div>
            </div>
          );
        })}
        <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
      {selected && <InvoiceView inv={selected} company={company} onClose={() => setSelected(null)} />}
      {payDialog && <PayDialog invoice={payDialog} onClose={() => setPayDialog(null)} onSaved={() => { setPayDialog(null); load(); }} />}
    </div>
  );
}

function PayDialog({ invoice, onClose, onSaved }) {
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "", method: "Bank", reference: "", remarks: "",
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await billingApi.listPayments(invoice.id);
    setHistory(d.items);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const totalPaid = history.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = Number(invoice.grand_total) - totalPaid;

  const addPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Amount must be > 0"); return; }
    if (form.method === "Cheque" && !form.reference.trim()) { toast.error("Cheque number required"); return; }
    setBusy(true);
    try {
      await billingApi.addPayment(invoice.id, { ...form, amount: amt });
      toast.success(`Payment ₹${amt} logged`);
      setForm({ date: new Date().toISOString().slice(0, 10), amount: "", method: form.method, reference: "", remarks: "" });
      await load();
      onSaved?.();
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  const removePayment = async (pid) => {
    if (!window.confirm("Remove this payment entry?")) return;
    try { await billingApi.deletePayment(pid); await load(); onSaved?.(); toast.success("Removed"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Payment History</div>
            <h3 className="font-heading text-lg font-bold">{invoice.invoice_no}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-2"><div className="text-[10px] uppercase text-muted-foreground font-bold">Invoice</div><div className="font-bold tabular-nums text-sm">{inr(invoice.grand_total)}</div></div>
            <div className="rounded-lg bg-emerald-500/10 p-2"><div className="text-[10px] uppercase text-emerald-500 font-bold">Paid</div><div className="font-bold tabular-nums text-sm text-emerald-500">{inr(totalPaid)}</div></div>
            <div className={`rounded-lg p-2 ${outstanding > 0.5 ? "bg-[hsl(var(--energy))]/15" : "bg-muted"}`}><div className={`text-[10px] uppercase font-bold ${outstanding > 0.5 ? "text-[hsl(var(--energy))]" : "text-muted-foreground"}`}>Outstanding</div><div className={`font-bold tabular-nums text-sm ${outstanding > 0.5 ? "text-[hsl(var(--energy))]" : ""}`}>{inr(Math.max(0, outstanding))}</div></div>
          </div>

          <form onSubmit={addPayment} className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Add Payment</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <F label="Date"><I type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} /></F>
              <F label="Amount (₹)*"><Num data-testid="ph-amount" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} /></F>
              <F label="Method">
                <Sel value={form.method} onChange={v => setForm(f => ({ ...f, method: v }))} options={["Bank", "UPI", "Cash", "Cheque", "Card", "Other"]} />
              </F>
              <F label={form.method === "Cheque" ? "Cheque No.*" : "Reference / UTR"}><I data-testid="ph-ref" value={form.reference} onChange={v => setForm(f => ({ ...f, reference: v }))} /></F>
              <F label="Remarks" full><I value={form.remarks} onChange={v => setForm(f => ({ ...f, remarks: v }))} /></F>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button data-testid="ph-mark-full" type="button" disabled={outstanding <= 0.5} onClick={() => setForm(f => ({ ...f, amount: outstanding.toFixed(2) }))}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted disabled:opacity-40">
                Fill Outstanding
              </button>
              <button data-testid="ph-add" type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
                <Plus className="w-4 h-4" /> Log Payment
              </button>
            </div>
          </form>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Transactions ({history.length})</div>
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">No payments logged yet</div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted"><tr><Th>Date</Th><Th>Method</Th><Th>Reference</Th><Th className="text-right">Amount</Th><Th>Remarks</Th><Th></Th></tr></thead>
                  <tbody>
                    {history.map(p => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-3 py-1.5">{p.date}</td>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted">{p.method}</span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{p.reference || "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-bold text-emerald-500">{inr(p.amount)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground max-w-[160px] truncate">{p.remarks}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button onClick={() => removePayment(p.id)} className="w-7 h-7 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Close</button>
        </div>
      </div>
    </div>
  );
}

const SumTile = ({ testid, label, value, tint = "" }) => (
  <div data-testid={testid} className="rounded-2xl border border-border bg-card p-4">
    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
    <div className={`font-heading text-xl font-bold tabular-nums mt-1 ${tint}`}>{value}</div>
  </div>
);

/* ============= BULK WCC ============= */
function BulkWCC() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [company, setCompany] = useState(null);
  const [customer, setCustomer] = useState({ customer: "", customer_gstin: "", customer_address: "", place_of_supply: "", is_igst: false });
  const fileRef = useRef();

  useEffect(() => { billingApi.getCompany().then(setCompany); }, []);

  const parseAll = async () => {
    if (files.length === 0) return;
    setBusy(true); setResults([]);
    const out = [];
    for (const f of files) {
      try {
        const d = await billingApi.parseWCC(f);
        out.push({ filename: f.name, ...d, selected: true });
      } catch (e) {
        out.push({ filename: f.name, error: e?.response?.data?.detail || "Parse failed", matched: [], unknown: [] });
      }
      setResults([...out]);
    }
    setBusy(false);
    toast.success(`Parsed ${out.length} PDF${out.length > 1 ? "s" : ""}`);
  };

  const createAll = async () => {
    setBusy(true);
    let created = 0;
    for (const r of results.filter(x => x.selected && x.matched?.length > 0)) {
      try {
        await billingApi.createInvoice({
          ...customer, wcc_filename: r.filename,
          lines: r.matched.map(m => ({
            rate_id: m.rate_id, name: m.name, hsn: m.hsn, unit: m.unit,
            quantity: Number(m.quantity), rate: Number(m.rate), gst_pct: Number(m.gst_pct),
          })),
        });
        created++;
      } catch (e) { /* skip */ }
    }
    setBusy(false);
    toast.success(`Generated ${created} invoices`);
    setFiles([]); setResults([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-black tracking-tight">Bulk WCC Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drop multiple WCC PDFs. AI parses each, then one click generates all invoices.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <F label="Customer / Buyer"><I data-testid="bulk-customer" value={customer.customer} onChange={v => setCustomer(c => ({ ...c, customer: v }))} /></F>
          <F label="GSTIN"><I value={customer.customer_gstin} onChange={v => setCustomer(c => ({ ...c, customer_gstin: v }))} /></F>
          <F label="Address" full><textarea rows={2} value={customer.customer_address} onChange={e => setCustomer(c => ({ ...c, customer_address: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /></F>
          <F label="Place of Supply"><I value={customer.place_of_supply} onChange={v => setCustomer(c => ({ ...c, place_of_supply: v }))} /></F>
          <F label="Tax Type">
            <div className="flex gap-1 h-10 p-1 rounded-lg bg-muted">
              <button type="button" onClick={() => setCustomer(c => ({ ...c, is_igst: false }))} className={`flex-1 rounded-md text-xs font-semibold ${!customer.is_igst ? "bg-background shadow" : "text-muted-foreground"}`}>CGST + SGST</button>
              <button type="button" onClick={() => setCustomer(c => ({ ...c, is_igst: true }))} className={`flex-1 rounded-md text-xs font-semibold ${customer.is_igst ? "bg-background shadow" : "text-muted-foreground"}`}>IGST</button>
            </div>
          </F>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <button data-testid="bulk-pick" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">
            <Upload className="w-4 h-4" /> {files.length ? `${files.length} PDF${files.length > 1 ? "s" : ""} selected` : "Choose WCC PDFs"}
          </button>
          <input ref={fileRef} data-testid="bulk-files" type="file" accept=".pdf" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
          <button data-testid="bulk-parse" onClick={parseAll} disabled={busy || files.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Extract All
          </button>
          {results.length > 0 && (
            <button data-testid="bulk-create" onClick={createAll} disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 ml-auto">
              <Save className="w-4 h-4" /> Create {results.filter(r => r.selected && r.matched?.length > 0).length} Invoice(s)
            </button>
          )}
        </div>
      </div>

      {results.map((r, i) => {
        const totalGross = (r.matched || []).reduce((s, m) => s + m.quantity * m.rate, 0);
        return (
          <div key={i} data-testid={`bulk-result-${i}`} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <label className="flex items-center gap-2 font-heading font-bold flex-1 min-w-0 truncate">
                <input type="checkbox" checked={r.selected !== false} onChange={e => setResults(prev => prev.map((x, ix) => ix === i ? { ...x, selected: e.target.checked } : x))} />
                <FileText className="w-4 h-4 shrink-0" />
                {r.filename}
              </label>
              {r.matched && r.matched.length > 0 && (
                <span className="text-xs font-bold tabular-nums">{r.matched.length} items · Subtotal {inr(totalGross)}</span>
              )}
            </div>
            {r.error && <div className="text-sm text-[hsl(var(--destructive))]">{r.error}</div>}
            {(r.matched || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr><Th>Item</Th><Th className="text-right">Qty</Th><Th className="text-right">Rate</Th><Th className="text-right">Amount</Th></tr></thead>
                  <tbody>
                    {r.matched.map((m, j) => (
                      <tr key={j} className="border-t border-border"><td className="px-3 py-1">{m.name}</td><td className="px-3 py-1 text-right tabular-nums">{m.quantity}</td><td className="px-3 py-1 text-right tabular-nums">{inr(m.rate)}</td><td className="px-3 py-1 text-right tabular-nums font-semibold">{inr(m.quantity * m.rate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(r.unknown || []).length > 0 && (
              <div className="mt-2 text-xs text-[hsl(var(--energy))]">
                {r.unknown.length} unknown item(s) — please add these in Rate Master first: {r.unknown.map(u => u.name).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============= STATEMENT ============= */
function StatementPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [customer, setCustomer] = useState("");
  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(lastOfMonth);
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    billingApi.getCompany().then(setCompany);
    billingApi.listInvoices({}).then(d => {
      const uniq = Array.from(new Set(d.items.map(i => i.customer).filter(Boolean)));
      setCustomers(uniq);
    });
  }, []);

  const generate = async () => {
    if (!customer.trim()) { toast.error("Pick a customer"); return; }
    setBusy(true);
    try {
      const d = await billingApi.statement(customer, start, end);
      setData(d);
    } catch (e) { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-black tracking-tight">Customer Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">One printable sheet with all invoices, payments and outstanding balance for a customer in a given period.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <F label="Customer" full>
          <input data-testid="st-customer" list="stmt-customers" value={customer} onChange={e => setCustomer(e.target.value)}
            placeholder="Type or pick a customer name"
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          <datalist id="stmt-customers">{customers.map(c => <option key={c} value={c} />)}</datalist>
        </F>
        <F label="From"><I data-testid="st-start" type="date" value={start} onChange={setStart} /></F>
        <F label="To"><I data-testid="st-end" type="date" value={end} onChange={setEnd} /></F>
        <div className="flex items-end gap-2">
          <button data-testid="st-generate" onClick={generate} disabled={busy}
            className="inline-flex items-center gap-1.5 px-5 h-10 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
            Generate
          </button>
          {data && (
            <button data-testid="st-print" onClick={() => printStatement(data, company)}
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-border text-sm font-semibold hover:bg-muted">
              <Printer className="w-4 h-4" /> Print
            </button>
          )}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SumTile testid="st-opening" label="Opening Balance" value={inr(data.opening_balance)} />
            <SumTile testid="st-billed" label="Billed" value={inr(data.total_billed)} />
            <SumTile testid="st-paid" label="Collected" value={inr(data.total_paid)} tint="text-emerald-500" />
            <SumTile testid="st-closing" label="Closing Balance" value={inr(data.closing_balance)} tint={data.closing_balance > 0.5 ? "text-[hsl(var(--energy))]" : "text-emerald-500"} />
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-heading font-bold">Invoices ({data.invoices.length})</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Date</Th><Th>Invoice</Th><Th className="text-right">Amount</Th><Th className="text-right">Paid</Th><Th>Status</Th></tr></thead>
              <tbody>
                {data.invoices.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">No invoices in this period</td></tr>}
                {data.invoices.map(i => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs">{i.date}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{i.invoice_no}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-bold">{inr(i.grand_total)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{inr(i.paid_amount || 0)}</td>
                    <td className="px-3 py-1.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_STYLES[i.payment_status] || "bg-muted"}`}>{i.payment_status || "Unpaid"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-heading font-bold">Payments ({data.payments.length})</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Date</Th><Th>Invoice</Th><Th>Method</Th><Th>Reference</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {data.payments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">No payments in this period</td></tr>}
                {data.payments.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs">{p.date}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{p.invoice_no}</td>
                    <td className="px-3 py-1.5"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted">{p.method}</span></td>
                    <td className="px-3 py-1.5 font-mono text-xs">{p.reference || "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-bold text-emerald-500">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function printStatement(data, company) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Enable popups"); return; }
  const co = company || {};
  const invRows = data.invoices.map(i => `<tr><td>${i.date}</td><td>${escapeHtml(i.invoice_no)}</td><td class="num">₹${i.grand_total.toFixed(2)}</td><td class="num">₹${(i.paid_amount || 0).toFixed(2)}</td><td>${escapeHtml(i.payment_status || "Unpaid")}</td></tr>`).join("");
  const payRows = data.payments.map(p => `<tr><td>${p.date}</td><td>${escapeHtml(p.invoice_no)}</td><td>${escapeHtml(p.method)}</td><td>${escapeHtml(p.reference || "")}</td><td class="num">₹${p.amount.toFixed(2)}</td></tr>`).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Statement · ${escapeHtml(data.customer)}</title><style>
    body{font-family:system-ui,sans-serif;padding:24px;color:#111;font-size:12px}
    h1{margin:0}h2{margin:16px 0 6px}
    .head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px;align-items:flex-start}
    .logo{max-height:60px;max-width:80px;object-fit:contain}
    .muted{color:#666;font-size:11px}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
    th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}th{background:#f4f4f5}
    .num{text-align:right}
    .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}
    .kpi div{border:1px solid #ccc;padding:8px;border-radius:4px}
    .kpi b{display:block;font-size:14px;margin-top:2px}
    .closing{margin-top:16px;padding:10px;background:#111;color:#fff;text-align:right;font-weight:700;font-size:14px;border-radius:4px}
  </style></head><body>
  <div class="head">
    <div style="display:flex;gap:12px">
      ${co.logo ? `<img src="${co.logo}" class="logo" />` : ""}
      <div>
        <h1>${escapeHtml(co.name || "R K ENTERPRISES")}</h1>
        <div class="muted">${escapeHtml(co.address || "")}</div>
        <div class="muted">GSTIN: ${escapeHtml(co.gstin || "—")}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:16px;font-weight:700">STATEMENT OF ACCOUNT</div>
      <div class="muted">Period: ${data.start || "start"} to ${data.end || "today"}</div>
      <div class="muted">Generated: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  <div><b>Customer:</b> ${escapeHtml(data.customer)}</div>
  <div class="kpi">
    <div><span class="muted">Opening Balance</span><b>₹ ${data.opening_balance.toFixed(2)}</b></div>
    <div><span class="muted">Total Billed</span><b>₹ ${data.total_billed.toFixed(2)}</b></div>
    <div><span class="muted">Total Paid</span><b>₹ ${data.total_paid.toFixed(2)}</b></div>
    <div><span class="muted">Closing Balance</span><b>₹ ${data.closing_balance.toFixed(2)}</b></div>
  </div>
  <h2>Invoices</h2>
  <table><thead><tr><th>Date</th><th>Invoice</th><th class="num">Amount</th><th class="num">Paid</th><th>Status</th></tr></thead><tbody>${invRows || '<tr><td colspan="5" style="text-align:center">No invoices</td></tr>'}</tbody></table>
  <h2>Payments Received</h2>
  <table><thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>${payRows || '<tr><td colspan="5" style="text-align:center">No payments</td></tr>'}</tbody></table>
  <div class="closing">Closing Balance (Outstanding): ₹ ${data.closing_balance.toFixed(2)}</div>
  <div class="muted" style="margin-top:20px;text-align:center">This is a computer-generated statement. Please pay the closing balance at your earliest convenience.</div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script></body></html>`);
  w.document.close();
}

/* ============= COMPANY SETTINGS ============= */
function CompanyForm() {
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { billingApi.getCompany().then(setC); }, []);
  const set = (k, v) => setC(prev => ({ ...prev, [k]: v }));
  const uploadLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 500 * 1024) { toast.error("Logo max 500KB"); return; }
    const r = new FileReader(); r.onload = () => set("logo", r.result); r.readAsDataURL(f);
  };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await billingApi.saveCompany(c); toast.success("Saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };
  if (!c) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="font-heading text-3xl font-black tracking-tight">Company Details</h1>
      <p className="text-sm text-muted-foreground">These appear on every invoice PDF you print.</p>
      <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Company Name"><I data-testid="co-name" value={c.name} onChange={v => set("name", v)} /></F>
        <F label="GSTIN"><I data-testid="co-gstin" value={c.gstin} onChange={v => set("gstin", v)} /></F>
        <F label="PAN"><I value={c.pan} onChange={v => set("pan", v)} /></F>
        <F label="Phone"><I value={c.phone} onChange={v => set("phone", v)} /></F>
        <F label="Email"><I type="email" value={c.email} onChange={v => set("email", v)} /></F>
        <F label="Invoice Prefix"><I value={c.invoice_prefix} onChange={v => set("invoice_prefix", v)} /></F>
        <F label="Address" full><textarea rows={2} value={c.address} onChange={e => set("address", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /></F>
        <F label="Logo (max 500KB)" full>
          <div className="flex items-center gap-3">
            {c.logo && <img src={c.logo} alt="logo" className="h-12 w-12 rounded-lg object-contain bg-muted p-1" />}
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:bg-muted text-sm">
              <Upload className="w-4 h-4" /> {c.logo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
            </label>
            {c.logo && <button type="button" onClick={() => set("logo", null)} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted">Remove</button>}
          </div>
        </F>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Bank Details</div>
        <F label="Bank Name"><I data-testid="co-bank" value={c.bank_name} onChange={v => set("bank_name", v)} /></F>
        <F label="Account Number"><I data-testid="co-account" value={c.account_number} onChange={v => set("account_number", v)} /></F>
        <F label="IFSC"><I value={c.ifsc} onChange={v => set("ifsc", v)} /></F>
        <F label="Branch"><I value={c.branch} onChange={v => set("branch", v)} /></F>
        <F label="Invoice Footer" full><textarea rows={2} value={c.invoice_footer} onChange={e => set("invoice_footer", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /></F>
      </div>

      <div className="flex justify-end">
        <button data-testid="co-save" type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4" /> Save Company</button>
      </div>
    </form>
  );
}

function InvoiceView({ inv, company, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div><div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Invoice</div><h3 className="font-heading text-lg font-bold">{inv.invoice_no}</h3></div>
          <div className="flex gap-2">
            <a href={billingApi.invoicePdfUrl(inv.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-500/40 text-blue-700 text-xs font-semibold"><Download className="w-3.5 h-3.5" /> PDF</a>
            <button onClick={() => printInvoice(inv, company)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold"><Printer className="w-3.5 h-3.5" /> Print</button>
            <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3"><div><div className="text-xs text-muted-foreground">Customer</div><b>{inv.customer || "—"}</b><div className="text-xs">{inv.customer_gstin}</div></div><div><div className="text-xs text-muted-foreground">Date</div><b>{inv.date}</b></div></div>
          <table className="w-full text-xs border border-border rounded overflow-hidden">
            <thead className="bg-muted"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-left">HSN</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">GST%</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>{inv.lines.map((l, i) => (<tr key={i} className="border-t border-border"><td className="p-2">{l.name}</td><td className="p-2 font-mono">{l.hsn}</td><td className="p-2 text-right">{l.quantity}</td><td className="p-2 text-right">{inr(l.rate)}</td><td className="p-2 text-right">{l.gst_pct}%</td><td className="p-2 text-right tabular-nums font-semibold">{inr(l.amount)}</td></tr>))}</tbody>
          </table>
          <div className="grid grid-cols-2 text-sm">
            <div className="text-xs italic text-muted-foreground">
              <div className="font-bold text-foreground not-italic mb-1">Amount in words:</div>
              {amountToWords(inv.grand_total)}
            </div>
            <div className="space-y-1">
              <Row k="Subtotal" v={inv.subtotal} />
              {!inv.is_igst && <><Row k="CGST" v={inv.cgst} /><Row k="SGST" v={inv.sgst} /></>}
              {inv.is_igst && <Row k="IGST" v={inv.igst} />}
              <Row k="Round Off" v={inv.round_off} />
              <div className="flex justify-between pt-2 border-t-2 border-foreground text-base font-bold"><span>Grand Total</span><span className="text-emerald-500">{inr(inv.grand_total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const Row = ({ k, v }) => <div className="flex justify-between border-b border-border py-0.5"><span className="text-muted-foreground">{k}</span><span className="tabular-nums font-semibold">{inr(v)}</span></div>;

/* ============= DATA IMPORT — HISTORICAL EXCEL ============= */
function HistoricalImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [expanded, setExpanded] = useState({});

  const loadHistory = async () => {
    try { const d = await billingApi.historicalHistory(); setHistory(d.items || []); }
    catch { /* silent */ }
  };
  useEffect(() => { loadHistory(); }, []);

  const doPreview = async () => {
    if (!file) return toast.error("Please choose an Excel file first");
    setBusy(true); setPreview(null); setResult(null);
    try {
      const d = await billingApi.historicalPreview(file);
      setPreview(d);
      toast.success(`Parsed ${d.total_invoices} invoices (${d.total_line_items} line items)`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const doCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      const r = await billingApi.historicalCommit({
        filename: preview.filename,
        file_hash: preview.file_hash,
        invoices: preview.invoices,
        skip_duplicates: skipDuplicates,
      });
      setResult(r);
      setPreview(null); setFile(null);
      toast.success(`Imported ${r.imported_count} invoices · ${r.skipped_count} skipped · ${r.failed_count} failed`);
      loadHistory();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  const dupCount = preview?.duplicates?.length || 0;

  return (
    <div className="space-y-6" data-testid="historical-import">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Data Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import historical invoice + payment records from an Excel file.
          Invoice numbers, dates, tax values, TDS, retention, holds and payments are
          preserved <b>exactly as-is</b> — no recalculation from current Rate Master.
        </p>
      </div>

      {/* Step 1: Upload + Template */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Step 1 — Upload Excel</div>
            <label className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-border text-sm font-semibold cursor-pointer hover:bg-muted" data-testid="hist-file-btn">
              <Upload className="w-4 h-4" />
              {file ? file.name : "Choose .xlsx / .xls"}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); }} />
            </label>
            <button
              onClick={doPreview}
              disabled={!file || busy}
              data-testid="hist-preview-btn"
              className="ml-2 inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview
            </button>
          </div>
          <div className="text-right text-xs">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Excel Template</div>
            <a
              href={billingApi.historicalTemplateUrl()}
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-border text-sm font-semibold hover:bg-muted"
              data-testid="hist-template-btn"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <div className="mt-1 text-[10px] text-muted-foreground">3 sheets · Data / Instructions / Example</div>
          </div>
        </div>
      </div>

      {/* Step 2: Preview */}
      {preview && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4" data-testid="hist-preview">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Step 2 — Review Preview</div>
              <h2 className="font-heading text-lg font-bold mt-1">{preview.filename}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs inline-flex items-center gap-1.5">
                <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
                Skip duplicates
              </label>
              <button
                onClick={doCommit}
                disabled={committing}
                data-testid="hist-commit-btn"
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50"
              >
                {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Import ({preview.invoices.length - (skipDuplicates ? dupCount : 0)})
              </button>
            </div>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Invoices" value={preview.total_invoices} />
            <Stat label="Line Items" value={preview.total_line_items} />
            <Stat label="Duplicates" value={dupCount} warn={dupCount > 0} />
            <Stat label="Warnings" value={preview.warnings.length} warn={preview.warnings.length > 0} />
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> {preview.warnings.length} warning{preview.warnings.length > 1 ? "s" : ""}
              </div>
              <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">row {w.row}</span>
                    <span className="font-medium">{w.issue}</span>
                    {w.invoice_no && <span className="text-muted-foreground">({w.invoice_no})</span>}
                    {w.detail && <span className="text-muted-foreground truncate">— {w.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice list */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <Th>Invoice #</Th><Th>Date</Th><Th>Lines</Th><Th className="!text-right">Tax Value</Th><Th className="!text-right">Invoice Value</Th><Th className="!text-right">Paid</Th><Th className="!text-right">Pending</Th><Th>Status</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {preview.invoices.map((inv, idx) => {
                  const isExp = expanded[inv.invoice_no];
                  const isDup = preview.duplicates.includes(inv.invoice_no);
                  return (
                    <>
                      <tr key={inv.invoice_no} className={`border-b border-border last:border-0 ${isDup ? "bg-red-500/5" : ""}`}>
                        <td className="px-3 py-1.5 font-mono font-semibold">{inv.invoice_no}</td>
                        <td className="px-3 py-1.5">{inv.date}</td>
                        <td className="px-3 py-1.5">{inv.lines.length}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{inv.tax_value_raw != null ? inr(inv.tax_value_raw) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{inv.invoice_value_raw != null ? inr(inv.invoice_value_raw) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{inv.payment_received != null ? inr(inv.payment_received) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{inv.pending_balance != null ? inr(inv.pending_balance) : "—"}</td>
                        <td className="px-3 py-1.5">
                          {isDup && <span className="inline-block px-1.5 py-0.5 rounded bg-red-500/10 text-red-700 text-[10px] font-bold">DUP</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => setExpanded(e => ({ ...e, [inv.invoice_no]: !isExp }))} className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted">
                            {isExp ? "Hide" : "Lines"}
                          </button>
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-muted/30 border-b border-border">
                          <td colSpan={9} className="px-3 py-2">
                            <div className="grid grid-cols-4 gap-1 text-xs">
                              <div className="font-bold">Description</div>
                              <div className="font-bold text-right">Rate</div>
                              <div className="font-bold text-right">Qty</div>
                              <div className="font-bold text-right">Amount</div>
                              {inv.lines.map((l, li) => (
                                <>
                                  <div>{l.name}</div>
                                  <div className="text-right tabular-nums">₹{inr(l.rate)}</div>
                                  <div className="text-right tabular-nums">{l.quantity}</div>
                                  <div className="text-right tabular-nums">₹{inr(l.amount)}</div>
                                </>
                              ))}
                              {(inv.tds || inv.retention || inv.sla_penalty) && (
                                <div className="col-span-4 mt-2 text-muted-foreground">
                                  {inv.tds ? <span className="mr-3">TDS: ₹{inr(inv.tds)}</span> : ""}
                                  {inv.sla_penalty ? <span className="mr-3">SLA Penalty: ₹{inr(inv.sla_penalty)}</span> : ""}
                                  {inv.retention ? <span className="mr-3">Retention: ₹{inr(inv.retention)}</span> : ""}
                                  {inv.remarks ? <span>Remarks: {inv.remarks}</span> : ""}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {result && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" /> Import Complete
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            <Stat label="Imported" value={result.imported_count} />
            <Stat label="Skipped" value={result.skipped_count} />
            <Stat label="Failed" value={result.failed_count} warn={result.failed_count > 0} />
            <Stat label="Total" value={result.total_provided} />
          </div>
          {result.failed_count > 0 && (
            <div className="mt-3 text-xs">
              <div className="font-bold text-red-700 mb-1">Failed:</div>
              {result.failed.map((f, i) => (<div key={i}>{f.invoice_no}: {f.reason}</div>))}
            </div>
          )}
        </div>
      )}

      {/* Import History */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-heading font-bold">Import History</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border">
            <tr><Th>When</Th><Th>File</Th><Th className="!text-right">Imported</Th><Th className="!text-right">Skipped</Th><Th className="!text-right">Failed</Th></tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No imports yet</td></tr>
            )}
            {history.map(h => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">{h.created_at.slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-1.5 font-mono">{h.filename}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">{h.imported_count}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{h.skipped_count}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-red-600">{h.failed_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={`rounded-lg border ${warn ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-muted/30"} px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{label}</div>
      <div className={`text-xl font-heading font-black tabular-nums ${warn ? "text-amber-700" : ""}`}>{value}</div>
    </div>
  );
}

/* NOTE: printInvoice / previewInvoice / renderInvoiceHTML now live in /app/frontend/src/lib/invoiceRenderer.js */
const escapeHtml = (s) => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ============= AUDIT LOG ============= */
function AuditLog() {
  const [rows, setRows] = useState([]);
  useEffect(() => { billingApi.audit().then(d => setRows(d.items)); }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-black tracking-tight">Audit Log</h1>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr><Th>Time</Th><Th>Entity</Th><Th>Action</Th><Th>Detail</Th><Th>By</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No events</td></tr>}
            {rows.map(l => (
              <tr key={l.id} className="border-b border-border last:border-0"><td className="px-3 py-1.5 text-xs">{l.timestamp.slice(0, 19).replace("T", " ")}</td><td className="px-3 py-1.5 text-xs uppercase font-bold text-muted-foreground">{l.entity}</td><td className="px-3 py-1.5 text-xs font-semibold">{l.action}</td><td className="px-3 py-1.5">{l.detail}</td><td className="px-3 py-1.5 text-xs">{l.actor}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============= tiny UI ============= */
const Th = ({ children, className = "" }) => <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>;
const F = ({ label, children, full }) => (<label className={`block ${full ? "sm:col-span-2" : ""}`}><span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>{children}</label>);
const I = ({ value, onChange, type = "text", ...props }) => <input {...props} type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />;
const Num = ({ value, onChange, ...props }) => <input {...props} type="number" step="0.01" value={value ?? ""} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />;
const Sel = ({ value, onChange, options }) => <select value={value || ""} onChange={e => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
