import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-layouts";

export default function IntegrativeLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-56" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={12} />
      </CardContent>
    </Card>
  );
}
