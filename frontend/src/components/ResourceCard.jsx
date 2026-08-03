import { motion } from "framer-motion";
import { ArrowUpRight, Star } from "lucide-react";
import { getMeta, getKindIcon } from "@/lib/categoryMeta";

const cardVariant = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ResourceCard({ resource, onOpen, onToggleStar }) {
  const meta = getMeta(resource.category);
  const KindIcon = getKindIcon(resource.kind);
  const Icon = meta.icon;

  return (
    <motion.div
      variants={cardVariant}
      data-testid={`resource-card-${resource.sno}`}
      className="group relative h-full flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300
        hover:-translate-y-1 hover:border-foreground/30 hover:shadow-[0_18px_40px_-18px_hsl(var(--primary)/0.35)]"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-lg ${meta.tint} ${meta.accent} flex items-center justify-center`}>
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            data-testid={`star-btn-${resource.sno}`}
            onClick={(e) => { e.stopPropagation(); onToggleStar(resource); }}
            aria-label={resource.starred ? "Unstar" : "Star"}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors
              ${resource.starred ? "text-[hsl(var(--energy))]" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <Star className="w-4 h-4" fill={resource.starred ? "currentColor" : "none"} />
          </button>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.tint} ${meta.accent}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {resource.category}
          </span>
        </div>
      </div>

      {/* Body */}
      <h3 className="font-heading text-lg font-bold tracking-tight leading-snug mb-2">
        {resource.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-5">
        {resource.description}
      </p>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <KindIcon className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wider text-[10px] font-bold">{resource.kind}</span>
        </div>
        <button
          data-testid={`open-resource-${resource.sno}`}
          onClick={() => onOpen(resource)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold group-hover:bg-[hsl(var(--primary))] transition-colors"
        >
          Open
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
