import { useEffect, useMemo, useState } from "react";
import { Menu, X, Zap, Package, LayoutDashboard, Cable, Cpu, Database,
  Settings2, Plus, Search, Upload, Trash2, Edit2, History, Loader2,
  Camera, ImageOff, FileText, ShieldCheck, GitBranch, Download, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Toaster, toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useTheme } from "@/lib/theme";
import { inventoryApi, MASTER_TYPES, SM_STATUSES, OM_CONDITIONS, OM_DEPOSITS } from "@/lib/inventoryApi";
import { formatApiError } from "@/lib/adminApi";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "smart", label: "Smart Meter", icon: Cpu },
  { key: "old", label: "Old Meter", icon: Cpu },
  { key: "cable", label: "Cable", icon: Cable },
  { key: "install", label: "Installation", icon: ShieldCheck },
  { key: "gatepass", label: "Gate Pass", icon: FileText },
  { key: "cableissue", label: "Cable Issue", icon: Upload },
  { key: "bisignoff", label: "BISignoff", icon: FileText },
  { key: "history", label: "History", icon: GitBranch },
  { key: "reports", label: "Reports", icon: BarChart2 },
  { key: "master", label: "Master Data", icon: Settings2 },
];

const STATUS_STYLE = {
  Available: "bg-emerald-500/10 text-emerald-600",
  Issued: "bg-amber-500/10 text-amber-700",
  Installed: "bg-blue-500/10 text-blue-600",
  Returned: "bg-purple-500/10 text-purple-600",
  Damaged: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  Defective: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  Pending: "bg-amber-500/10 text-amber-700",
  Deposited: "bg-emerald-500/10 text-emerald-600",
  Verified: "bg-blue-500/10 text-blue-600",
};

const PIE_COLORS = ["#22C55E", "#F59E0B", "#0EA5E9", "#8B5CF6", "#EF4444"];

