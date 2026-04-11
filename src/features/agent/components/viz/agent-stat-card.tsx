import type { StatCardVizSpec } from "../../viz/types";

export function AgentStatCard({ spec }: { spec: StatCardVizSpec }) {
  const cols =
    spec.stats.length <= 2
      ? "grid-cols-2"
      : spec.stats.length === 3
        ? "grid-cols-3"
        : "grid-cols-4";

  return (
    <div className={`grid ${cols} gap-3`}>
      {spec.stats.map((s, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <p className="text-[11px] text-muted-foreground mb-0.5">{s.label}</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {typeof s.value === "number"
              ? s.value.toLocaleString(undefined, { maximumFractionDigits: 4 })
              : s.value}
          </p>
          {s.subtitle && (
            <p className="text-[10px] text-muted-foreground">{s.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
