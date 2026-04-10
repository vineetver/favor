import { Skeleton } from "@shared/components/ui/skeleton";

export default function BatchAnnotationLoading() {
  return (
    <div className="min-h-screen pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
      <Skeleton className="h-4 w-24 mb-8" />
      {/* Wizard card */}
      <div className="rounded-2xl border border-border p-8 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
