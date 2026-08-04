import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, Plus, Pencil, Trash2, Search, Download, Upload,
  Power, Save, FileText, History, ClipboardList, Sparkles, ScrollText, Printer, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/lib/theme";
import { billingApi } from "@/lib/billingApi";
import { inr } from "@/lib/format";

const TABS = [
  { key: "rates", label: "Rate Master", icon: ClipboardList },
  { key: "new", label: "New Invoice (WCC)", icon: Sparkles },
  { key: "invoices", label: "Invoices", icon: FileText },
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
          {tab === "invoices" && <InvoiceList />}
          {tab === "audit" && <AuditLog />}
          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">© 2026 Prathvi Power Solutions · Vendor Billing</footer>
        </div>
      </main>
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

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
      // Show print
      printInvoice(inv);
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
function InvoiceList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const load = async () => setRows((await billingApi.listInvoices({ q })).items);
  useEffect(() => { load(); }, [q]); // eslint-disable-line
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="font-heading text-3xl font-black tracking-tight">Invoices</h1></div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search invoice, customer…" className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr><Th>Invoice</Th><Th>Date</Th><Th>Customer</Th><Th className="text-right">Subtotal</Th><Th className="text-right">Tax</Th><Th className="text-right">Grand Total</Th><Th></Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No invoices yet</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-3 py-2 font-mono text-xs">{r.invoice_no}</td>
                <td className="px-3 py-2 text-xs">{r.date}</td>
                <td className="px-3 py-2">{r.customer || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(r.subtotal)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(r.cgst + r.sgst + r.igst)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-500">{inr(r.grand_total)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setSelected(r)} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted">View</button>
                  <a href={billingApi.invoiceExcelUrl(r.id)} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted ml-1">Excel</a>
                  <button onClick={() => printInvoice(r)} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted ml-1">Print</button>
                  <button onClick={async () => { if (window.confirm(`Delete ${r.invoice_no}?`)) { await billingApi.deleteInvoice(r.id); toast.success("Deleted"); load(); } }} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && <InvoiceView inv={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function InvoiceView({ inv, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div><div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Invoice</div><h3 className="font-heading text-lg font-bold">{inv.invoice_no}</h3></div>
          <div className="flex gap-2">
            <button onClick={() => printInvoice(inv)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold"><Printer className="w-3.5 h-3.5" /> Print</button>
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
            <div />
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

function printInvoice(inv) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { toast.error("Enable popups"); return; }
  const lines = inv.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(l.name)}</td><td>${l.hsn || ""}</td><td>${l.unit}</td><td class="num">${l.quantity}</td><td class="num">₹${l.rate.toFixed(2)}</td><td class="num">${l.gst_pct}%</td><td class="num">₹${l.amount.toFixed(2)}</td></tr>`).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>${inv.invoice_no}</title><style>
    body{font-family:system-ui,sans-serif;padding:28px;color:#111}
    h1{margin:0}.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
    th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}th{background:#f4f4f5}
    .num{text-align:right}.tot{margin-top:16px;width:280px;margin-left:auto}
    .grand{margin-top:6px;padding:8px;background:#f4f4f5;text-align:right;font-weight:700;font-size:16px}
    .muted{color:#666;font-size:11px}
  </style></head><body>
  <div class="head"><div><h1>R K ENTERPRISES</h1><div class="muted">Tax Invoice</div></div><div style="text-align:right;font-size:12px"><b>${inv.invoice_no}</b><br/>Date: ${inv.date}</div></div>
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">
    <div><b>Bill To</b><br/>${escapeHtml(inv.customer || "-")}<br/>${escapeHtml(inv.customer_address || "")}<br/>GSTIN: ${escapeHtml(inv.customer_gstin || "-")}</div>
    <div><b>Place of Supply</b><br/>${escapeHtml(inv.place_of_supply || "-")}<br/>${inv.is_igst ? "IGST (Inter-state)" : "CGST + SGST"}</div>
  </div>
  <table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">GST%</th><th class="num">Amount</th></tr></thead><tbody>${lines}</tbody></table>
  <table class="tot" style="border:0"><tr><td style="border:0">Subtotal</td><td style="border:0" class="num">₹${inv.subtotal.toFixed(2)}</td></tr>
  ${!inv.is_igst ? `<tr><td style="border:0">CGST</td><td style="border:0" class="num">₹${inv.cgst.toFixed(2)}</td></tr><tr><td style="border:0">SGST</td><td style="border:0" class="num">₹${inv.sgst.toFixed(2)}</td></tr>` : `<tr><td style="border:0">IGST</td><td style="border:0" class="num">₹${inv.igst.toFixed(2)}</td></tr>`}
  <tr><td style="border:0">Round Off</td><td style="border:0" class="num">₹${inv.round_off.toFixed(2)}</td></tr></table>
  <div class="grand">Grand Total: ₹ ${inv.grand_total.toFixed(2)}</div>
  <div class="muted" style="margin-top:20px">This is a system-generated invoice. WCC ref: ${escapeHtml(inv.wcc_filename || "-")}</div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script></body></html>`);
  w.document.close();
}
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
