import { Skeleton } from "@shared/components/ui/skeleton";

export default function DocsLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-10 xl:gap-12">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block w-52 space-y-2 shrink-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded-md" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="min-w-0 flex-1 max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <div className="pt-4 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="pt-4 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      {/* TOC slot */}
      <div className="hidden xl:block w-48 shrink-0" />
    </div>
  );
}
