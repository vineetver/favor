import { Skeleton } from "@shared/components/ui/skeleton";

export default function GeneLevelAnnotationLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
