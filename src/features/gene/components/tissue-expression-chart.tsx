"use client";

import { cn } from "@infra/utils";
import {
  BarChart,
  CATEGORICAL_PALETTE,
  DEFAULT_BAR_COLOR,
  type ChartDataRow,
} from "@shared/components/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import type { Gene } from "@features/gene/types";
import {
  adaptGtexToTissueArray,
  TISSUE_GROUPS,
} from "@features/gene/utils/tissue-expression";
import { useCallback, useMemo, useState } from "react";

const GROUP_PALETTE = [
  ...CATEGORICAL_PALETTE,
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#a855f7",
];

const GROUP_COLORS = Object.fromEntries(
  TISSUE_GROUPS.map((group, index) => [
    group,
    GROUP_PALETTE[index % GROUP_PALETTE.length],
  ]),
);

type GroupMode = "none" | "system";
type LimitOption = "10" | "25" | "all";
type ScaleMode = "linear" | "log";

interface TissueExpressionChartProps {
  gtex?: Gene["gtex"] | null;
  className?: string;
}

const LIMIT_OPTIONS: Array<{ value: LimitOption; label: string }> = [
  { value: "10", label: "Top 10" },
  { value: "25", label: "Top 25" },
  { value: "all", label: "All" },
];

const GROUP_OPTIONS: Array<{ value: GroupMode; label: string }> = [
  { value: "none", label: "None" },
  { value: "system", label: "Organ System" },
];

const SCALE_OPTIONS: Array<{ value: ScaleMode; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "log", label: "Log" },
];

function logTransform(value: number) {
  return Math.log10(Math.max(value, 0) + 1);
}

function inverseLogTransform(value: number) {
  return Math.max(Math.pow(10, value) - 1, 0);
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label">{label}</span>
      <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                active
                  ? "bg-white text-heading shadow-sm"
                  : "text-body hover:text-heading",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TissueExpressionChart({
  gtex,
  className,
}: TissueExpressionChartProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("system");
  const [limit, setLimit] = useState<LimitOption>("25");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("log");

  const tissueRows = useMemo(() => adaptGtexToTissueArray(gtex), [gtex]);

  const filteredRows = useMemo(() => {
    return tissueRows.filter((row) => {
      if (row.value === null || row.value === undefined) return false;
      return true;
    });
  }, [tissueRows]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });
  }, [filteredRows]);

  const limitedRows = useMemo(() => {
    if (limit === "all") return sortedRows;
    const count = Number.parseInt(limit, 10);
    return sortedRows.slice(0, count);
  }, [sortedRows, limit]);

  const chartData = useMemo<ChartDataRow[]>(() => {
    return limitedRows.map((row) => {
      const value = row.value ?? 0;
      return {
        id: row.tissue,
        label: row.label,
        value: scaleMode === "log" ? logTransform(value) : value,
        category: groupMode === "system" ? row.group : undefined,
      };
    });
  }, [groupMode, limitedRows, scaleMode]);

  const activeGroupColors = useMemo(() => {
    if (groupMode !== "system") return {};

    const activeGroups = new Set(limitedRows.map((row) => row.group));

    return Object.fromEntries(
      Object.entries(GROUP_COLORS).filter(([group]) =>
        activeGroups.has(group),
      ),
    );
  }, [groupMode, limitedRows]);

  const formatValue = useCallback(
    (value: number) => {
      const rawValue =
        scaleMode === "log" ? inverseLogTransform(value) : value;

      if (!Number.isFinite(rawValue)) return "—";
      return rawValue.toFixed(2);
    },
    [scaleMode],
  );

  return (
    <Card className={cn("border border-slate-200", className)}>
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-label">GTEx Tissue Expression</CardTitle>
        <CardDescription className="text-body-sm">
          Expression values across GTEx tissues (sorted by abundance)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <SegmentedControl
              label="Group"
              value={groupMode}
              options={GROUP_OPTIONS}
              onChange={setGroupMode}
            />
            <SegmentedControl
              label="Top"
              value={limit}
              options={LIMIT_OPTIONS}
              onChange={setLimit}
            />
            <SegmentedControl
              label="Scale"
              value={scaleMode}
              options={SCALE_OPTIONS}
              onChange={setScaleMode}
            />
          </div>
        </div>

        <div className="px-6 py-6">
          <BarChart
            data={chartData}
            layout="horizontal"
            showLegend={groupMode === "system"}
            colorField="category"
            colorScheme={
              groupMode === "system"
                ? { type: "categorical", colors: activeGroupColors }
                : { type: "single", color: DEFAULT_BAR_COLOR }
            }
            valueFormatter={formatValue}
            emptyMessage="No tissue expression values available"
          />
        </div>
      </CardContent>
    </Card>
  );
}
