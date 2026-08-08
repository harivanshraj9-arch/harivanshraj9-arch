import { useEffect, useState } from "react";
import { Plus, Search, Edit2, KeyRound, Trash2, X, Loader2,
  UserCog, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi, authApi, formatApiError } from "@/lib/adminApi";

const ROLES = [
  { key: "super_admin", label: "Super Admin" },
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
  { key: "viewer", label: "Viewer" },
];

const ROLE_STYLE = {
  super_admin: "bg-blue-500/10 text-blue-600",
  admin: "bg-purple-500/10 text-purple-600",
  staff: "bg-amber-500/10 text-amber-700",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const me = authApi.getCachedUser();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode:'new'|'edit', user?}
  const [pwd, setPwd] = useState(null); // user to reset

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminApi.listUsers({ q, role, status });
      setItems(d.items);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await adminApi.deleteUser(u.id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const toggleStatus = async (u) => {
    const next = u.status === "active" ? "inactive" : "active";
    try { await adminApi.updateUser(u.id, { status: next }); toast.success(`${next}`); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <AdminLayout title="Users" subtitle="Add, edit, activate and manage access for all system users.">
      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input data-testid="user-search" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search name, email, employee id…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"/>
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="all">Any role</option>
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 rounded-lg bg-background border border-border text-sm">
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex gap-2">
          <button onClick={load} className="flex-1 h-10 px-3 rounded-lg border border-border text-sm hover:bg-muted">Search</button>
          <button data-testid="new-user" onClick={() => setDlg({ mode: "new" })}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Department</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last Login</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin"/></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-sm text-muted-foreground">No users match your filters</td></tr>}
            {items.map(u => (
              <tr key={u.id} data-testid={`user-row-${u.email}`} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-semibold">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_STYLE[u.role]}`}>{u.role.replace("_"," ")}</span></td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{u.department || "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleStatus(u)} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"}`}>
                    {u.status}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setDlg({ mode: "edit", user: u })} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setPwd(u)} className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center" title="Reset password"><KeyRound className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(u)} disabled={u.id === me?.id}
                    className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center disabled:opacity-30" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading && <div className="text-sm text-muted-foreground text-center py-6">Loading…</div>}
        {!loading && items.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No users</div>}
        {items.map(u => (
          <div key={u.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${ROLE_STYLE[u.role]}`}>{u.role.replace("_"," ")}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <button onClick={() => toggleStatus(u)} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"}`}>{u.status}</button>
              <span className="text-muted-foreground">{u.department || "—"}</span>
            </div>
            <div className="mt-3 flex gap-1">
              <button onClick={() => setDlg({ mode: "edit", user: u })} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center gap-1"><Edit2 className="w-3 h-3"/>Edit</button>
              <button onClick={() => setPwd(u)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center gap-1"><KeyRound className="w-3 h-3"/>Reset</button>
              <button onClick={() => remove(u)} disabled={u.id === me?.id}
                className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] disabled:opacity-30 inline-flex items-center justify-center gap-1">
                <Trash2 className="w-3 h-3"/>Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {dlg && <UserDialog mode={dlg.mode} user={dlg.user} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load(); }} />}
      {pwd && <ResetPwdDialog user={pwd} onClose={() => setPwd(null)} onSaved={() => setPwd(null)} />}
    </AdminLayout>
  );
}

function UserDialog({ mode, user, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [f, setF] = useState(() => ({
    email: user?.email || "",
    password: "",
    name: user?.name || "",
    role: user?.role || "staff",
    mobile: user?.mobile || "",
    employee_id: user?.employee_id || "",
    department: user?.department || "",
    designation: user?.designation || "",
    status: user?.status || "active",
  }));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim() || !f.email.trim()) return toast.error("Name & email required");
    if (!isEdit && (!f.password || f.password.length < 6)) return toast.error("Password ≥ 6 chars");
    setBusy(true);
    try {
      if (isEdit) {
        const patch = { ...f };
        delete patch.password; delete patch.email;
        await adminApi.updateUser(user.id, patch);
      } else {
        await adminApi.createUser(f);
      }
      toast.success(isEdit ? "Updated" : "User created");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const F = (k, label, opts = {}) => (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</label>
      <input value={f[k] || ""} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))}
        type={opts.type || "text"} disabled={opts.disabled}
        data-testid={`user-${k}`}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] disabled:opacity-60" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{isEdit ? "Edit" : "New"} User</div>
            <h3 className="font-heading text-lg font-bold">{isEdit ? user.email : "Add a new team member"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {F("name", "Full Name*")}
          {F("email", "Email*", { type: "email", disabled: isEdit })}
          {!isEdit && F("password", "Temporary Password*", { type: "password" })}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Role</label>
            <select data-testid="user-role" value={f.role} onChange={e => setF(s => ({ ...s, role: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          {F("mobile", "Mobile")}
          {F("employee_id", "Employee ID")}
          {F("department", "Department")}
          {F("designation", "Designation")}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
            <select value={f.status} onChange={e => setF(s => ({ ...s, status: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button data-testid="user-save" onClick={save} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPwdDialog({ user, onClose, onSaved }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw || pw.length < 6) return toast.error("Password ≥ 6 chars");
    setBusy(true);
    try { await adminApi.resetUserPassword(user.id, pw); toast.success("Password reset"); onSaved(); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Reset Password</div>
          <h3 className="font-heading text-lg font-bold truncate">{user.email}</h3>
        </div>
        <div className="p-5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">New Password</label>
          <input data-testid="reset-pwd" type="text" value={pw} onChange={e => setPw(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          <p className="mt-2 text-xs text-muted-foreground">Share this temp password with the user securely. They can change it after signing in.</p>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Reset
          </button>
        </div>
      </div>
    </div>
  );
}
