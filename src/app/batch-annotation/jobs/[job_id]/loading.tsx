import { Skeleton } from "@shared/components/ui/skeleton";

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12 py-12">
        <Skeleton className="h-4 w-20 mb-6" />
        {/* Header */}
        <div className="space-y-2 mb-8">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
        {/* Status + progress */}
        <div className="rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        {/* Data table */}
        <div className="rounded-xl border border-border">
          <div className="flex gap-4 p-4 border-b border-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border last:border-0">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
