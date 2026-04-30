import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Loading skeleton for the regulatory overview page. Mirrors the actual
 * layout shape: a TissueEvidenceSummary block (header + grid of evidence
 * cards across tissues) followed by a TargetGenesView table.
 *
 * Without this file the page falls back to the generic
 * /[category]/loading.tsx which renders an off-shape 3-block placeholder.
 */
export default function RegulatoryOverviewLoading() {
  return (
    <div className="space-y-8">
      {/* TissueEvidenceSummary skeleton */}
      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-2 h-3.5 w-80" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={`tissue-row-${rowIdx}`}
              className="grid grid-cols-[160px_1fr] gap-4 items-center"
            >
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, cellIdx) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                    key={`tissue-cell-${rowIdx}-${cellIdx}`}
                    className="h-8 rounded"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TargetGenesView skeleton */}
      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-3.5 w-72" />
        </div>
        <div className="p-4 space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-[120px_1fr_120px_120px_120px] gap-3 pb-2 border-b">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={`gene-row-${idx}`}
              className="grid grid-cols-[120px_1fr_120px_120px_120px] gap-3 py-2"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
