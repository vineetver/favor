"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { DataViewLayout } from "@/components/layout/data-view-layout";
import { IntegrativeTable } from "./integrative-table";
import type { EnrichedGroup } from "@/lib/data-display/enricher";
import { roundNumber } from "@/lib/data-display/helpers";
import { NoDataState } from "@/components/ui/error-states";
import { ChartTooltip } from "@/components/common/chart-tooltip";

interface IntegrativeVisualizationProps {
    enrichedData: EnrichedGroup[];
    category: string;
    subcategory: string;
}

export function IntegrativeVisualization({
    enrichedData,
    category,
    subcategory,
}: IntegrativeVisualizationProps) {
    // Get the target group data
    const targetGroup = enrichedData.find((group) => group.slug === subcategory);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!targetGroup || !targetGroup.cells) return [];

        return targetGroup.cells
            .map((cell) => {
                const score = typeof cell.value === "string" ? parseFloat(cell.value) : Number(cell.value);
                if (isNaN(score)) return null;

                // Calculate percentile
                const percentile = Math.pow(10, -score / 10) * 100;

                return {
                    name: cell.header,
                    shortName: cell.header.replace("aPC-", "").replace("Protein Function", "Prot. Func."), // Shorten names for X-axis
                    score: score,
                    percentile: percentile,
                    fullHeader: cell.header,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.score - a.score); // Sort by score descending
    }, [targetGroup]);

    if (!targetGroup) {
        return <NoDataState categoryName="Integrative Data" />;
    }

    // Custom Tooltip for Chart
    const CustomTooltip = (props: any) => {
        const { active, payload } = props;
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <ChartTooltip active={active} payload={payload} title={data.fullHeader}>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">PHRED Score:</span>
                            <span className="font-mono font-medium">{roundNumber(data.score)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Percentile:</span>
                            <span className="font-mono font-medium">{roundNumber(data.percentile, 1)}%</span>
                        </div>
                    </div>
                </ChartTooltip>
            );
        }
        return null;
    };
    // Determine bar color based on score (gradient logic or thresholds)
    // For now, let's use a nice green for high scores (deleterious/functional) as per user image
    // Wait, user image shows green bars. Usually red is bad/deleterious.
    // But PHRED scores: Higher = more likely functional/deleterious.
    // Let's stick to a consistent color for now, or map to the user's image colors if possible.
    // User image has Green, Orange, Red bars. It seems to be coloring by score magnitude?
    // Or maybe by category?
    // Let's use a function to determine color.
    const getBarColor = (score: number) => {
        if (score >= 20) return "#22c55e"; // Green-500
        if (score >= 10) return "#eab308"; // Yellow-500
        return "#f97316"; // Orange-500
        // Actually user image has Green for high scores, Orange for low.
        // Let's replicate that.
    };

    const VisualizationView = (
        <div className="space-y-8">
            <div>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="shortName"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                className="text-xs"
                                interval={0}
                            />
                            <YAxis
                                label={{
                                    value: "PHRED Integrative Score",
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { textAnchor: "middle" },
                                    offset: 0,
                                }}
                                className="text-xs"
                            />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    return (
        <DataViewLayout
            title="PHRED Integrative Scores"
            subtitle="Integrative scores combining multiple functional predictions (PHRED scaled)"
            tableView={
                <IntegrativeTable
                    enrichedData={enrichedData}
                    category={category}
                    subcategory={subcategory}
                />
            }
            visualizationView={VisualizationView}
            defaultTab="table" // Default to table as per user preference
        />
    );
}
