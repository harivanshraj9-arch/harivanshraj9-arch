import { useEffect, useState } from "react";
import { Search, Filter, Loader2, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi, formatApiError } from "@/lib/adminApi";
import { toast } from "sonner";

const ACTION_STYLE = {
  login: "bg-emerald-500/10 text-emerald-600",
  logout: "bg-muted",
  password_change: "bg-amber-500/10 text-amber-700",
  password_reset: "bg-amber-500/10 text-amber-700",
  user_create: "bg-blue-500/10 text-blue-600",
  user_update: "bg-blue-500/10 text-blue-600",
  user_delete: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  resource_create: "bg-purple-500/10 text-purple-600",
  resource_update: "bg-purple-500/10 text-purple-600",
  resource_delete: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
};

export default function ActivityLogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ user_email: "", module: "", action: "" });

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminApi.activity(f);
      setItems(d.items);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  return (
    <AdminLayout title="Activity Log" subtitle="Every login, user edit and resource change — searchable audit trail.">
      <div className="rounded-2xl border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input data-testid="log-user" value={f.user_email} onChange={e => setF(s => ({ ...s, user_email: e.target.value }))}
          placeholder="Filter by user email"
          className="h-10 px-3 rounded-lg bg-background border border-border text-sm"/>
        <select value={f.module} onChange={e => setF(s => ({ ...s, module: e.target.value }))} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="">Any module</option>
          <option value="auth">Auth</option>
          <option value="users">Users</option>
          <option value="resources">Resources</option>
        </select>
        <select value={f.action} onChange={e => setF(s => ({ ...s, action: e.target.value }))} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="">Any action</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="user_create">User Create</option>
          <option value="user_update">User Update</option>
          <option value="user_delete">User Delete</option>
          <option value="password_change">Password Change</option>
          <option value="password_reset">Password Reset</option>
          <option value="resource_create">Resource Create</option>
          <option value="resource_update">Resource Update</option>
          <option value="resource_delete">Resource Delete</option>
        </select>
        <button data-testid="log-search" onClick={load} className="h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-1.5">
          <Search className="w-4 h-4"/> Search
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="font-heading font-bold">Events</div>
          <div className="text-xs text-muted-foreground">{items.length} rows</div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
          {loading && <div className="p-6 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 inline animate-spin" /></div>}
          {!loading && items.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No events match your filter</div>}
          {!loading && items.map(a => (
            <div key={a.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 text-sm items-center">
              <div className="col-span-12 sm:col-span-2 text-[11px] text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</div>
              <div className="col-span-6 sm:col-span-3 truncate font-semibold">{a.user_email || "—"}</div>
              <div className="col-span-6 sm:col-span-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ACTION_STYLE[a.action] || "bg-muted"}`}>{a.action}</span></div>
              <div className="col-span-4 sm:col-span-1 text-xs text-muted-foreground uppercase">{a.module}</div>
              <div className="col-span-8 sm:col-span-3 text-xs text-muted-foreground truncate">{a.detail}</div>
              <div className="col-span-12 sm:col-span-1 text-right">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${a.success ? "bg-emerald-500/10 text-emerald-600" : "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"}`}>{a.success ? "OK" : "FAIL"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
