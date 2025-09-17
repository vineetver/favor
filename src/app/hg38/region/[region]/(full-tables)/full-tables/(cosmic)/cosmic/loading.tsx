import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGridSkeleton } from "@/components/ui/skeleton-layouts";

export default function CosmicLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-80" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGridSkeleton items={25} />
      </CardContent>
    </Card>
  );
}
