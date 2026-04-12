import { Skeleton } from "@shared/components/ui/skeleton";

export default function PhenotypeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Header skeleton */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-3 w-48" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 5 }, (_, i) => `phe-tab-${i}`).map((k) => (
            <Skeleton key={k} className="h-6 w-24" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => `phe-tile-${i}`).map((k) => (
              <Skeleton key={k} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-16 w-full max-w-3xl rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
