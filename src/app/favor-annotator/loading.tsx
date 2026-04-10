import { Skeleton } from "@shared/components/ui/skeleton";

export default function AnnotatorLoading() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-48 w-full rounded-lg mt-4" />
      </div>
    </div>
  );
}
