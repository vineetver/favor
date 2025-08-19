import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-layouts";

export default function CCRELoading() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="w-full">
        <div className="h-12 p-1 bg-primary/10 border border-primary/20 rounded-lg flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:w-80 lg:flex-shrink-0 space-y-4">
          {/* Distance slider skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Tissue filter skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={10} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
