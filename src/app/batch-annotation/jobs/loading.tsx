import { Skeleton } from "@shared/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12 py-12">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        {/* Table skeleton */}
        <div className="rounded-xl border border-border">
          <div className="flex gap-4 p-4 border-b border-border">
            {Array.from({ length: 5 }, (_, i) => `hdr-${i}`).map((k) => (
              <Skeleton key={k} className="h-4 w-24" />
            ))}
          </div>
          {Array.from({ length: 5 }, (_, i) => `row-${i}`).map((rowKey) => (
            <div
              key={rowKey}
              className="flex gap-4 p-4 border-b border-border last:border-0"
            >
              {Array.from({ length: 5 }, (_, j) => `${rowKey}-c${j}`).map(
                (cellKey) => (
                  <Skeleton key={cellKey} className="h-4 w-24" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
