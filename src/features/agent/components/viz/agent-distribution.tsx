"use client";

import { memo, useCallback, useMemo } from "react";
import { BarChart } from "@shared/components/charts";
import type { ChartDataRow } from "@shared/components/charts";
import type { DistributionVizSpec } from "../../viz/types";

const DistributionGroup = memo(function DistributionGroup({
  group,
}: {
  group: DistributionVizSpec["groups"][number];
}) {
  const chartData = useMemo<ChartDataRow[]>(
    () =>
      group.data.map((d) => ({
        id: d.id,
        label: d.label,
        value: d.value,
      })),
    [group.data],
  );

  const valueFormatter = useCallback(
    (v: number) => (v >= 1000 ? v.toLocaleString() : String(Math.round(v))),
    [],
  );

  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1">{group.label}</p>
      <BarChart
        data={chartData}
        layout="horizontal"
        showLegend={false}
        valueFormatter={valueFormatter}
      />
    </div>
  );
});

export const AgentDistribution = memo(function AgentDistribution({ spec }: { spec: DistributionVizSpec }) {
  return (
    <div className="space-y-4">
      {spec.groups.map((g, i) => (
        <DistributionGroup key={i} group={g} />
      ))}
    </div>
  );
});
