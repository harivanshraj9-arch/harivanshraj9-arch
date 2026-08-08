import { useEffect, useMemo, useState } from "react";
import { Menu, X, Zap, Database, Search, Download, ExternalLink,
  RefreshCw, Trash2, Loader2, Upload, Link as LinkIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster, toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useTheme } from "@/lib/theme";
import { discomApi, DISCOM_ARTIFACT_URLS, CONSUMER_INQUIRY_URL } from "@/lib/discomApi";
import { inr } from "@/lib/format";

const TABS = [
  { key: "master", label: "Master Data", icon: Database },
  { key: "inquiry", label: "Consumer Inquiry", icon: ExternalLink },
];

export default function DiscomPage() {
  const { theme, toggle } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [tab, setTab] = useState("master");

  return (
    <div data-testid="discom-layout" className="min-h-screen flex bg-background text-foreground">
      <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="discom" />

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="discom" onClose={() => setMobileNav(false)} />
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
              <span className="font-heading font-black">DISCOM</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Module</div>
              <div className="font-heading font-bold">DISCOM · EDC Sitapur</div>
            </div>
          </div>

          <nav data-testid="discom-tabs" className="px-4 sm:px-8 border-t border-border overflow-x-auto no-scrollbar">
            <div className="flex gap-1 py-2">
              {TABS.map(t => {
                const isActive = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    data-testid={`disc-tab-${t.key}`}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                      ${isActive ? "bg-foreground text-background" : "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="px-4 sm:px-8 py-6 space-y-6 max-w-[1600px]">
          {tab === "master" && <MasterData />}
          {tab === "inquiry" && <ConsumerInquiry />}
          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">
            © 2026 Prathvi Power Solutions · DISCOM Module
          </footer>
        </div>
      </main>

      <MobileBottomNav />

      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}

/* ================================================================
   MASTER DATA — division tabs + ingest + searchable consumer table
   ================================================================ */
function MasterData() {
  const [divisions, setDivisions] = useState([]);
  const [selected, setSelected] = useState("SITAPUR-I");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const d = await discomApi.divisions();
      setDivisions(d.divisions);
    } catch { toast.error("Failed to load divisions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const current = divisions.find(d => d.code === selected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Master Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consumer master data for 4 divisions under EDC Sitapur. Load the CSV (or paste artifact URL) for each division, then search consumers by KNO, name, mobile or meter.
        </p>
      </div>

      {/* Division picker */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {divisions.map(d => {
          const isActive = d.code === selected;
          return (
            <button
              key={d.code}
              data-testid={`div-tile-${d.code}`}
              onClick={() => setSelected(d.code)}
              className={`text-left rounded-2xl border p-4 transition-all
                ${isActive ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40"}`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">{d.edc}</div>
              <div className="font-heading font-black text-lg mt-1">{d.code}</div>
              <div className="mt-2 text-xs opacity-80">
                {d.row_count?.toLocaleString() || 0} consumers
              </div>
            </button>
          );
        })}
      </div>

      {current && (
        <DivisionPanel key={current.code} division={current} onChanged={refresh} />
      )}
      {loading && <div className="text-sm text-muted-foreground">Loading divisions…</div>}
    </div>
  );
}

/* ================================================================
   Per-division: ingest bar + search + consumer table + detail
   ================================================================ */
function DivisionPanel({ division, onChanged }) {
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);

  const [q, setQ] = useState("");
  const [field, setField] = useState("");
  const [conStatus, setConStatus] = useState("");
  const [supplyType, setSupplyType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, columns: [] });
  const [searching, setSearching] = useState(false);

  const load = async (nextPage = page) => {
    if (!division.row_count) { setData({ items: [], total: 0, columns: [] }); return; }
    setSearching(true);
    try {
      const d = await discomApi.listConsumers({
        division: division.code,
        q, field,
        con_status: conStatus, supply_type: supplyType,
        page: nextPage, page_size: 25,
      });
      setData(d);
      setPage(nextPage);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  useEffect(() => { load(1); /* eslint-disable-line */ }, [division.code, division.row_count]);

  const ingestUrl = async () => {
    const url = DISCOM_ARTIFACT_URLS[division.code];
    if (!url) { toast.error("No artifact URL for this division"); return; }
    setBusy(true);
    try {
      const r = await discomApi.ingestUrl(division.code, url, true);
      toast.success("Ingest started");
      pollJob(r.job_id);
    } catch (e) { toast.error("Failed to start ingest"); setBusy(false); }
  };

  const ingestFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const r = await discomApi.ingestUpload(division.code, f, true);
      toast.success("Ingest started");
      pollJob(r.job_id);
    } catch { toast.error("Upload failed"); setBusy(false); }
    finally { e.target.value = ""; }
  };

  const pollJob = (id) => {
    const timer = setInterval(async () => {
      try {
        const j = await discomApi.job(id);
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          clearInterval(timer);
          setBusy(false);
          onChanged();
          if (j.status === "done") {
            toast.success(`${j.inserted.toLocaleString()} rows imported`);
          } else {
            toast.error(`Failed: ${j.error || "unknown"}`);
          }
        }
      } catch {}
    }, 1500);
  };

  const clearAll = async () => {
    if (!window.confirm(`Delete all ${division.row_count?.toLocaleString()} rows of ${division.code}?`)) return;
    try { await discomApi.clearDivision(division.code); toast.success("Cleared"); onChanged(); }
    catch { toast.error("Failed"); }
  };

  const pageCount = Math.max(1, Math.ceil(data.total / 25));

  return (
    <div className="space-y-4">
      {/* Ingest bar */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Data source</div>
            <div className="font-heading font-bold">
              {division.filename ? division.filename : "No data loaded"}
              {division.last_ingested_at && (
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  · {new Date(division.last_ingested_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            data-testid={`ingest-url-${division.code}`}
            onClick={ingestUrl}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            Load from Emergent Asset URL
          </button>
          <label className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-border text-sm font-semibold cursor-pointer hover:bg-muted">
            <Upload className="w-4 h-4" />
            Upload .csv / .csv.gz
            <input type="file" accept=".csv,.gz,.txt" className="hidden" onChange={ingestFile} disabled={busy} />
          </label>
          {division.row_count > 0 && (
            <button
              data-testid={`clear-${division.code}`}
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full border border-border text-sm hover:bg-[hsl(var(--destructive))]/10 hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {job && (job.status === "queued" || job.status === "running") && (
          <div className="mt-3 rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Importing… {job.status}</span>
              <span className="tabular-nums">{job.inserted.toLocaleString()} rows imported</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
              <div className="h-full bg-[hsl(var(--primary))] animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-6 gap-2">
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="search-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
            placeholder="Search KNO, SCNO, name, mobile, meter…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
        </div>
        <select data-testid="search-field" value={field} onChange={e => setField(e.target.value)} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="">Any field</option>
          <option value="KNO">KNO</option>
          <option value="SCNO">SCNO</option>
          <option value="ACCT_ID">Account ID</option>
          <option value="NAME">Name</option>
          <option value="MOBILE_NO">Mobile</option>
          <option value="METER_BADGE_NO">Meter No</option>
        </select>
        <select value={conStatus} onChange={e => setConStatus(e.target.value)} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISCONNECTED">Disconnected</option>
          <option value="PERMANENT DISCONNECTED">Permanently Disconnected</option>
        </select>
        <select value={supplyType} onChange={e => setSupplyType(e.target.value)} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="">Any supply</option>
          <option value="URBAN">Urban</option>
          <option value="RURAL">Rural</option>
        </select>
        <button data-testid="search-btn" onClick={() => load(1)} disabled={searching}
          className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Results table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <div className="font-heading font-bold">Consumers</div>
            <div className="text-xs text-muted-foreground">
              {data.total.toLocaleString()} matches · page {page} / {pageCount}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button data-testid="prev-page" onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1 || searching}
              className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button data-testid="next-page" onClick={() => load(Math.min(pageCount, page + 1))} disabled={page >= pageCount || searching}
              className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
              <tr>
                {data.columns.map(c => <th key={c} className="text-left px-3 py-2 font-bold whitespace-nowrap">{c.replace(/_/g, " ")}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={data.columns.length + 1} className="text-center text-sm text-muted-foreground py-10">
                  {division.row_count === 0 ? "No data loaded. Click 'Load from Emergent Asset URL' above." : "No consumers match your search."}
                </td></tr>
              )}
              {data.items.map(r => (
                <tr key={r.id} data-testid={`row-${r.KNO || r.id}`} className="border-t border-border hover:bg-muted/30">
                  {data.columns.map(c => (
                    <td key={c} className="px-3 py-1.5 whitespace-nowrap">
                      {c === "TOTAL_OUTSTANDING"
                        ? <span className={`tabular-nums font-semibold ${Number(r[c]) > 0 ? "text-[hsl(var(--energy))]" : "text-muted-foreground"}`}>{r[c] != null ? inr(r[c]) : "—"}</span>
                        : c === "LOAD"
                        ? <span className="tabular-nums">{r[c] || "—"}</span>
                        : c === "CON_STATUS"
                        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${(r[c] || "").toUpperCase() === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted"}`}>{r[c] || "—"}</span>
                        : (r[c] || <span className="text-muted-foreground">—</span>)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => discomApi.getConsumer(r.id).then(setDetail)}
                      className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <ConsumerDetail data={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ================================================================
   Consumer detail modal — shows the full raw record
   ================================================================ */
function ConsumerDetail({ data, onClose }) {
  const raw = data.raw || {};
  const grouped = useMemo(() => ({
    Identity: ["ACCT_ID", "KNO", "SCNO", "BOOK_NO", "GOVT_CODE"],
    "Consumer": ["NAME", "FATHER_NAME", "MOBILE_NO", "LANDLINE_NO", "ADDRESS", "TOWN",
      "VILLAGE_NAME", "HABITAT_NAME", "DISTRICT"],
    "Connection": ["SUPPLY_TYPE", "CONNECTION_TYPE", "LOAD", "LOAD_UNIT", "CON_STATUS",
      "PROJECT_AREA", "INSTALLATION_DATE", "BILL_CYC_CD", "SERVICE_CYCLE_CODE"],
    "Meter": ["METER_BADGE_NO", "SERIAL_NBR", "MTR_MAKE", "METER_VOLTAGE", "MTR_TYPE_CD",
      "METER_STATUS", "MULTIPLY_FACTOR", "CT_RATIO", "PT_RATIO"],
    "Readings": ["OPENING_READING_KWH", "CLOSING_READING_KWH", "CONSUMPTION_KWH",
      "OPENING_READING_KVAH", "CLOSING_READING_KVAH", "CONSUMPTION_KVAH", "LAST_OK_READING"],
    "Billing": ["LAST_BILL_DATE", "BILL_BASIS", "BILLED_AMOUNT", "ENERGY_AMT",
      "NON_ENERGY_AMT", "ARREAR", "LPSC", "ELECTRICITY_DUTY", "TARIFF_ADJUSTMENTS", "DUE_DATE_REBATE"],
    "Payment": ["PAY_AMT", "PAY_DATE", "TOTAL_PAY_AMT", "PAYMENT_MODE", "TOTAL_OUTSTANDING"],
    "Network": ["SUBSTATION", "SS_NAME", "FEEDER", "FEEDER_NAME", "DT", "DT_NAME", "POLE_NO", "NETWID"],
  }), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Consumer</div>
            <h3 className="font-heading text-lg font-bold">{raw.NAME || "—"} · KNO {raw.KNO || "—"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {Object.entries(grouped).map(([section, fields]) => (
            <div key={section} className="rounded-xl border border-border">
              <div className="px-4 py-2 border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{section}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 text-sm">
                {fields.map(f => (
                  <div key={f}>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{f.replace(/_/g, " ")}</div>
                    <div className="mt-0.5 font-medium break-words">{raw[f] || <span className="text-muted-foreground">—</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   CONSUMER INQUIRY — quick link + embed
   ================================================================ */
function ConsumerInquiry() {
  const open = () => window.open(CONSUMER_INQUIRY_URL, "_blank", "noopener,noreferrer");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">Consumer Inquiry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct link to UPPCL online bill enquiry & payment portal. Some Indian government portals block embedding — use the button below to open in a new tab.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Portal</div>
          <div className="font-heading font-bold text-lg mt-1">UPPCL · Consumer Bill Payment</div>
          <a href={CONSUMER_INQUIRY_URL} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block text-xs font-mono text-muted-foreground hover:text-foreground">
            {CONSUMER_INQUIRY_URL}
          </a>
        </div>
        <button
          data-testid="open-inquiry"
          onClick={open}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-foreground text-background text-sm font-semibold"
        >
          <ExternalLink className="w-4 h-4" />
          Open Consumer Portal
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-heading font-bold text-sm">Embedded Preview</div>
        <div className="h-[600px] bg-muted/20">
          <iframe
            data-testid="inquiry-iframe"
            src={CONSUMER_INQUIRY_URL}
            title="UPPCL Consumer Inquiry"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
          <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border bg-card">
            If the portal doesn't load here, it's because UPPCL blocks embedding — use the "Open Consumer Portal" button above.
          </div>
        </div>
      </div>
    </div>
  );
}
