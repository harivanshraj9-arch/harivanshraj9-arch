import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Umbrella, Clock,
  Briefcase, Wallet, PiggyBank, Shield, Cake, PartyPopper, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";
import { inr, shortInr } from "@/lib/format";

const COLORS = ["hsl(222 100% 55%)", "hsl(4 90% 62%)", "hsl(42 100% 50%)", "#10b981",
  "#d946ef", "#0ea5e9", "#f97316", "#a855f7"];

const tooltipStyle = {
  background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))",
};

export default function HrmsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await hrmsApi.dashboard();
      setData(d);
    } catch (e) {
      toast.error("Failed to load HRMS dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    try {
      const r = await hrmsApi.seedDemo();
      if (r.skipped) toast.info(`Skipped — ${r.existing} employees already exist`);
      else toast.success(`Seeded ${r.inserted} demo employees`);
      load();
    } catch (e) {
      toast.error("Seed failed");
    }
  };

  const c = data?.cards;

  return (
    <HrmsLayout title="HRMS Dashboard" subtitle="One-glance view of workforce, payroll and today's operations">
      {/* KPI Grid */}
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <Kpi testid="hrms-kpi-total" title="Total Employees" value={c?.total_employees ?? "—"} icon={Users} tint="bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]" />
        <Kpi testid="hrms-kpi-present" title="Present Today" value={c?.present_today ?? 0} icon={UserCheck} tint="bg-emerald-500/10 text-emerald-500" />
        <Kpi testid="hrms-kpi-absent" title="Absent Today" value={c?.absent_today ?? 0} icon={UserX} tint="bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]" />
        <Kpi testid="hrms-kpi-leave" title="On Leave" value={c?.on_leave_today ?? 0} icon={Umbrella} tint="bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]" />
        <Kpi testid="hrms-kpi-late" title="Late Today" value={c?.late_today ?? 0} icon={Clock} tint="bg-orange-500/10 text-orange-500" />
        <Kpi testid="hrms-kpi-pending-leaves" title="Pending Leaves" value={c?.pending_leaves ?? 0} icon={Umbrella} tint="bg-sky-500/10 text-sky-500" />
      </motion.div>

      {/* Payroll cards */}
      <motion.div initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <MoneyCard testid="hrms-kpi-today-cost" title="Today's Salary Cost" value={inr(c?.todays_salary_cost || 0)} icon={Wallet} tint="bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]" />
        <MoneyCard testid="hrms-kpi-monthly-payroll" title="Monthly Payroll" value={inr(c?.monthly_payroll || 0)} icon={Briefcase} tint="bg-emerald-500/10 text-emerald-500" subtitle={c?.month} />
        <MoneyCard testid="hrms-kpi-pf" title="PF Total (this month)" value={inr(c?.pf_total || 0)} icon={PiggyBank} tint="bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))]" />
        <MoneyCard testid="hrms-kpi-esic" title="ESIC Total (this month)" value={inr(c?.esic_total || 0)} icon={Shield} tint="bg-fuchsia-500/10 text-fuchsia-500" />
      </motion.div>

      {/* Attendance trend + department distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Analytics</div>
            <h3 className="font-heading text-lg font-bold mt-0.5">Attendance Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 14 days</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.attendance_trend || []} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(d) => d ? d.slice(5) : ""} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="present" stroke="hsl(222 100% 55%)" strokeWidth={2.5} dot={{ r: 2 }} name="Present" />
              <Line type="monotone" dataKey="absent" stroke="hsl(4 90% 62%)" strokeWidth={2.5} dot={{ r: 2 }} name="Absent" />
              <Line type="monotone" dataKey="leave" stroke="hsl(42 100% 50%)" strokeWidth={2.5} dot={{ r: 2 }} name="Leave" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Workforce</div>
            <h3 className="font-heading text-lg font-bold mt-0.5">Department-wise</h3>
          </div>
          {(data?.department_distribution || []).length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              No employees yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.department_distribution} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                  {data.department_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            {(data?.department_distribution || []).map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto font-bold tabular-nums">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payroll trend + Leaves stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Payroll</div>
            <h3 className="font-heading text-lg font-bold mt-0.5">Payroll Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months net payout</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.payroll_trend || []} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={shortInr} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(v)} />
              <Bar dataKey="net" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Leaves</div>
            <h3 className="font-heading text-lg font-bold mt-0.5">Statistics (YTD)</h3>
          </div>
          {(data?.leave_statistics || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">No leaves recorded yet</div>
          ) : (
            <ul className="space-y-3 py-2">
              {data.leave_statistics.map((l, i) => (
                <li key={l.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{l.type}</span>
                    <span className="tabular-nums text-muted-foreground">{l.days} days</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ background: COLORS[i % COLORS.length], width: `${Math.min(100, (l.days / 30) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Birthdays & Anniversaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpcomingList
          testid="upcoming-birthdays"
          title="Upcoming Birthdays"
          icon={Cake}
          tint="text-fuchsia-500 bg-fuchsia-500/10"
          items={data?.upcoming_birthdays || []}
          formatter={(x) => `${x.name} · ${x.in_days === 0 ? "Today" : `in ${x.in_days} days`}`}
        />
        <UpcomingList
          testid="upcoming-anniversaries"
          title="Upcoming Work Anniversaries"
          icon={PartyPopper}
          tint="text-[hsl(var(--energy))] bg-[hsl(var(--energy))]/15"
          items={data?.upcoming_anniversaries || []}
          formatter={(x) => `${x.name} · ${x.years}yr · ${x.in_days === 0 ? "Today" : `in ${x.in_days} days`}`}
        />
      </div>

      {!loading && c?.total_employees === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="font-heading font-bold text-lg">No employees yet</div>
          <p className="text-sm text-muted-foreground mt-1">Seed 8 demo employees to explore the module quickly.</p>
          <button data-testid="seed-demo-btn" onClick={handleSeed}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[0.98] transition-transform">
            <TrendingUp className="w-4 h-4" /> Seed demo data
          </button>
        </div>
      )}
    </HrmsLayout>
  );
}

const kpiVariant = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const Kpi = ({ testid, title, value, icon: Icon, tint }) => (
  <motion.div variants={kpiVariant} data-testid={testid} className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{title}</span>
      <div className={`w-8 h-8 rounded-md ${tint} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className="font-heading text-2xl font-black tabular-nums">{value}</div>
  </motion.div>
);

const MoneyCard = ({ testid, title, value, icon: Icon, tint, subtitle }) => (
  <motion.div variants={kpiVariant} data-testid={testid} className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-9 h-9 rounded-lg ${tint} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{title}</span>
    </div>
    <div className="font-heading text-2xl font-bold tabular-nums">{value}</div>
    {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
  </motion.div>
);

const UpcomingList = ({ testid, title, icon: Icon, tint, items, formatter }) => (
  <div data-testid={testid} className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-9 h-9 rounded-lg ${tint} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Next 30 days</div>
        <h3 className="font-heading text-base font-bold">{title}</h3>
      </div>
    </div>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled</div>
    ) : (
      <ul className="space-y-1.5">
        {items.map((x) => (
          <li key={x.id + x.date} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1.5">
            <span className="truncate">{formatter(x)}</span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-3">{x.date}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
