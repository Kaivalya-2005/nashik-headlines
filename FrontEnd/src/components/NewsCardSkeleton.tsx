/**
 * NewsCardSkeleton — loading placeholder for news cards.
 * Mimics the card layout with shimmer animation.
 */

interface SkeletonProps {
  variant?: "default" | "featured" | "compact";
}

export default function NewsCardSkeleton({ variant = "default" }: SkeletonProps) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3 p-3">
        <div className="skeleton w-16 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2 py-0.5">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton h-3.5 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className="rounded-xl overflow-hidden bg-card border border-border">
        <div className="skeleton aspect-[16/9] w-full" />
        <div className="p-5 space-y-3">
          <div className="skeleton h-4 w-20 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-full rounded" />
            <div className="skeleton h-6 w-4/5 rounded" />
          </div>
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="flex justify-between pt-1">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border">
      <div className="skeleton aspect-[16/10] w-full" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-3.5 w-16 rounded-full" />
        <div className="skeleton h-4.5 w-full rounded" />
        <div className="skeleton h-4.5 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="flex justify-between pt-1">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
