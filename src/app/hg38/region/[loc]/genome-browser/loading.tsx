import { Skeleton } from "@shared/components/ui/skeleton";

export default function RegionGenomeBrowserLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  );
}
