import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/skeleton-layouts";

export default function SummaryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-64" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StatCardsSkeleton cards={4} />
          <ChartSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
