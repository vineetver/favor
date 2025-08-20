import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-layouts";

export default function ScentLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar skeleton */}
      <div className="lg:w-80 lg:flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardContent>
            <TableSkeleton rows={10} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}