import { Skeleton } from "@shared/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="text-center mb-12 space-y-2">
          <Skeleton className="h-10 w-32 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
