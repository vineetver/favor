"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  BarChart as RechartsBarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMaveUrlState } from "../../hooks/use-mave-url-state";
import type { Calibration, HistogramBin, LabelClass } from "../../types";

interface HistogramChartProps {
  bins: HistogramBin[];
  bands: Calibration[];
}

const BAND_FILL: Record<LabelClass, string> = {
  LOF: "rgb(244 63 94 / 0.10)", // rose-500
  GoF: "rgb(16 185 129 / 0.10)", // emerald-500
  Functional: "rgb(14 165 233 / 0.10)", // sky-500
  Intermediate: "rgb(245 158 11 / 0.10)", // amber-500
};

const BAND_LABEL_COLOR: Record<LabelClass, string> = {
  LOF: "rgb(190 18 60)",
  GoF: "rgb(5 150 105)",
  Functional: "rgb(2 132 199)",
  Intermediate: "rgb(217 119 6)",
};

interface ChartRow {
  mid: number;
  lo: number;
  hi: number;
  count: number;
  /** Distinct label classes the bin overlaps with the active calibration's bands. */
  classes: LabelClass[];
}

function classesForBin(
  binLo: number,
  binHi: number,
  bands: Calibration[],
): LabelClass[] {
  const seen = new Set<LabelClass>();
  for (const b of bands) {
    if (!b.label_class) continue;
    const lo = b.range_low ?? Number.NEGATIVE_INFINITY;
    const hi = b.range_high ?? Number.POSITIVE_INFINITY;
    if (binLo < hi && binHi > lo) seen.add(b.label_class);
  }
  return [...seen];
}

function rowsFromBins(bins: HistogramBin[], bands: Calibration[]): ChartRow[] {
  return bins.map((b) => ({
    mid: (b.lo + b.hi) / 2,
    lo: b.lo,
    hi: b.hi,
    count: b.count,
    classes: classesForBin(b.lo, b.hi, bands),
  }));
}

interface BandRegion {
  band: Calibration;
  lo: number;
  hi: number;
}

function bandRegionsFor(
  bands: Calibration[],
  axisLo: number,
  axisHi: number,
): BandRegion[] {
  return bands
    .filter((b) => b.label_class != null)
    .map((b) => ({
      band: b,
      lo: b.range_low ?? axisLo,
      hi: b.range_high ?? axisHi,
    }));
}

