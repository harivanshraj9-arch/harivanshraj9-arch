import { motion } from "framer-motion";
import { Database, Layers, Star, Zap } from "lucide-react";

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function KpiGrid({ stats }) {
  if (!stats) return null;

  const total = stats.total_resources ?? 0;
  const cats = stats.categories ?? 0;
  const starred = stats.starred ?? 0;
  const activity = stats.activity_count ?? 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Big card spans 2 */}
      <motion.div
        variants={item}
        data-testid="kpi-total"
        className="sm:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-card p-6 group hover:border-[hsl(var(--primary))]/40 transition-colors"
      >
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-[hsl(var(--primary))]/8 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
              Total Resources
            </span>
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <div className="font-heading text-6xl font-black leading-none">{total}</div>
            <div className="text-xs text-muted-foreground pb-2">indexed</div>
          </div>
          <div className="mt-6 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[hsl(var(--primary))]" style={{ width: "100%" }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">All Polaris assets synced</div>
        </div>
      </motion.div>

      <Stat
        title="Categories"
        value={cats}
        icon={Layers}
        accent="text-[hsl(var(--energy))]"
        tint="bg-[hsl(var(--energy))]/15"
        testid="kpi-categories"
      />
      <Stat
        title="Starred"
        value={starred}
        icon={Star}
        accent="text-emerald-500"
        tint="bg-emerald-500/10"
        testid="kpi-starred"
      />
      <Stat
        title="Activity"
        value={activity}
        icon={Zap}
        accent="text-[hsl(var(--destructive))]"
        tint="bg-[hsl(var(--destructive))]/10"
        testid="kpi-activity"
        subtitle="opens tracked"
        className="sm:col-span-2 lg:col-span-1"
      />
      <Stat
        title="Latest FY"
        value="2026"
        icon={Zap}
        accent="text-sky-500"
        tint="bg-sky-500/10"
        testid="kpi-fy"
        subtitle="salary sheet ready"
        className="sm:col-span-2 lg:col-span-2"
        big
      />
    </motion.div>
  );
}

const Stat = ({ title, value, icon: Icon, accent, tint, testid, subtitle, className = "", big = false }) => (
  <motion.div
    variants={item}
    data-testid={testid}
    className={`relative rounded-2xl border border-border bg-card p-6 hover:border-foreground/20 transition-colors ${className}`}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{title}</span>
      <div className={`w-9 h-9 rounded-lg ${tint} ${accent} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className={`mt-6 font-heading font-black leading-none ${big ? "text-5xl" : "text-4xl"}`}>{value}</div>
    {subtitle && <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>}
  </motion.div>
);
