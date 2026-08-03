import {
  Activity, Users, DollarSign, Package, FileText, Scale,
  UserCheck, LayoutDashboard, Sparkles, Folder, FileSpreadsheet, Zap,
} from "lucide-react";

export const CATEGORY_META = {
  Operations: {
    icon: Activity,
    accent: "text-[hsl(var(--primary))]",
    dot: "bg-[hsl(var(--primary))]",
    ring: "ring-[hsl(var(--primary))]",
    tint: "bg-[hsl(var(--primary))]/10",
  },
  HR: {
    icon: Users,
    accent: "text-[hsl(var(--energy))]",
    dot: "bg-[hsl(var(--energy))]",
    ring: "ring-[hsl(var(--energy))]",
    tint: "bg-[hsl(var(--energy))]/15",
  },
  Finance: {
    icon: DollarSign,
    accent: "text-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500",
    tint: "bg-emerald-500/10",
  },
  Inventory: {
    icon: Package,
    accent: "text-fuchsia-500",
    dot: "bg-fuchsia-500",
    ring: "ring-fuchsia-500",
    tint: "bg-fuchsia-500/10",
  },
  Reports: {
    icon: FileText,
    accent: "text-sky-500",
    dot: "bg-sky-500",
    ring: "ring-sky-500",
    tint: "bg-sky-500/10",
  },
  Legal: {
    icon: Scale,
    accent: "text-orange-500",
    dot: "bg-orange-500",
    ring: "ring-orange-500",
    tint: "bg-orange-500/10",
  },
  Customer: {
    icon: UserCheck,
    accent: "text-[hsl(var(--destructive))]",
    dot: "bg-[hsl(var(--destructive))]",
    ring: "ring-[hsl(var(--destructive))]",
    tint: "bg-[hsl(var(--destructive))]/10",
  },
};

export const DEFAULT_META = {
  icon: LayoutDashboard,
  accent: "text-muted-foreground",
  dot: "bg-muted-foreground",
  ring: "ring-muted-foreground",
  tint: "bg-muted",
};

export const KIND_ICON = {
  dashboard: Zap,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  folder: Folder,
};

export const getMeta = (cat) => CATEGORY_META[cat] || DEFAULT_META;
export const getKindIcon = (k) => KIND_ICON[k] || Sparkles;