export function HistogramChart({ bins, bands }: HistogramChartProps) {
  const { state, set } = useMaveUrlState();
  const rows = rowsFromBins(bins, bands);

  const isBinActive = (lo: number, hi: number) =>
    state.smin === lo && state.smax === hi;
  const anyActive = rows.some((r) => isBinActive(r.lo, r.hi));

  function onBarClick(row: ChartRow) {
    if (isBinActive(row.lo, row.hi)) {
      set({ smin: null, smax: null });
    } else {
      set({ smin: row.lo, smax: row.hi });
    }
  }

  const axisLo = rows.length > 0 ? rows[0].lo : 0;
  const axisHi = rows.length > 0 ? rows[rows.length - 1].hi : 1;

  const regions = bandRegionsFor(bands, axisLo, axisHi);

  const thresholdSet = new Set<number>();
  for (const b of bands) {
    if (b.range_low != null && b.range_low > axisLo && b.range_low < axisHi) {
      thresholdSet.add(b.range_low);
    }
    if (
      b.range_high != null &&
      b.range_high > axisLo &&
      b.range_high < axisHi
    ) {
      thresholdSet.add(b.range_high);
    }
  }
  const thresholds = [...thresholdSet];

  const classMap = new Map<LabelClass, [number, number]>();
  for (const r of regions) {
    const cls = r.band.label_class;
    if (!cls) continue;
    const lo = Math.max(r.lo, axisLo);
    const hi = Math.min(r.hi, axisHi);
    const cur = classMap.get(cls);
    classMap.set(
      cls,
      cur ? [Math.min(cur[0], lo), Math.max(cur[1], hi)] : [lo, hi],
    );
  }
  const classBuckets = [...classMap.entries()].map(([cls, [lo, hi]]) => ({
    cls,
    mid: (lo + hi) / 2,
  }));

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No score distribution available.
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={rows}
          margin={{ top: 24, right: 12, bottom: 24, left: 8 }}
          barCategoryGap={1}
        >
          <CartesianGrid stroke="rgb(0 0 0 / 0.05)" vertical={false} />

          {regions.map((r) => (
            <ReferenceArea
              key={`region-${r.lo}-${r.hi}`}
              x1={r.lo}
              x2={r.hi}
              fill={
                r.band.label_class ? BAND_FILL[r.band.label_class] : undefined
              }
              fillOpacity={1}
              ifOverflow="visible"
            />
          ))}

          {thresholds.map((t) => (
            <ReferenceLine
              key={`th-${t}`}
              x={t}
              stroke="rgb(100 116 139 / 0.6)"
              strokeDasharray="3 3"
              ifOverflow="visible"
            />
          ))}

          {classBuckets.map(({ cls, mid }) => (
            <ReferenceLine
              key={`label-${cls}`}
              x={mid}
              ifOverflow="visible"
              stroke="transparent"
              label={{
                value: cls,
                position: "insideTop",
                fill: BAND_LABEL_COLOR[cls],
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ))}

          <XAxis
            dataKey="mid"
            type="number"
            domain={[axisLo, axisHi]}
            tick={{ fontSize: 10, fill: "rgb(100 116 139)" }}
            tickLine={false}
            axisLine={{ stroke: "rgb(100 116 139 / 0.3)" }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "rgb(100 116 139)" }}
            tickLine={false}
            axisLine={{ stroke: "rgb(100 116 139 / 0.3)" }}
            width={32}
            label={{
              value: "Variants",
              angle: -90,
              position: "insideLeft",
              offset: 0,
              style: {
                fontSize: 10,
                fill: "rgb(100 116 139)",
                textAnchor: "middle",
              },
            }}
          />
          <Tooltip
            cursor={{ fill: "rgb(100 116 139 / 0.08)" }}
            content={<HistogramTooltip />}
          />

          <Bar
            dataKey="count"
            fillOpacity={0.85}
            onClick={(_data, _idx, e) => {
              const payload = (e as { payload?: ChartRow } | undefined)
                ?.payload;
              if (payload) onBarClick(payload);
            }}
            style={{ cursor: "pointer" }}
          >
            {rows.map((r) => (
              <Cell
                key={`bar-${r.lo}-${r.hi}`}
                fill={
                  anyActive && !isBinActive(r.lo, r.hi)
                    ? "rgb(203 213 225)"
                    : "rgb(100 116 139)"
                }
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CHIP_FILL: Record<LabelClass, string> = {
  LOF: "bg-rose-500 text-white",
  GoF: "bg-emerald-500 text-white",
  Functional: "bg-sky-500 text-white",
  Intermediate: "bg-amber-500 text-white",
};

function HistogramTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="text-foreground">
        <span className="text-muted-foreground">Bin range:</span>{" "}
        <span className="tabular-nums font-medium">
          {row.lo.toFixed(2)} to {row.hi.toFixed(2)}
        </span>
      </p>
      {row.classes.length > 0 && (
        <p className="flex items-center gap-1.5 text-foreground">
          <span className="text-muted-foreground">
            Bin classification{row.classes.length === 1 ? "" : "s"}:
          </span>
          {row.classes.map((c) => (
            <span
              key={c}
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CHIP_FILL[c]}`}
            >
              {c}
            </span>
          ))}
        </p>
      )}
      <p className="tabular-nums text-foreground">
        {row.count.toLocaleString()} variant{row.count === 1 ? "" : "s"} in bin
      </p>
    </div>
  );
}
