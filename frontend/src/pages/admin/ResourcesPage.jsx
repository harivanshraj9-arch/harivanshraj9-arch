import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Star, X, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi, formatApiError } from "@/lib/adminApi";

const CATEGORIES = ["Operations", "HR", "Finance", "Inventory", "Reports", "Legal", "Customer", "Other"];
const KINDS = ["dashboard", "spreadsheet", "document", "folder", "link"];

export default function ResourcesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const d = await adminApi.listResources(); setItems(d.items); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    try { await adminApi.deleteResource(r.id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const toggleStar = async (r) => {
    try { await adminApi.updateResource(r.id, { starred: !r.starred }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const toggleEnabled = async (r) => {
    try { await adminApi.updateResource(r.id, { enabled: !(r.enabled ?? true) }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);

  return (
    <AdminLayout title="Resources" subtitle="External links, Google Sheets, dashboards & documents shown on the workspace.">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full ${filter==="all" ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}>All ({items.length})</button>
        {CATEGORIES.map(c => {
          const count = items.filter(i => i.category === c).length;
          if (!count) return null;
          return <button key={c} onClick={() => setFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full ${filter===c ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}>{c} ({count})</button>;
        })}
        <div className="ml-auto">
          <button data-testid="new-resource" onClick={() => setDlg({ mode: "new" })}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm hidden md:table">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Kind</th>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-left">Enabled</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-6"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No resources</td></tr>}
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">{r.sno}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleStar(r)} className="text-muted-foreground hover:text-amber-500">
                      <Star className={`w-3.5 h-3.5 ${r.starred ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                    <span className="font-semibold">{r.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">{r.description}</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.category}</td>
                <td className="px-3 py-2 text-xs uppercase text-muted-foreground">{r.kind}</td>
                <td className="px-3 py-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1 max-w-[240px] truncate">
                    <ExternalLink className="w-3 h-3 shrink-0"/> <span className="truncate">{r.url}</span>
                  </a>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleEnabled(r)} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${(r.enabled ?? true) ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {(r.enabled ?? true) ? "enabled" : "disabled"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setDlg({ mode: "edit", resource: r })} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center"><Edit2 className="w-3.5 h-3.5"/></button>
                  <button onClick={() => remove(r)} className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center"><Trash2 className="w-3.5 h-3.5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {loading && <div className="p-6 text-center"><Loader2 className="w-4 h-4 inline animate-spin"/></div>}
          {!loading && filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No resources</div>}
          {filtered.map(r => (
            <div key={r.id} className="p-3">
              <div className="flex items-start gap-2">
                <button onClick={() => toggleStar(r)}><Star className={`w-4 h-4 mt-1 ${r.starred ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}/></button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="bg-muted px-2 py-0.5 rounded-full font-bold uppercase">{r.category}</span>
                    <span className="text-muted-foreground">{r.kind}</span>
                    <button onClick={() => toggleEnabled(r)} className={`ml-auto inline-flex px-2 py-0.5 rounded-full font-bold ${(r.enabled ?? true) ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {(r.enabled ?? true) ? "enabled" : "disabled"}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button onClick={() => setDlg({ mode: "edit", resource: r })} className="flex-1 text-xs py-1.5 rounded-lg border border-border inline-flex items-center justify-center gap-1"><Edit2 className="w-3 h-3"/>Edit</button>
                    <button onClick={() => remove(r)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center gap-1"><Trash2 className="w-3 h-3"/>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {dlg && <ResourceDialog mode={dlg.mode} resource={dlg.resource} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
    </AdminLayout>
  );
}

function ResourceDialog({ mode, resource, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [f, setF] = useState(() => ({
    title: resource?.title || "",
    description: resource?.description || "",
    category: resource?.category || "Operations",
    kind: resource?.kind || "document",
    url: resource?.url || "",
    starred: !!resource?.starred,
    enabled: resource?.enabled ?? true,
  }));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.title.trim() || !f.url.trim() || !f.category.trim()) return toast.error("Title, category & URL required");
    setBusy(true);
    try {
      if (isEdit) await adminApi.updateResource(resource.id, f);
      else await adminApi.addResource(f);
      toast.success(isEdit ? "Updated" : "Added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading text-lg font-bold">{isEdit ? "Edit Resource" : "Add Resource"}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Title*</label>
            <input data-testid="res-title" value={f.title} onChange={e => setF(s => ({ ...s, title: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Description</label>
            <textarea value={f.description} onChange={e => setF(s => ({ ...s, description: e.target.value }))} rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Category*</label>
              <select value={f.category} onChange={e => setF(s => ({ ...s, category: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Kind</label>
              <select value={f.kind} onChange={e => setF(s => ({ ...s, kind: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">URL*</label>
            <div className="mt-1 relative">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input data-testid="res-url" value={f.url} onChange={e => setF(s => ({ ...s, url: e.target.value }))}
                placeholder="https://…"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.starred} onChange={e => setF(s => ({ ...s, starred: e.target.checked }))} />
              Starred
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.enabled} onChange={e => setF(s => ({ ...s, enabled: e.target.checked }))} />
              Enabled
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button data-testid="res-save" onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
