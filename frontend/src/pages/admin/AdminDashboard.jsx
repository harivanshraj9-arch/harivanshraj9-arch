import { useEffect, useState } from "react";
import { Users, ShieldCheck, Boxes, Activity, TrendingUp,
  UserCheck, UserX, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell } from "recharts";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { inr } from "@/lib/format";

const ROLE_COLORS = {
  super_admin: "#0ea5e9",
  admin: "#8b5cf6",
  staff: "#f59e0b",
  viewer: "#64748b",
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.dashboard().then(setData).catch(() => {}); }, []);
  if (!data) return <AdminLayout title="Dashboard"><div className="text-sm text-muted-foreground">Loading…</div></AdminLayout>;
  const c = data.cards;

  const kpis = [
    { k: "Total Users", v: c.total_users, icon: Users, tint: "text-[hsl(var(--primary))]" },
    { k: "Active Users", v: c.active_users, icon: UserCheck, tint: "text-emerald-500" },
    { k: "Inactive Users", v: c.inactive_users, icon: UserX, tint: "text-[hsl(var(--energy))]" },
    { k: "Resources", v: c.total_resources, icon: Boxes, tint: "text-[hsl(var(--primary))]" },
    { k: "Modules", v: c.total_modules, icon: Layers, tint: "text-purple-500" },
    { k: "Consumers (DISCOM)", v: c.total_consumers.toLocaleString(), icon: ShieldCheck, tint: "text-blue-500" },
    { k: "Employees (HRMS)", v: c.total_employees, icon: Users, tint: "text-orange-500" },
    { k: "Invoices", v: c.total_invoices, icon: TrendingUp, tint: "text-emerald-500" },
  ];

  return (
    <AdminLayout title="Overview" subtitle="A snapshot of your system — users, resources and recent activity.">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.k} data-testid={`kpi-${k.k.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}
              className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{k.k}</div>
                <Icon className={`w-4 h-4 ${k.tint}`} />
              </div>
              <div className="mt-2 font-heading text-2xl font-black tabular-nums">{k.v}</div>
            </div>
          );
        })}
      </div>

      {/* Charts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-1">
          <div className="font-heading font-bold mb-2">Users by Role</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.roles} dataKey="count" nameKey="role" outerRadius={80} label>
                  {data.roles.map((r, i) => <Cell key={i} fill={ROLE_COLORS[r.role] || "#a1a1aa"} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card lg:col-span-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-heading font-bold">Recent Logins</div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {data.recent_logins.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No logins yet</div>}
            {data.recent_logins.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${a.success ? "bg-emerald-500" : "bg-[hsl(var(--destructive))]"}`}/>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{a.user_email}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(a.timestamp).toLocaleString()} · {a.ip || "—"}</div>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${a.success ? "bg-emerald-500/10 text-emerald-600" : "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"}`}>{a.success ? "OK" : "FAIL"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-heading font-bold">Recent Activity</div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {data.recent_activity.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No activity</div>}
          {data.recent_activity.map((a, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted uppercase">{a.module}</span>
              <span className="font-semibold">{a.action}</span>
              <span className="flex-1 truncate text-muted-foreground text-xs">{a.detail}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{a.user_email}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">{new Date(a.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
