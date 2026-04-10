import { Skeleton } from "@shared/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-8">
          {/* Profile section */}
          <div className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
          {/* API keys section */}
          <div className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          {/* Quota section */}
          <div className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-16" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
