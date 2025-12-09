export default function Loading() {
  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="px-6 py-3 border-b border-border/40">
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
