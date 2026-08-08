import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Zap, LayoutDashboard, Users, Boxes, Activity, LogOut,
  Menu, X, ShieldCheck, ChevronDown, Sun, Moon } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { authApi } from "@/lib/adminApi";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin", exact: true },
  { key: "users", label: "Users", icon: Users, path: "/admin/users" },
  { key: "resources", label: "Resources", icon: Boxes, path: "/admin/resources" },
  { key: "activity", label: "Activity Log", icon: Activity, path: "/admin/activity" },
];

export default function AdminLayout({ children, title = "Admin Panel", subtitle }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = authApi.getCachedUser();

  const logout = async () => {
    await authApi.logout();
    toast.success("Signed out");
    navigate("/admin/login", { replace: true });
  };

  const NavItems = ({ onClick }) => (
    <>
      {NAV.map(n => {
        const Icon = n.icon;
        const active = n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path);
        return (
          <NavLink
            key={n.key}
            to={n.path}
            end={!!n.exact}
            data-testid={`admin-nav-${n.key}`}
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${active ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground hover:bg-muted"}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{n.label}</span>
          </NavLink>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside data-testid="admin-sidebar" className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-border sticky top-0 h-screen">
        <button onClick={() => navigate("/admin")} className="px-5 pt-6 pb-6 text-left hover:opacity-90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center"><Zap className="w-5 h-5" strokeWidth={2.5}/></div>
            <div>
              <div className="text-[10px] tracking-[0.24em] font-bold text-muted-foreground uppercase">Admin Panel</div>
              <div className="font-heading text-sm font-black leading-tight">Prathvi Power<br/>Solutions</div>
            </div>
          </div>
        </button>
        <nav className="flex-1 px-3 space-y-1"><NavItems /></nav>
        <div className="px-3 pb-3">
          <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[260px] bg-background border-r border-border p-3 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center"><Zap className="w-4 h-4" /></div>
                <span className="font-heading font-black">Admin</span>
              </div>
              <button onClick={() => setMobileNav(false)} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <nav className="flex-1 space-y-1"><NavItems onClick={() => setMobileNav(false)} /></nav>
          </div>
          <div className="flex-1 bg-background/60" onClick={() => setMobileNav(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 glass glass-dark dark:glass-dark [.light_&]:glass-light border-b border-border">
          <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center" onClick={() => setMobileNav(v => !v)}>
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))]" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Admin</div>
                <div className="font-heading font-bold text-sm truncate">{title}</div>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted"
            >
              View Website
            </button>
            <div className="relative">
              <button
                data-testid="admin-user-menu"
                onClick={() => setMenuOpen(v => !v)}
                className="inline-flex items-center gap-2 h-9 px-2 sm:px-3 rounded-full border border-border hover:bg-muted"
              >
                <div className="w-6 h-6 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                  {(user?.name || "?")[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold">{user?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-40">
                  <div className="px-3 py-3 border-b border-border">
                    <div className="text-sm font-bold truncate">{user?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    <div className="mt-1 inline-block text-[10px] uppercase tracking-wider font-bold bg-muted px-2 py-0.5 rounded-full">{user?.role}</div>
                  </div>
                  <button onClick={logout} data-testid="admin-logout"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-[hsl(var(--destructive))]">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6 space-y-6 max-w-[1600px]">
          {subtitle && (
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          )}
          {children}
          <footer className="pt-6 pb-10 border-t border-border text-xs text-muted-foreground">
            © 2026 Prathvi Power Solutions · Admin Panel
          </footer>
        </div>
      </main>

      <Toaster position="top-right" theme={theme}
        toastOptions={{ style: { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" } }} />
    </div>
  );
}
