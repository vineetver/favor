import { Skeleton } from "@shared/components/ui/skeleton";

export default function DrugLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Header skeleton */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-3 w-48" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-6 pt-4">
          <Skeleton className="h-20 w-full max-w-3xl rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
