import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGridSkeleton } from "@/components/ui/skeleton-layouts";

export default function EntexLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-56" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGridSkeleton items={12} />
      </CardContent>
    </Card>
  );
}
