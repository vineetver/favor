import { Skeleton } from "@/components/ui/skeleton";

export function DataGridSkeleton({
  items = 6,
  columns = "md:grid-cols-2 lg:grid-cols-3",
}: {
  items?: number;
  columns?: string;
}) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border rounded-lg">
        <div className="border-b p-4">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex-1 space-y-2 p-3 border rounded">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="h-64 border rounded-lg p-4">
        <div className="h-full flex items-end justify-between gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-full"
              style={{ height: `${Math.random() * 100 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
