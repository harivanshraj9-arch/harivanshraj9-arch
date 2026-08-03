import { formatDistanceToNow } from "date-fns";
import { Zap } from "lucide-react";

export default function ActivityFeed({ items = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Recent</div>
          <h3 className="font-heading text-xl font-bold mt-1">Activity</h3>
        </div>
        <span className="text-xs text-muted-foreground">Last {items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-10 text-center">
          <Zap className="w-6 h-6 mx-auto mb-2 opacity-40" />
          No activity yet. Open a resource to start tracking.
        </div>
      ) : (
        <ul data-testid="activity-list" className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-[hsl(var(--primary))] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.resource_title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {a.action} · {a.timestamp ? formatDistanceToNow(new Date(a.timestamp), { addSuffix: true }) : "just now"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
