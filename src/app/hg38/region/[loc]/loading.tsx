import { Skeleton } from "@shared/components/ui/skeleton";

export default function RegionLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Region header */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        {/* Category tabs */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 4 }, (_, i) => `tab-${i}`).map((k) => (
            <Skeleton key={k} className="h-6 w-28" />
          ))}
        </div>
        {/* Content area */}
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
