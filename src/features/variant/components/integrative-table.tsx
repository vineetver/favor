"use client";

import { useState, useMemo } from "react";
import { Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { NoDataState } from "@/components/ui/error-states";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EnrichedGroup } from "@/lib/data-display/enricher";
import { roundNumber } from "@/lib/data-display/helpers";

interface IntegrativeTableProps {
    enrichedData: EnrichedGroup[];
    category: string;
    subcategory: string;
}

type SortField = "annotation" | "score" | "percentile";
type SortDirection = "asc" | "desc" | null;

export function IntegrativeTable({
    enrichedData,
    category,
    subcategory,
}: IntegrativeTableProps) {
    const [sortField, setSortField] = useState<SortField | null>("score");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    // The subcategory from the route corresponds to the group slug
    const targetGroup = enrichedData.find((group) => group.slug === subcategory);

    // Prepare data with calculated fields for sorting
    const tableData = useMemo(() => {
        if (!targetGroup || !targetGroup.cells) return [];

        return targetGroup.cells.map((cell) => {
            const score = typeof cell.value === "string" ? parseFloat(cell.value) : Number(cell.value);
            const percentile = !isNaN(score) ? Math.pow(10, -score / 10) * 100 : null;

            return {
                ...cell,
                score,
                percentile,
            };
        });
    }, [targetGroup]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortField || !sortDirection) return tableData;

        return [...tableData].sort((a, b) => {
            let aVal: string | number | null = null;
            let bVal: string | number | null = null;

            switch (sortField) {
                case "annotation":
                    aVal = a.header;
                    bVal = b.header;
                    break;
                case "score":
                    aVal = a.score;
                    bVal = b.score;
                    break;
                case "percentile":
                    aVal = a.percentile;
                    bVal = b.percentile;
                    break;
            }

            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;

            if (sortField === "annotation") {
                return sortDirection === "asc"
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            }

            return sortDirection === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
    }, [tableData, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                setSortField(null);
                setSortDirection(null);
            } else {
                setSortDirection("asc");
            }
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
        }
        if (sortDirection === "asc") {
            return <ArrowUp className="h-3 w-3 ml-1" />;
        }
        return <ArrowDown className="h-3 w-3 ml-1" />;
    };

    if (!targetGroup || !targetGroup.cells || targetGroup.cells.length === 0) {
        return <NoDataState categoryName="Integrative Data" />;
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left w-1/3">
                                <button
                                    onClick={() => handleSort("annotation")}
                                    className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                                >
                                    Annotation
                                    <SortIcon field="annotation" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleSort("score")}
                                        className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                                    >
                                        Integrative Score
                                        <SortIcon field="score" />
                                    </button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs normal-case font-normal">
                                                <p>Combined functional impact score integrating multiple prediction algorithms and conservation metrics. PHRED scale: higher scores indicate greater functional impact. A score of 10 indicates the variant is in the top 10% most deleterious, 20 = top 1%, 30 = top 0.1%.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleSort("percentile")}
                                        className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                                    >
                                        Percentile
                                        <SortIcon field="percentile" />
                                    </button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs normal-case font-normal">
                                                <p>Genome-wide percentile rank of the variant. Score transformed to percentile scale using formula: 10^(score * -0.1) * 100. Lower percentiles indicate greater functional impact or statistical significance.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedData.map((cell, index) => (
                            <tr key={`${cell.key}-${index}`} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        {cell.header}
                                        {cell.description && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-md">
                                                        <div>{cell.description}</div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="font-mono text-foreground">
                                        {cell.value}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="font-mono text-muted-foreground">
                                        {cell.percentile !== null ? `${roundNumber(cell.percentile, 1)}%` : "-"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
