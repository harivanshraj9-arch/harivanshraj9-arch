import { motion } from "framer-motion";
import { Zap, Activity, TrendingUp, Sparkles } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1517358133568-31ec5656304e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxlbGVjdHJpYyUyMHBvd2VyJTIwZ3JpZCUyMGxpbmVzJTIwc3Vuc2V0fGVufDB8fHx8MTc4NTc2OTY3OXww&ixlib=rb-4.1.0&q=85";

export default function Hero({ total = 0, categories = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Power grid at sunset"
          className="w-full h-full object-cover opacity-25 dark:opacity-20"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/60 to-background/95" />
        <div className="absolute inset-0 grid-lines opacity-30" />
      </div>

      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            Live · v2026
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--energy))]/15 text-foreground border border-[hsl(var(--energy))]/30 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Polaris × MVVNL
          </span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-balance max-w-3xl"
        >
          Every operation.
          <br />
          <span className="text-[hsl(var(--primary))]">One command center.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 max-w-2xl text-sm sm:text-base text-muted-foreground"
        >
          A single dashboard for quality control, workforce, finance, inventory
          and every document keeping the Polaris grid running clean.
        </motion.p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            data-testid="hero-open-styra"
            href="https://wfm.saryu.mvvnl.polarisgrids.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[0.98] transition-transform"
          >
            <Zap className="w-4 h-4" />
            Open STYRA Dashboard
            <span className="ml-1 opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
          <button
            data-testid="hero-scroll-resources"
            onClick={() => document.getElementById("resources-section")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-background/50 backdrop-blur text-sm font-semibold hover:bg-background transition-colors"
          >
            <Activity className="w-4 h-4" />
            Browse {total} resources
          </button>
        </div>

        {/* Inline mini stats */}
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
          <MiniStat label="Total Assets" value={total} icon={TrendingUp} />
          <MiniStat label="Categories" value={categories} icon={Sparkles} />
          <MiniStat label="Status" value="Operational" icon={Activity} pulse />
        </div>
      </div>
    </div>
  );
}

const MiniStat = ({ label, value, icon: Icon, pulse }) => (
  <div className="flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${pulse ? "text-emerald-500" : "text-foreground"}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{label}</div>
      <div className="font-heading text-xl font-bold leading-tight">{value}</div>
    </div>
  </div>
);
