import { Skeleton } from "@shared/components/ui/skeleton";

export default function CLILoading() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
          <Skeleton className="h-12 w-72 mx-auto rounded-lg mt-6" />
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-5 space-y-3"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
