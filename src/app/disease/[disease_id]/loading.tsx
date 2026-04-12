import { Skeleton } from "@shared/components/ui/skeleton";

export default function DiseaseLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Header skeleton */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-3 w-64" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 7 }, (_, i) => `dis-tab-${i}`).map((k) => (
            <Skeleton key={k} className="h-6 w-20" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-6 pt-4">
          <Skeleton className="h-16 w-full max-w-3xl rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => `dis-card-${i}`).map((k) => (
              <Skeleton key={k} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
