import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for VariantSummary component
 * Matches the structure of the actual summary card for a smooth loading experience
 */
export function VariantSummarySkeleton() {
    return (
        <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 sm:px-6 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-64" />
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pt-5 pb-5 sm:px-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="pt-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="pt-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}
