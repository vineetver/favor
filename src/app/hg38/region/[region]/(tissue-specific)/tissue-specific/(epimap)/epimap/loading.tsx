import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGridSkeleton } from "@/components/ui/skeleton-layouts";

export default function EpimapLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-60" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGridSkeleton items={18} />
      </CardContent>
    </Card>
  );
}