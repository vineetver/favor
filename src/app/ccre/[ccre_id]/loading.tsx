import { Skeleton } from "@shared/components/ui/skeleton";

export default function CcreLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Header skeleton */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 3 }, (_, i) => `ccre-tab-${i}`).map((k) => (
            <Skeleton key={k} className="h-6 w-32" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }, (_, i) => `ccre-tile-${i}`).map((k) => (
              <Skeleton key={k} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-16 w-full max-w-3xl rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
