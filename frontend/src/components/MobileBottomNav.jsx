import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Users, Receipt, Database } from "lucide-react";

const ITEMS = [
  { path: "/", label: "Home", icon: LayoutDashboard, exact: true, testid: "bnav-home" },
  { path: "/expenses", label: "Expenses", icon: Wallet, testid: "bnav-expenses" },
  { path: "/hrms", label: "HRMS", icon: Users, testid: "bnav-hrms" },
  { path: "/billing", label: "Billing", icon: Receipt, testid: "bnav-billing" },
  { path: "/discom", label: "DISCOM", icon: Database, testid: "bnav-discom" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ path, label, icon: Icon, exact, testid }) => {
          const active = exact ? location.pathname === path : location.pathname.startsWith(path);
          return (
            <li key={path}>
              <NavLink
                to={path}
                data-testid={testid}
                end={!!exact}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold
                  ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors
                  ${active ? "bg-foreground text-background" : ""}`}>
                  <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
