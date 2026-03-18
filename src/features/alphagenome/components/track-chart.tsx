"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { downsample } from "../utils";

const MAX_POINTS = 800;

interface TrackChartProps {
  /** Reference allele signal values */
  refValues: number[];
  /** Alternate allele signal values (omit for region-only view) */
  altValues?: number[];
  /** Index of variant position in the values array */
  variantIndex?: number;
  /** Display label (tissue / biosample name) */
  label: string;
  height?: number;
}

interface DataPoint {
  i: number;
  ref: number;
  alt?: number; // negative (mirrored)
}

export function TrackChart({
  refValues,
  altValues,
  variantIndex,
  label,
  height,
}: TrackChartProps) {
  const effectiveHeight = height ?? (altValues ? 120 : 80);
  const hasAlt = altValues != null;

  const data = useMemo<DataPoint[]>(() => {
    const ref = downsample(refValues, MAX_POINTS);
    if (!hasAlt) {
      return ref.map((v, i) => ({ i, ref: v }));
    }
    const alt = downsample(altValues!, MAX_POINTS);
    return ref.map((v, i) => ({ i, ref: v, alt: -alt[i] }));
  }, [refValues, altValues, hasAlt]);

  const scaledVariantIndex =
    variantIndex != null
      ? Math.round((variantIndex / refValues.length) * data.length)
      : undefined;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5 pl-1">{label}</p>
      <div className="border border-border/50 rounded bg-card">
        <ResponsiveContainer width="100%" height={effectiveHeight}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["auto", "auto"]} />

            {/* Zero line — separates ref (up) from alt (down) */}
            {hasAlt && (
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={0.5} />
            )}

            {/* Ref signal: up */}
            <Area
              type="monotone"
              dataKey="ref"
              stroke="hsl(221, 83%, 53%)"
              fill="hsl(221, 83%, 53%)"
              fillOpacity={0.15}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              baseValue={0}
            />

            {/* Alt signal: mirrored down */}
            {hasAlt && (
              <Area
                type="monotone"
                dataKey="alt"
                stroke="hsl(0, 84%, 60%)"
                fill="hsl(0, 84%, 60%)"
                fillOpacity={0.15}
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                baseValue={0}
              />
            )}

            {/* Variant position */}
            {scaledVariantIndex != null && (
              <ReferenceLine
                x={scaledVariantIndex}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
                strokeDasharray="4 2"
                strokeOpacity={0.4}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
