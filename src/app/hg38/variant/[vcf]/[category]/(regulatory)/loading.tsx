import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Default skeleton for any (regulatory) subroute that doesn't ship its
 * own loading.tsx. Each subroute (qtls, chrombpnet, methylation, etc.)
 * renders a card-with-table layout — this skeleton matches that shape.
 *
 * Pages that have a more specific shape (e.g. overview/loading.tsx) win
 * because Next.js prefers the closest loading boundary.
 */
export default function RegulatoryLoading() {
  return (
    <div className="space-y-6">
      {/* Filter / tissue-group selector */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Card with title + table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-2 h-3.5 w-96" />
        </div>
        <div className="p-4 space-y-3">
          {/* Table header row */}
          <div className="grid grid-cols-6 gap-3 pb-2 border-b">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                key={`th-${i}`}
                className="h-3.5 w-20"
              />
            ))}
          </div>
          {/* Body rows */}
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={`tr-${rowIdx}`}
              className="grid grid-cols-6 gap-3 py-2"
            >
              {Array.from({ length: 6 }).map((_, cellIdx) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                  key={`td-${rowIdx}-${cellIdx}`}
                  className="h-4 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
