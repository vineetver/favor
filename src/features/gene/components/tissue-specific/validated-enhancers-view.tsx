"use client";

import { cn } from "@infra/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { useState, useMemo } from "react";
import type { ValidatedEnhancerRow, RegionSummary } from "@features/gene/api/region";
import { RegionContextBar } from "./region-context-bar";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ValidatedEnhancersViewProps {
  loc: string;
  data: ValidatedEnhancerRow[];
  regionCoords: string;
  summary?: RegionSummary | null;
  basePath?: string;
}

export function ValidatedEnhancersView({
  loc,
  data,
  regionCoords,
  summary,
  basePath,
}: ValidatedEnhancersViewProps) {
  const [positiveOnly, setPositiveOnly] = useState(false);

  const filtered = useMemo(
    () => (positiveOnly ? data.filter((r) => r.is_positive) : data),
    [data, positiveOnly],
  );

  const positiveCount = useMemo(
    () => data.filter((r) => r.is_positive).length,
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No VISTA validated enhancers found in this region
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && basePath && (
        <RegionContextBar
          summary={summary}
          basePath={basePath}
          currentSlug="validated-enhancers"
        />
      )}

      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data.length} VISTA element{data.length !== 1 ? "s" : ""} &middot;{" "}
            {positiveCount} positive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="positive-only"
            checked={positiveOnly}
            onCheckedChange={setPositiveOnly}
          />
          <Label htmlFor="positive-only" className="text-xs text-muted-foreground cursor-pointer">
            Positive only
          </Label>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-3">
        {filtered.map((row) => (
          <EnhancerCard key={`${row.element_id}-${row.start}`} row={row} />
        ))}
      </div>

      {filtered.length === 0 && positiveOnly && (
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No positive enhancers in this region
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setPositiveOnly(false)}
          >
            Show all elements
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EnhancerCard
// ---------------------------------------------------------------------------

function EnhancerCard({ row }: { row: ValidatedEnhancerRow }) {
  const tissues = row.tissues_raw
    ? row.tissues_raw
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        row.is_positive
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          {/* ID + coordinates */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-medium text-foreground">
              {row.element_id}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {row.start.toLocaleString()}&ndash;{row.end.toLocaleString()}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              ({(row.end - row.start).toLocaleString()} bp)
            </span>
          </div>

          {/* Status */}
          <div>
            <Badge
              variant={row.is_positive ? "default" : "secondary"}
              className={cn(
                "text-[10px]",
                row.is_positive && "bg-emerald-600 hover:bg-emerald-600",
              )}
            >
              {row.is_positive ? "Positive" : "Negative"}
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              {row.is_positive
                ? "Validated in vivo"
                : "Tested, no activity observed"}
            </span>
          </div>

          {/* Tissues */}
          {tissues.length > 0 && (
            <div className="flex items-start gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                Tissues:
              </span>
              <div className="flex flex-wrap gap-1">
                {tissues.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
