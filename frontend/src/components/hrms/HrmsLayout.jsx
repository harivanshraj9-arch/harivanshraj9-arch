import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, Users, Calendar, Umbrella,
  Briefcase, FileText, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useTheme } from "@/lib/theme";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/hrms" },
  { key: "employees", label: "Employees", icon: Users, path: "/hrms/employees" },
  { key: "attendance", label: "Attendance", icon: Calendar, path: "/hrms/attendance" },
  { key: "leaves", label: "Leaves", icon: Umbrella, path: "/hrms/leaves" },
  { key: "payroll", label: "Payroll", icon: Briefcase, path: "/hrms/payroll" },
  { key: "reports", label: "Reports", icon: FileText, path: "/hrms/reports" },
  { key: "settings", label: "Settings", icon: SettingsIcon, path: "/hrms/settings" },
];

export default function HrmsLayout({ children, title = "HRMS & Payroll", subtitle }) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div data-testid="hrms-layout" className="min-h-screen flex bg-background text-foreground">
      <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="hrms" />

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-background border-r border-border">
            <Sidebar theme={theme} onToggleTheme={toggle} activeRoute="hrms" onClose={() => setMobileNav(false)} />
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 glass glass-dark dark:glass-dark [.light_&]:glass-light border-b border-border">
          <div className="px-4 sm:px-8 h-16 flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center" onClick={() => setMobileNav((v) => !v)}>
              {mobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-heading font-black">HRMS</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Module</div>
              <div className="font-heading font-bold">{title}</div>
            </div>
          </div>

          {/* Sub-tabs */}
          <nav data-testid="hrms-tabs" className="px-4 sm:px-8 border-t border-border overflow-x-auto no-scrollbar">
            <div className="flex gap-1 py-2">
              {TABS.map((t) => {
                const isActive = t.path === "/hrms"
                  ? location.pathname === "/hrms"
                  : location.pathname.startsWith(t.path);
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    data-testid={`tab-${t.key}`}
                    onClick={() => navigate(t.path)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                      ${isActive
                        ? "bg-foreground text-background"
                        : "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}
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
          {subtitle && (
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          )}
          {children}

          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">
            © 2026 Prathvi Power Solutions · HRMS &amp; Payroll
          </footer>
        </div>
      </main>

      <MobileBottomNav />

      <Toaster position="top-right" theme={theme}
        toastOptions={{
          style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" },
        }} />
    </div>
  );
}
