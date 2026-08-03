import { CATEGORY_META } from "@/lib/categoryMeta";

const ORDER = ["All", "Operations", "HR", "Finance", "Inventory", "Reports", "Legal", "Customer"];

export default function CategoryFilter({ active, onChange, counts = {} }) {
  return (
    <div data-testid="category-filter" className="flex flex-wrap items-center gap-2">
      {ORDER.map((cat) => {
        const isActive = active === cat;
        const meta = cat !== "All" ? CATEGORY_META[cat] : null;
        const count = cat === "All"
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[cat] ?? 0);
        return (
          <button
            key={cat}
            data-testid={`filter-${cat.toLowerCase()}`}
            onClick={() => onChange(cat)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all
              ${isActive
                ? "bg-foreground text-background"
                : "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}
          >
            {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
            {cat}
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                ${isActive ? "bg-background/20" : "bg-muted"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