export default function InventoryPage() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="inventory" />
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="inventory" onClose={() => setMobileNav(false)} />
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 glass border-b border-border">
          <div className="px-4 sm:px-8 h-16 flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center" onClick={() => setMobileNav(v => !v)}>
              {mobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center"><Package className="w-4 h-4" /></div>
              <span className="font-heading font-black">Inventory</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Module</div>
              <div className="font-heading font-bold">Smart Meter &amp; Material Inventory</div>
            </div>
          </div>
          <nav className="px-4 sm:px-8 border-t border-border overflow-x-auto no-scrollbar">
            <div className="flex gap-1 py-2">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button key={t.key} data-testid={`inv-tab-${t.key}`} onClick={() => setTab(t.key)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                      ${active ? "bg-foreground text-background" : "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}>
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="px-4 sm:px-8 py-6 space-y-6 max-w-[1600px]">
          {tab === "dashboard" && <Dashboard />}
          {tab === "smart" && <SmartMeters />}
          {tab === "old" && <OldMeters />}
          {tab === "cable" && <Cables />}
          {tab === "install" && <Installations />}
          {tab === "gatepass" && <GatePasses />}
          {tab === "cableissue" && <CableIssues />}
          {tab === "bisignoff" && <BISignoffs />}
          {tab === "history" && <CrossHistory />}
          {tab === "reports" && <Reports />}
          {tab === "master" && <MasterData />}
          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">
            © 2026 Prathvi Power Solutions · Inventory Module (Session A)
          </footer>
        </div>
      </main>

      <MobileBottomNav />
      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { inventoryApi.dashboard().then(setD).catch(() => {}); }, []);
  if (!d) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { group: "Smart Meter", tint: "emerald", items: [
      { k: "Total", v: d.smart.total }, { k: "Available", v: d.smart.available },
      { k: "Issued", v: d.smart.issued }, { k: "Installed", v: d.smart.installed },
      { k: "Returned", v: d.smart.returned }, { k: "Damaged", v: d.smart.damaged },
    ]},
    { group: "Old Meter", tint: "purple", items: [
      { k: "Total Removed", v: d.old.total_removed }, { k: "Deposited", v: d.old.deposited },
      { k: "Pending Deposit", v: d.old.pending_deposit }, { k: "Damaged", v: d.old.damaged },
      { k: "In Store", v: d.old.available_in_store },
    ]},
    { group: "Cable", tint: "amber", items: [
      { k: "Total Received", v: d.cable.total_received }, { k: "Issued", v: d.cable.total_issued },
      { k: "Used", v: d.cable.total_used }, { k: "Available Balance", v: d.cable.available_balance },
      { k: "Returned", v: d.cable.returned }, { k: "Damaged", v: d.cable.damaged },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Inventory Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live stock across smart meters, old meters, and cable inventory.</p>
      </div>

      {cards.map(g => (
        <div key={g.group}>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">{g.group}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {g.items.map(it => (
              <div key={it.k} data-testid={`kpi-${g.group}-${it.k}`.toLowerCase().replace(/\s+/g,'-')}
                className="rounded-2xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{it.k}</div>
                <div className="mt-1 font-heading text-xl font-black tabular-nums">{it.v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-heading font-bold mb-2">Smart Meter · Status</div>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.status_distribution} dataKey="value" nameKey="name" outerRadius={80} label={(e)=>e.name}>
                  {d.status_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <div className="font-heading font-bold mb-2">Division-wise Smart Meter Stock</div>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={d.division_stock}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="division" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="#0EA5E9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-heading font-bold text-sm flex items-center gap-2">
          <History className="w-4 h-4" /> Recent Transactions
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {d.recent_transactions.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No transactions yet</div>}
          {d.recent_transactions.map((r, i) => (
            <div key={i} className="px-4 py-2 grid grid-cols-12 gap-2 text-xs items-center">
              <div className="col-span-3 text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</div>
              <div className="col-span-2"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted uppercase">{r.entity}</span></div>
              <div className="col-span-2 font-semibold uppercase">{r.action}</div>
              <div className="col-span-4 truncate text-muted-foreground">{r.detail || "—"}</div>
              <div className="col-span-1 truncate text-right text-muted-foreground">{r.actor?.split("@")[0]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= SMART METERS ================= */
function SmartMeters() {
  return <CrudList
    title="Smart Meter Inventory"
    subtitle="Every smart meter received, issued and installed — with immutable history."
    testidPrefix="sm"
    listApi={inventoryApi.listSmart}
    addApi={inventoryApi.addSmart}
    updateApi={inventoryApi.updateSmart}
    deleteApi={inventoryApi.deleteSmart}
    importApi={inventoryApi.importSmart}
    columns={[
      { key: "serial_number", label: "Serial No", mono: true, bold: true },
      { key: "meter_make", label: "Make" },
      { key: "meter_model", label: "Model" },
      { key: "batch_number", label: "Batch" },
      { key: "division", label: "Division" },
      { key: "vendor", label: "Vendor" },
      { key: "status", label: "Status", badge: true },
    ]}
    filters={[
      { key: "status", label: "Any status", options: SM_STATUSES },
    ]}
    formFields={[
      { key: "serial_number", label: "Serial Number *", required: true, upper: true },
      { key: "meter_make", label: "Meter Make" },
      { key: "meter_model", label: "Meter Model" },
      { key: "meter_type", label: "Meter Type" },
      { key: "rating", label: "Rating" },
      { key: "batch_number", label: "Batch Number" },
      { key: "purchase_date", label: "Purchase Date", type: "date" },
      { key: "received_qty", label: "Received Qty", type: "number" },
      { key: "status", label: "Status", type: "select", options: SM_STATUSES },
      { key: "division", label: "Division" },
      { key: "sub_division", label: "Sub Division" },
      { key: "sdo", label: "SDO" },
      { key: "store_location", label: "Store Location" },
      { key: "vendor", label: "Vendor / Agency" },
      { key: "remarks", label: "Remarks", full: true },
    ]}
  />;
}

/* ================= OLD METERS ================= */
function OldMeters() {
  return <CrudList
    title="Old Digital Meter Inventory"
    subtitle="Removed meters — track condition and deposit status back to DISCOM."
    testidPrefix="om"
    listApi={inventoryApi.listOld}
    addApi={inventoryApi.addOld}
    updateApi={inventoryApi.updateOld}
    deleteApi={inventoryApi.deleteOld}
    importApi={inventoryApi.importOld}
    columns={[
      { key: "serial_number", label: "Serial No", mono: true, bold: true },
      { key: "consumer_number", label: "Consumer" },
      { key: "consumer_name", label: "Consumer Name" },
      { key: "removal_date", label: "Removed" },
      { key: "condition", label: "Condition", badge: true },
      { key: "deposit_status", label: "Deposit", badge: true },
    ]}
    filters={[
      { key: "condition", label: "Any condition", options: OM_CONDITIONS },
      { key: "deposit_status", label: "Any deposit", options: OM_DEPOSITS },
    ]}
    formFields={[
      { key: "serial_number", label: "Serial Number *", required: true, upper: true },
      { key: "consumer_number", label: "Consumer Number" },
      { key: "consumer_name", label: "Consumer Name" },
      { key: "meter_make", label: "Make" },
      { key: "meter_model", label: "Model" },
      { key: "meter_type", label: "Type" },
      { key: "removal_date", label: "Removal Date", type: "date" },
      { key: "division", label: "Division" },
      { key: "sub_division", label: "Sub Division" },
      { key: "sdo", label: "SDO" },
      { key: "installer", label: "Installer / Agency" },
      { key: "condition", label: "Condition", type: "select", options: OM_CONDITIONS },
      { key: "deposit_status", label: "Deposit Status", type: "select", options: OM_DEPOSITS },
      { key: "deposit_date", label: "Deposit Date", type: "date" },
      { key: "store_location", label: "Store Location" },
      { key: "remarks", label: "Remarks", full: true },
    ]}
  />;
}

/* ================= CABLES ================= */
function Cables() {
  return <CrudList
    title="Cable Inventory"
    subtitle="Stock ledger per drum. Balance = Opening + Received + Returned − Issued − Damaged."
    testidPrefix="cb"
    listApi={inventoryApi.listCables}
    addApi={inventoryApi.addCable}
    updateApi={inventoryApi.updateCable}
    deleteApi={inventoryApi.deleteCable}
    importApi={inventoryApi.importCables}
    columns={[
      { key: "drum_number", label: "Drum", mono: true, bold: true },
      { key: "cable_type", label: "Type" },
      { key: "cable_size", label: "Size" },
      { key: "make", label: "Make" },
      { key: "received_qty", label: "Received", num: true },
      { key: "issued_qty", label: "Issued", num: true },
      { key: "used_qty", label: "Used", num: true },
      { key: "balance_qty", label: "Balance", num: true, bold: true },
    ]}
    filters={[]}
    formFields={[
      { key: "drum_number", label: "Drum Number *", required: true, upper: true },
      { key: "cable_type", label: "Cable Type *", required: true },
      { key: "cable_size", label: "Cable Size *", required: true },
      { key: "cable_spec", label: "Specification" },
      { key: "make", label: "Make" },
      { key: "batch_number", label: "Batch Number" },
      { key: "unit", label: "Unit (meter/kg)" },
      { key: "opening_stock", label: "Opening Stock", type: "number" },
      { key: "received_qty", label: "Received Qty", type: "number" },
      { key: "issued_qty", label: "Issued Qty", type: "number" },
      { key: "used_qty", label: "Used Qty", type: "number" },
      { key: "returned_qty", label: "Returned Qty", type: "number" },
      { key: "damaged_qty", label: "Damaged Qty", type: "number" },
      { key: "division", label: "Division" },
      { key: "sub_division", label: "Sub Division" },
      { key: "sdo", label: "SDO" },
      { key: "store_location", label: "Store Location" },
      { key: "receipt_date", label: "Receipt Date", type: "date" },
      { key: "remarks", label: "Remarks", full: true },
    ]}
  />;
}

/* ================= MASTER DATA ================= */
function MasterData() {
  const [type, setType] = useState("division");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await inventoryApi.listMasters(type); setItems(d.items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [type]);

  const add = async () => {
    if (!name.trim()) return toast.error("Enter a name");
    try {
      await inventoryApi.addMaster({ type, name: name.trim(), code: code.trim() || null });
      setName(""); setCode(""); toast.success("Added"); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    try { await inventoryApi.deleteMaster(m.id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const importFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const res = await inventoryApi.importMasters(type, f);
      toast.success(`${res.imported} imported · ${res.skipped} skipped`);
      load();
    } catch (er) { toast.error(formatApiError(er)); }
    finally { setImporting(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Master Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">Divisions, SDOs, agencies, meter makes, cable types & sizes — all in one place.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MASTER_TYPES.map(m => (
          <button key={m.key} data-testid={`master-tab-${m.key}`} onClick={() => setType(m.key)}
            className={`text-xs px-3 py-1.5 rounded-full ${type===m.key ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
        <input data-testid="master-name" value={name} onChange={e => setName(e.target.value)}
          placeholder={`New ${MASTER_TYPES.find(m=>m.key===type)?.label}`}
          className="flex-1 min-w-[180px] h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code (optional)"
          className="w-32 h-10 px-3 rounded-lg bg-background border border-border text-sm" />
        <button data-testid="master-add" onClick={add} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
        <label className="h-10 px-4 rounded-lg border border-border text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-muted">
          {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
          Excel Import
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFile} disabled={importing} />
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
          {loading && <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin"/></div>}
          {!loading && items.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No entries. Add or import.</div>}
          {items.map(m => (
            <div key={m.id} className="px-4 py-2 flex items-center gap-3 text-sm">
              <div className="flex-1 font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.code || ""}</div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${m.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{m.active ? "active" : "inactive"}</span>
              <button onClick={() => remove(m)} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= GENERIC CRUD LIST + DIALOG ================= */
function CrudList({ title, subtitle, testidPrefix, listApi, addApi, updateApi, deleteApi, importApi, columns, filters, formFields }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterState, setFilterState] = useState({});
  const [page, setPage] = useState(1);
  const [dlg, setDlg] = useState(null);
  const [history, setHistory] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { q, page: p, page_size: 25, ...filterState };
      const d = await listApi(params);
      setData(d); setPage(p);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); /* eslint-disable-line */ }, []);

  const remove = async (row) => {
    const key = row.serial_number || row.drum_number || row.id;
    if (!window.confirm(`Delete ${key}?`)) return;
    try { await deleteApi(row.id); toast.success("Deleted"); load(page); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const importFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const res = await importApi(f);
      toast.success(`${res.imported} imported · ${res.skipped} skipped`);
      if (res.errors?.length) toast.warning(`${res.errors.length} rows had errors`);
      load(1);
    } catch (er) { toast.error(formatApiError(er)); }
    finally { setImporting(false); e.target.value = ""; }
  };

  const viewHistory = async (row) => {
    try {
      const d = await inventoryApi.ledger({ entity: testidPrefix === "sm" ? "smart_meter" : testidPrefix === "om" ? "old_meter" : "cable", entity_id: row.id });
      setHistory({ row, items: d.items });
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const pageCount = Math.max(1, Math.ceil(data.total / 25));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-6 gap-2">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input data-testid={`${testidPrefix}-search`} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
            placeholder="Search serial, batch, drum…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm" />
        </div>
        {filters.map(f => (
          <select key={f.key} value={filterState[f.key] || ""} onChange={e => setFilterState(s => ({ ...s, [f.key]: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
            <option value="">{f.label}</option>
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <button onClick={() => load(1)} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">Search</button>
        <div className="flex gap-2">
          <label className="flex-1 h-10 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-muted">
            {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
            Import
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFile} disabled={importing} />
          </label>
          <button data-testid={`${testidPrefix}-add`} onClick={() => setDlg({ mode: "new" })}
            className="flex-1 h-10 px-3 rounded-lg bg-foreground text-background text-xs font-semibold inline-flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-xs text-muted-foreground">{data.total} rows · page {page}/{pageCount}</div>
          <div className="flex gap-1">
            <button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 h-7 text-xs border border-border rounded-md disabled:opacity-40">Prev</button>
            <button onClick={() => load(Math.min(pageCount, page + 1))} disabled={page >= pageCount} className="px-2 h-7 text-xs border border-border rounded-md disabled:opacity-40">Next</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
              <tr>
                {columns.map(c => <th key={c.key} className={`px-3 py-2 font-bold whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}>{c.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={columns.length + 1} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
              {!loading && data.items.length === 0 && <tr><td colSpan={columns.length + 1} className="text-center py-6 text-sm text-muted-foreground">No records</td></tr>}
              {data.items.map(r => (
                <tr key={r.id} data-testid={`${testidPrefix}-row-${r.serial_number || r.drum_number || r.id}`}
                  className="border-t border-border hover:bg-muted/30">
                  {columns.map(c => (
                    <td key={c.key} className={`px-3 py-1.5 whitespace-nowrap ${c.mono ? "font-mono text-xs" : ""} ${c.bold ? "font-semibold" : ""} ${c.num ? "text-right tabular-nums" : ""}`}>
                      {c.badge
                        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[r[c.key]] || "bg-muted"}`}>{r[c.key] || "—"}</span>
                        : (r[c.key] ?? <span className="text-muted-foreground">—</span>)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 whitespace-nowrap text-right">
                    <button onClick={() => viewHistory(r)} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center" title="History"><History className="w-3.5 h-3.5"/></button>
                    <button onClick={() => setDlg({ mode: "edit", row: r })} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center"><Edit2 className="w-3.5 h-3.5"/></button>
                    <button onClick={() => remove(r)} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3.5 h-3.5"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dlg && <CrudDialog mode={dlg.mode} row={dlg.row} fields={formFields}
        addApi={addApi} updateApi={updateApi}
        onClose={() => setDlg(null)}
        onSaved={() => { setDlg(null); load(page); }} />}

      {history && <HistoryDialog row={history.row} items={history.items} onClose={() => setHistory(null)} />}
    </div>
  );
}

function CrudDialog({ mode, row, fields, addApi, updateApi, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [f, setF] = useState(() => {
    const base = {};
    fields.forEach(fld => { base[fld.key] = row?.[fld.key] ?? (fld.type === "number" ? 0 : ""); });
    return base;
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    for (const fld of fields.filter(x => x.required)) {
      if (!f[fld.key] || (typeof f[fld.key] === "string" && !f[fld.key].trim())) {
        return toast.error(`${fld.label} is required`);
      }
    }
    setBusy(true);
    try {
      const payload = { ...f };
      // Coerce numbers, uppers, empty→null
      fields.forEach(fld => {
        if (fld.type === "number") payload[fld.key] = Number(payload[fld.key] || 0);
        if (fld.upper && typeof payload[fld.key] === "string") payload[fld.key] = payload[fld.key].trim().toUpperCase();
        if (payload[fld.key] === "") delete payload[fld.key];
      });
      if (isEdit) await updateApi(row.id, payload); else await addApi(payload);
      toast.success(isEdit ? "Updated" : "Added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading text-lg font-bold">{isEdit ? "Edit" : "New"} Record</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(fld => (
            <div key={fld.key} className={fld.full ? "sm:col-span-2" : ""}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{fld.label}</label>
              {fld.type === "select" ? (
                <select value={f[fld.key] || ""} onChange={e => setF(s => ({ ...s, [fld.key]: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                  <option value="">—</option>
                  {fld.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={fld.type || "text"} value={f[fld.key] ?? ""} onChange={e => setF(s => ({ ...s, [fld.key]: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button data-testid="crud-save" onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryDialog({ row, items, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">History</div>
            <h3 className="font-heading text-lg font-bold">{row.serial_number || row.drum_number || row.id}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No history yet</div>}
          {items.map((h, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase">{h.action}</span>
                <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</span>
              </div>
              {h.detail && <div className="mt-1 text-sm">{h.detail}</div>}
              {h.actor && <div className="mt-1 text-[11px] text-muted-foreground">By {h.actor}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SESSION B COMPONENTS
   ================================================================ */

async function compressPhoto(file, maxEdge = 1400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
      const s = Math.min(maxEdge / width, maxEdge / height);
      width = Math.round(width * s); height = Math.round(height * s);
    }
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    let quality = 0.85, dataUrl = c.toDataURL("image/jpeg", quality);
    while (dataUrl.length > 2 * 1024 * 1024 && quality > 0.4) {
      quality -= 0.15; dataUrl = c.toDataURL("image/jpeg", quality);
    }
    return { dataUrl, name: (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg" };
  } finally { URL.revokeObjectURL(url); }
}

function PhotoInput({ label, value, name, onChange, testid }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      if (f.type.startsWith("image/")) {
        const c = await compressPhoto(f);
        onChange(c.dataUrl, c.name);
      } else {
        // PDF etc — read as base64
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result, f.name);
        reader.readAsDataURL(f);
      }
    } finally { setBusy(false); e.target.value = ""; }
  };
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</label>
      {value ? (
        <div className="mt-1 relative rounded-lg border border-border overflow-hidden bg-muted">
          {value.startsWith("data:image") ? (
            <img src={value} alt={name} className="w-full max-h-40 object-contain bg-black/5" />
          ) : (
            <div className="p-3 text-xs flex items-center gap-2"><FileText className="w-4 h-4"/> {name || "document"}</div>
          )}
          <button type="button" onClick={() => onChange(null, null)}
            className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center">
            <ImageOff className="w-4 h-4"/>
          </button>
        </div>
      ) : (
        <label className="mt-1 h-11 rounded-lg border border-dashed border-border text-xs font-semibold inline-flex items-center justify-center gap-2 w-full cursor-pointer hover:bg-muted">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4"/>}
          {busy ? "Processing…" : "Choose file / snap"}
          <input data-testid={testid} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
        </label>
      )}
    </div>
  );
}

/* --------- Installations --------- */
function Installations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null);
  const load = async () => {
    setLoading(true);
    try { setItems((await inventoryApi.listInstallations({ page_size: 100 })).items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Installations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log a smart meter installation. Auto-updates meter status → Installed and creates the old meter record.</p>
        </div>
        <button onClick={() => setDlg({})} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="w-4 h-4"/>New Installation</button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr><th className="px-3 py-2 text-left">Date</th><th className="text-left">Consumer</th><th className="text-left">New Serial</th><th className="text-left">Old Serial</th><th className="text-left">Division</th><th className="text-left">Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No installations yet</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 text-xs">{r.installation_date}</td>
                <td className="px-3 py-1.5"><div className="font-semibold">{r.consumer_name}</div><div className="text-[10px] text-muted-foreground">{r.consumer_number}</div></td>
                <td className="px-3 py-1.5 font-mono text-xs">{r.new_meter_serial}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{r.old_meter_serial || "—"}</td>
                <td className="px-3 py-1.5 text-xs">{r.division || "—"}</td>
                <td className="px-3 py-1.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[r.status] || "bg-muted"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlg && <InstallDialog onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
    </div>
  );
}

function InstallDialog({ onClose, onSaved }) {
  const [f, setF] = useState({
    installation_date: new Date().toISOString().slice(0,10),
    consumer_name: "", consumer_number: "", new_meter_serial: "",
    old_meter_serial: "", division: "", sub_division: "", sdo: "",
    installer: "", agency: "", mobile_number: "", address: "", status: "Installed",
    before_photo: null, before_name: null,
    after_photo: null, after_name: null,
    meter_photo: null, meter_name: null,
    remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.consumer_name || !f.consumer_number || !f.new_meter_serial) return toast.error("Consumer + new meter serial required");
    setBusy(true);
    try {
      await inventoryApi.addInstallation({ ...f, new_meter_serial: f.new_meter_serial.toUpperCase(),
        old_meter_serial: f.old_meter_serial?.toUpperCase() || null });
      toast.success("Installation logged"); onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const inp = (k, label, opts = {}) => (
    <div className={opts.full ? "sm:col-span-2" : ""}>
      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</label>
      <input type={opts.type || "text"} value={f[k] || ""} onChange={e => set(k, e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-heading text-lg font-bold">New Installation</h3>
          <button onClick={onClose}><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inp("installation_date", "Date *", { type: "date" })}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
            <select value={f.status} onChange={e => set("status", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
              {["Pending","Installed","Rejected","Revisit Required","Completed"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {inp("consumer_name", "Consumer Name *")}
          {inp("consumer_number", "Consumer Number *")}
          {inp("new_meter_serial", "New Smart Meter Serial *")}
          {inp("old_meter_serial", "Old Meter Serial (optional)")}
          {inp("division", "Division")}
          {inp("sub_division", "Sub Division")}
          {inp("sdo", "SDO")}
          {inp("installer", "Installer")}
          {inp("agency", "Agency / Vendor")}
          {inp("mobile_number", "Mobile Number")}
          {inp("address", "Address", { full: true })}
          <PhotoInput label="Before Photo" value={f.before_photo} name={f.before_name} testid="inst-before"
            onChange={(v, n) => { set("before_photo", v); set("before_name", n); }} />
          <PhotoInput label="After Photo" value={f.after_photo} name={f.after_name} testid="inst-after"
            onChange={(v, n) => { set("after_photo", v); set("after_name", n); }} />
          <PhotoInput label="Meter Photo" value={f.meter_photo} name={f.meter_name} testid="inst-meter"
            onChange={(v, n) => { set("meter_photo", v); set("meter_name", n); }} />
          {inp("remarks", "Remarks", { full: true })}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Gate Passes --------- */
function GatePasses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null);
  const load = async () => {
    setLoading(true);
    try { setItems((await inventoryApi.listGatePasses({ page_size: 100 })).items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Gate Pass</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ship meters out. Serial validation blocks already-Issued/Installed/Damaged. Approved gate pass auto-issues the meters.</p>
        </div>
        <button onClick={() => setDlg({})} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="w-4 h-4"/>New Gate Pass</button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr><th className="text-left px-3 py-2">Number</th><th className="text-left">Date</th><th className="text-left">From→To</th><th className="text-left">Meters</th><th className="text-left">Vehicle</th><th className="text-left">Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No gate passes</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 font-mono text-xs font-semibold">{r.gate_pass_number}</td>
                <td className="px-3 py-1.5 text-xs">{r.gate_pass_date}</td>
                <td className="px-3 py-1.5 text-xs">{r.from_location} → {r.to_location}</td>
                <td className="px-3 py-1.5 text-xs">{r.meter_serials?.length || 0}</td>
                <td className="px-3 py-1.5 text-xs">{r.vehicle_number || "—"}</td>
                <td className="px-3 py-1.5">
                  <select value={r.status} onChange={async (e) => {
                    try { await inventoryApi.updateGatePass(r.id, { status: e.target.value }); toast.success("Updated"); load(); }
                    catch (er) { toast.error(formatApiError(er)); }
                  }} className={`text-xs font-bold px-2 py-1 rounded-full border-0 ${STATUS_STYLE[r.status] || "bg-muted"}`}>
                    {["Draft","Submitted","Approved","Rejected","Completed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlg && <GatePassDialog onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
    </div>
  );
}

function GatePassDialog({ onClose, onSaved }) {
  const [f, setF] = useState({
    gate_pass_number: "", gate_pass_date: new Date().toISOString().slice(0,10),
    from_location: "", to_location: "", meter_serials: "",
    vehicle_number: "", driver_name: "", driver_mobile: "", agency: "",
    purpose: "", prepared_by: "", approved_by: "", status: "Submitted",
    document: null, document_name: null, remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.gate_pass_number || !f.from_location || !f.to_location) return toast.error("Number, from + to are required");
    setBusy(true);
    try {
      const serials = f.meter_serials.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean);
      await inventoryApi.addGatePass({ ...f, meter_serials: serials });
      toast.success("Gate pass created"); onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-heading text-lg font-bold">New Gate Pass</h3>
          <button onClick={onClose}><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["gate_pass_number", "GP Number *"],
            ["gate_pass_date", "Date *", "date"],
            ["from_location", "From *"],
            ["to_location", "To *"],
            ["vehicle_number", "Vehicle"],
            ["driver_name", "Driver"],
            ["driver_mobile", "Driver Mobile"],
            ["agency", "Agency"],
            ["purpose", "Purpose"],
            ["prepared_by", "Prepared By"],
            ["approved_by", "Approved By"],
          ].map(([k, l, t]) => (
            <div key={k}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{l}</label>
              <input type={t || "text"} value={f[k] || ""} onChange={e => set(k, e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
            </div>
          ))}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
            <select value={f.status} onChange={e => set("status", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
              {["Draft","Submitted","Approved","Rejected","Completed"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Meter Serials (comma or newline separated)</label>
            <textarea rows={3} value={f.meter_serials} onChange={e => set("meter_serials", e.target.value)}
              placeholder="SM-001, SM-002, SM-003"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono" />
            <p className="mt-1 text-[10px] text-muted-foreground">System will block serials that are already Issued / Installed / Damaged / Returned.</p>
          </div>
          <PhotoInput label="Gate Pass Document (PDF/Image)" value={f.document} name={f.document_name} testid="gp-doc"
            onChange={(v, n) => { set("document", v); set("document_name", n); }} />
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Remarks</label>
            <input value={f.remarks} onChange={e => set("remarks", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Cable Issues --------- */
function CableIssues() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null);
  const load = async () => {
    setLoading(true);
    try { setItems((await inventoryApi.listCableIssues({ page_size: 100 })).items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Cable Issue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Issue cable from a drum. Balance is auto-checked before save.</p>
        </div>
        <button onClick={() => setDlg({})} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="w-4 h-4"/>New Issue</button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr><th className="text-left px-3 py-2">Slip</th><th className="text-left">Date</th><th className="text-left">Drum</th><th className="text-left">Type / Size</th><th className="text-right">Quantity</th><th className="text-left">To</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No cable issues yet</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 font-mono text-xs">{r.issue_slip_number || "—"}</td>
                <td className="px-3 py-1.5 text-xs">{r.issue_date}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{r.drum_number}</td>
                <td className="px-3 py-1.5 text-xs">{r.cable_type} / {r.cable_size}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{r.quantity}</td>
                <td className="px-3 py-1.5 text-xs">{r.agency || r.issued_to || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlg && <CableIssueDialog onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
    </div>
  );
}

function CableIssueDialog({ onClose, onSaved }) {
  const [f, setF] = useState({
    issue_date: new Date().toISOString().slice(0,10),
    drum_number: "", cable_type: "", cable_size: "", quantity: 0,
    issued_to: "", agency: "", work_order: "", vehicle_number: "",
    issue_slip_number: "", document: null, document_name: null, remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.drum_number || !f.cable_type || !f.cable_size || !f.quantity) return toast.error("Drum, type, size, quantity required");
    setBusy(true);
    try {
      await inventoryApi.addCableIssue({ ...f, quantity: Number(f.quantity), drum_number: f.drum_number.toUpperCase() });
      toast.success("Cable issued"); onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-heading text-lg font-bold">Cable Issue Slip</h3>
          <button onClick={onClose}><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[["issue_date","Date","date"],["issue_slip_number","Slip No"],["drum_number","Drum *"],["cable_type","Cable Type *"],["cable_size","Cable Size *"],["quantity","Quantity *","number"],["issued_to","Issued To"],["agency","Agency"],["work_order","Work Order"],["vehicle_number","Vehicle"]].map(([k,l,t])=>(
            <div key={k}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{l}</label>
              <input type={t||"text"} value={f[k]||""} onChange={e=>set(k,e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"/>
            </div>
          ))}
          <PhotoInput label="Issue Slip Document" value={f.document} name={f.document_name} testid="ci-doc"
            onChange={(v, n) => { set("document", v); set("document_name", n); }} />
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Remarks</label>
            <input value={f.remarks} onChange={e=>set("remarks",e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"/>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- BISignoffs --------- */
function BISignoffs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null);
  const load = async () => {
    setLoading(true);
    try { setItems((await inventoryApi.listBISignoffs({ page_size: 100 })).items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (r, next) => {
    try { await inventoryApi.updateBISignoff(r.id, { status: next }); toast.success("Updated"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Used Cable BISignoff</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verification workflow. Verified records lock automatically and update the drum's Used quantity.</p>
        </div>
        <button onClick={() => setDlg({})} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="w-4 h-4"/>New BISignoff</button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr><th className="text-left px-3 py-2">Number</th><th className="text-left">Date</th><th className="text-left">Drum</th><th className="text-right">Used</th><th className="text-left">Consumer / Work</th><th className="text-left">Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No BISignoffs yet</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 font-mono text-xs font-semibold">{r.bisignoff_number}</td>
                <td className="px-3 py-1.5 text-xs">{r.bisignoff_date}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{r.drum_number || "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{r.used_qty || 0}</td>
                <td className="px-3 py-1.5 text-xs">{r.consumer_reference || r.work_location || "—"}</td>
                <td className="px-3 py-1.5">
                  {r.status === "Verified" ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE.Verified}`}>Verified 🔒</span>
                  ) : (
                    <select value={r.status} onChange={e => setStatus(r, e.target.value)} className={`text-xs font-bold px-2 py-1 rounded-full border-0 ${STATUS_STYLE[r.status] || "bg-muted"}`}>
                      {["Pending","Submitted","Verified","Rejected"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlg && <BISignoffDialog onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
    </div>
  );
}

function BISignoffDialog({ onClose, onSaved }) {
  const [f, setF] = useState({
    bisignoff_number: "", bisignoff_date: new Date().toISOString().slice(0,10),
    consumer_reference: "", cable_type: "", cable_size: "", drum_number: "",
    issued_qty: 0, used_qty: 0, balance_return: 0,
    installer: "", agency: "", work_location: "", status: "Submitted",
    document: null, document_name: null, remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.bisignoff_number || !f.cable_type || !f.cable_size) return toast.error("Number, type, size required");
    setBusy(true);
    try {
      await inventoryApi.addBISignoff({ ...f,
        issued_qty: Number(f.issued_qty), used_qty: Number(f.used_qty), balance_return: Number(f.balance_return),
        drum_number: f.drum_number?.toUpperCase() });
      toast.success("BISignoff created"); onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-heading text-lg font-bold">Used Cable BISignoff</h3>
          <button onClick={onClose}><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[["bisignoff_number","BISignoff No *"],["bisignoff_date","Date","date"],["cable_type","Cable Type *"],["cable_size","Cable Size *"],["drum_number","Drum No"],["issued_qty","Issued Qty","number"],["used_qty","Used Qty","number"],["balance_return","Balance/Return","number"],["consumer_reference","Consumer / Work Ref"],["installer","Installer"],["agency","Agency"],["work_location","Work Location"]].map(([k,l,t])=>(
            <div key={k}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{l}</label>
              <input type={t||"text"} value={f[k]||""} onChange={e=>set(k,e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"/>
            </div>
          ))}
          <PhotoInput label="BISignoff Document" value={f.document} name={f.document_name} testid="bi-doc"
            onChange={(v, n) => { set("document", v); set("document_name", n); }} />
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Remarks</label>
            <input value={f.remarks} onChange={e=>set("remarks",e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"/>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Cross-linked History (mini Session C) --------- */
function CrossHistory() {
  const [serial, setSerial] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    if (!serial.trim()) return;
    setLoading(true); setData(null);
    try { setData(await inventoryApi.crossHistory(serial.trim().toUpperCase())); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Serial Lifecycle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Type a smart meter serial to see the full journey: Receipt → Gate Pass → Installation → Old Meter → BISignoff → Verification.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={serial} onChange={e => setSerial(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Enter serial number, e.g. SM-LC-100"
            className="w-full h-11 pl-9 pr-3 rounded-lg bg-background border border-border text-sm font-mono"/>
        </div>
        <button onClick={search} className="h-11 px-4 rounded-lg bg-foreground text-background text-sm font-semibold">Search</button>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {data && (
        <div className="space-y-3">
          <StageCard title="1 · Meter Stock" state={data.meter ? "done" : null}>
            <Row label="Serial" value={data.meter.serial_number} mono />
            <Row label="Make / Model" value={`${data.meter.meter_make || "—"} · ${data.meter.meter_model || "—"}`}/>
            <Row label="Status" value={data.meter.status} badge />
            <Row label="Division" value={data.meter.division}/>
          </StageCard>
          <StageCard title="2 · Gate Pass" state={data.gate_pass ? "done" : "skip"}>
            {data.gate_pass ? (<>
              <Row label="GP No" value={data.gate_pass.gate_pass_number} mono />
              <Row label="Date" value={data.gate_pass.gate_pass_date}/>
              <Row label="From → To" value={`${data.gate_pass.from_location} → ${data.gate_pass.to_location}`}/>
              <Row label="Status" value={data.gate_pass.status} badge />
            </>) : <div className="text-xs text-muted-foreground">No gate pass yet</div>}
          </StageCard>
          <StageCard title="3 · Installation" state={data.installation ? "done" : "skip"}>
            {data.installation ? (<>
              <Row label="Consumer" value={`${data.installation.consumer_name} (${data.installation.consumer_number})`}/>
              <Row label="Date" value={data.installation.installation_date}/>
              <Row label="Installer" value={data.installation.installer || data.installation.agency}/>
              <Row label="Status" value={data.installation.status} badge />
              {data.installation.after_photo && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase text-muted-foreground font-bold">After Photo</div>
                  <img src={data.installation.after_photo} className="mt-1 max-h-40 rounded-lg border border-border"/>
                </div>
              )}
            </>) : <div className="text-xs text-muted-foreground">Not yet installed</div>}
          </StageCard>
          <StageCard title="4 · Old Meter Removed" state={data.old_meter ? "done" : "skip"}>
            {data.old_meter ? (<>
              <Row label="Serial" value={data.old_meter.serial_number} mono />
              <Row label="Condition" value={data.old_meter.condition} badge />
              <Row label="Deposit" value={data.old_meter.deposit_status} badge />
            </>) : <div className="text-xs text-muted-foreground">No old meter linked</div>}
          </StageCard>
          <StageCard title="5 · BISignoff Verification" state={data.bisignoff ? (data.bisignoff.status === "Verified" ? "done" : "pending") : "skip"}>
            {data.bisignoff ? (<>
              <Row label="Number" value={data.bisignoff.bisignoff_number} mono/>
              <Row label="Used Qty" value={data.bisignoff.used_qty}/>
              <Row label="Status" value={data.bisignoff.status} badge/>
            </>) : <div className="text-xs text-muted-foreground">No BISignoff yet</div>}
          </StageCard>
        </div>
      )}
    </div>
  );
}
function StageCard({ title, state, children }) {
  const dot = state === "done" ? "bg-emerald-500" : state === "pending" ? "bg-amber-500" : "bg-muted";
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`}/>
        <div className="font-heading font-bold text-sm">{title}</div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
function Row({ label, value, badge, mono }) {
  if (!value && value !== 0) value = "—";
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground font-bold">{label}</div>
      {badge ? (
        <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[value] || "bg-muted"}`}>{value}</span>
      ) : (
        <div className={`mt-0.5 text-sm ${mono ? "font-mono" : ""} font-medium`}>{value}</div>
      )}
    </div>
  );
}


/* --------- Reports (Excel exports) --------- */
function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    inventoryApi.reportsSummary().then(d => setReports(d.reports)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const download = async (kind) => {
    setDownloading(kind);
    try {
      const res = await import("@/lib/adminApi").then(m => m.adminHttp.get(inventoryApi.reportXlsxUrl(kind), { responseType: "blob" }));
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pps-inventory-${kind}-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${kind}`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setDownloading(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">One-click Excel exports of every inventory register. Each file is professionally formatted with branded headers, frozen top row, and auto-sized columns.</p>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map(r => (
          <div key={r.kind} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-heading font-bold">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.rows.toLocaleString()} rows</div>
                {r.last_updated && (
                  <div className="text-[10px] text-muted-foreground mt-1">Last: {new Date(r.last_updated).toLocaleString()}</div>
                )}
              </div>
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <button
              data-testid={`report-download-${r.kind}`}
              onClick={() => download(r.kind)}
              disabled={downloading === r.kind || r.rows === 0}
              className="mt-3 w-full h-9 rounded-lg bg-foreground text-background text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {downloading === r.kind ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
              {r.rows === 0 ? "No data" : "Download Excel"}
            </button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <strong>Tip:</strong> Downloads include every non-deleted row. To restrict by date or filter, open the source tab first (Smart Meter / Old Meter / etc.), then export.
      </div>
    </div>
  );
}

