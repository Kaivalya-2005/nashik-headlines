/**
 * CategoryHeatmap — visual indicator of news activity by category from DB.
 */

import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useCategoryHeatmapQuery } from "@/hooks/useNewsQuery";

export default function CategoryHeatmap() {
  const { data: heatmap = [] } = useCategoryHeatmapQuery();
  const maxCount = Math.max(...heatmap.map((c) => c.count), 1);

  if (heatmap.length === 0) return null;

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-accent/10">
          <BarChart3 size={16} className="text-accent" />
        </div>
        <h2 className="font-headline font-bold text-title">Today's Pulse</h2>
      </div>

      <div className="space-y-3">
        {heatmap.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className="flex items-center gap-3 group"
          >
            <span className="text-caption font-medium w-24 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors capitalize">
              {cat.label}
            </span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full transition-all duration-500 group-hover:bg-accent"
                style={{ width: `${(cat.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-overline text-muted-foreground w-5 text-right tabular-nums">
              {cat.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
