import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-layouts";

export default function PPILoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-56" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <StatCardsSkeleton cards={3} />
          <TableSkeleton rows={8} />
        </div>
      </CardContent>
    </Card>
  );
}
