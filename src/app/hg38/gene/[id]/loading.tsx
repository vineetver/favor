import { Skeleton } from "@shared/components/ui/skeleton";

export default function GeneLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Gene header */}
        <div className="py-8 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {/* Category tabs */}
        <div className="flex gap-4 border-b border-border pb-2 mb-6">
          {Array.from({ length: 5 }, (_, i) => `gene-tab-${i}`).map((k) => (
            <Skeleton key={k} className="h-6 w-28" />
          ))}
        </div>
        {/* Sub-navigation sidebar + content */}
        <div className="flex gap-8">
          <div className="hidden lg:block w-52 space-y-2">
            {Array.from({ length: 8 }, (_, i) => `gene-nav-${i}`).map((k) => (
              <Skeleton key={k} className="h-7 w-full rounded-md" />
            ))}
          </div>
          <div className="flex-1 space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
