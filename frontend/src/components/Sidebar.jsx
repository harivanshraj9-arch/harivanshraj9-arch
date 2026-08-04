import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Zap, LayoutDashboard, Activity, Users, DollarSign,
  Package, FileText, Scale, UserCheck, Sun, Moon, Wallet,
} from "lucide-react";
import { CATEGORY_META } from "@/lib/categoryMeta";

const CATEGORY_NAV = [
  { key: "All", label: "Overview", icon: LayoutDashboard },
  { key: "Operations", label: "Operations", icon: Activity },
  { key: "HR", label: "HR", icon: Users },
  { key: "Finance", label: "Finance", icon: DollarSign },
  { key: "Inventory", label: "Inventory", icon: Package },
  { key: "Reports", label: "Reports", icon: FileText },
  { key: "Legal", label: "Legal", icon: Scale },
  { key: "Customer", label: "Customer", icon: UserCheck },
];

export default function Sidebar({
  active, onSelect, theme, onToggleTheme, counts = {},
  activeRoute, onClose,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const onDashboard = location.pathname === "/" || activeRoute === "dashboard";
  const onExpenses = location.pathname === "/expenses" || activeRoute === "expenses";

  const handleCategoryClick = (key) => {
    if (onDashboard && onSelect) {
      onSelect(key);
    } else {
      navigate("/", { state: { category: key } });
    }
    onClose?.();
  };

  const goExpenses = () => {
    navigate("/expenses");
    onClose?.();
  };

  return (
    <aside
      data-testid="sidebar"
      className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-border bg-background sticky top-0 h-screen"
    >
      {/* Brand */}
      <button onClick={() => { navigate("/"); onClose?.(); }} className="px-6 pt-7 pb-8 text-left hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 blur-lg bg-[hsl(var(--primary))]/60 rounded-lg" />
            <div className="relative w-11 h-11 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Zap className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.24em] font-bold text-muted-foreground uppercase">
              Enterprise Suite
            </div>
            <div className="font-heading text-base font-black leading-tight mt-0.5">
              Prathvi Power<br/>Solutions
            </div>
          </div>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {/* Modules section */}
        <div className="px-3 pb-2 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Modules
        </div>
        <button
          data-testid="nav-daily-expenses"
          onClick={goExpenses}
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${onExpenses
              ? "bg-foreground text-background"
              : "text-foreground/70 hover:text-foreground hover:bg-muted"}`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Daily Expenses</span>
          {onExpenses && (
            <motion.div layoutId="sidebar-active-dot" className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--energy))]" />
          )}
        </button>

        <div className="mt-4 px-3 pb-2 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Workspace
        </div>
        {CATEGORY_NAV.map((item) => {
          const isActive = onDashboard && active === item.key;
          const Icon = item.icon;
          const c = item.key !== "All" ? CATEGORY_META[item.key] : null;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              data-testid={`nav-${item.key.toLowerCase()}`}
              onClick={() => handleCategoryClick(item.key)}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted"}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {typeof count === "number" && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                  ${isActive ? "bg-background/20" : c ? `${c.tint} ${c.accent}` : "bg-muted"}`}>
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div layoutId="sidebar-active-dot" className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--energy))]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Theme toggle */}
      <div className="p-4 border-t border-border">
        <button
          data-testid="theme-toggle"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === "dark" ? "Dark" : "Light"} Mode
          </span>
          <div className={`w-9 h-5 rounded-full relative transition-colors
            ${theme === "dark" ? "bg-[hsl(var(--primary))]" : "bg-border"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
              ${theme === "dark" ? "left-[18px]" : "left-0.5"}`} />
          </div>
        </button>
        <div className="mt-3 flex items-center gap-2 px-3 text-[10px] text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>All systems online</span>
        </div>
      </div>
    </aside>
  );
}
