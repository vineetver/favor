"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Download, Search, Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Variant } from "@/features/variant/types/types";
import {
  getGnomadMetrics,
  type GnomadPopulation,
} from "@/features/variant/config/hg38/columns/allele-frequency";
import { ChartTooltip } from "@/components/common/chart-tooltip";

interface PopulationData {
  id: string;
  name: string;
  shortName: string;
  totalExome: number | null;
  totalGenome: number | null;
  maleExome: number | null;
  maleGenome: number | null;
  femaleExome: number | null;
  femaleGenome: number | null;
}

type SortField = "name" | "exome" | "genome" | "maleExome" | "maleGenome" | "femaleExome" | "femaleGenome";
type SortDirection = "asc" | "desc" | null;
type DataView = "overall" | "male" | "female" | "compare";

interface AlleleFrequencyVisualizationProps {
  variant: Variant;
}

export function AlleleFrequencyVisualization({
  variant,
}: AlleleFrequencyVisualizationProps) {
  const [activeTab, setActiveTab] = useState<"table" | "visualization">("table");
  const [dataView, setDataView] = useState<DataView>("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Prepare population data with all frequencies
  const populationData: PopulationData[] = useMemo(() => {
    const populations: Array<{
      id: string;
      name: string;
      shortName: string;
      prefix: GnomadPopulation;
    }> = [
        { id: "all", name: "ALL (Overall Population)", shortName: "ALL", prefix: "" },
        { id: "afr", name: "AFR (African/African American)", shortName: "AFR", prefix: "afr" },
        { id: "ami", name: "AMI (Amish)", shortName: "AMI", prefix: "ami" },
        { id: "amr", name: "AMR (Admixed American)", shortName: "AMR", prefix: "amr" },
        { id: "asj", name: "ASJ (Ashkenazi Jewish)", shortName: "ASJ", prefix: "asj" },
        { id: "eas", name: "EAS (East Asian)", shortName: "EAS", prefix: "eas" },
        { id: "fin", name: "FIN (Finnish)", shortName: "FIN", prefix: "fin" },
        { id: "nfe", name: "NFE (Non-Finnish European)", shortName: "NFE", prefix: "nfe" },
        { id: "oth", name: "OTH (Other Populations)", shortName: "OTH", prefix: "remaining" },
        { id: "sas", name: "SAS (South Asian)", shortName: "SAS", prefix: "sas" },
      ];

    return populations.map((pop) => {
      // Total (Overall)
      const totalExomeMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "");
      const totalGenomeMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "");

      // Male (XY)
      const maleExomeMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xy");
      const maleGenomeMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xy");

      // Female (XX)
      const femaleExomeMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xx");
      const femaleGenomeMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xx");

      return {
        id: pop.id,
        name: pop.name,
        shortName: pop.shortName,
        totalExome: totalExomeMetrics?.af ?? null,
        totalGenome: totalGenomeMetrics?.af ?? null,
        maleExome: maleExomeMetrics?.af ?? null,
        maleGenome: maleGenomeMetrics?.af ?? null,
        femaleExome: femaleExomeMetrics?.af ?? null,
        femaleGenome: femaleGenomeMetrics?.af ?? null,
      };
    });
  }, [variant]);

  // Helper to get current view data keys
  const getViewKeys = (view: DataView) => {
    switch (view) {
      case "male":
        return { exome: "maleExome", genome: "maleGenome", label: "Male" } as const;
      case "female":
        return { exome: "femaleExome", genome: "femaleGenome", label: "Female" } as const;
      case "compare":
        return { label: "Compare" } as const;
      case "overall":
      default:
        return { exome: "totalExome", genome: "totalGenome", label: "Overall" } as const;
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let data = populationData;

    // Filter by search
    if (searchQuery) {
      data = data.filter((pop) =>
        pop.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortField && sortDirection) {
      const keys = getViewKeys(dataView);

      data = [...data].sort((a, b) => {
        let aVal: string | number | null;
        let bVal: string | number | null;

        if (sortField === "name") {
          aVal = a.name;
          bVal = b.name;
        } else if (dataView === "compare") {
          // In compare view, sortField matches the property name directly
          aVal = a[sortField as keyof PopulationData] as number | null;
          bVal = b[sortField as keyof PopulationData] as number | null;
        } else {
          // Map generic 'exome'/'genome' sort field to specific data key based on view
          // This cast is safe because we handled 'compare' above, so keys has exome/genome
          const specificKeys = keys as { exome: keyof PopulationData; genome: keyof PopulationData };
          const key = sortField === "exome" ? specificKeys.exome : specificKeys.genome;
          aVal = a[key] as number | null;
          bVal = b[key] as number | null;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (sortField === "name") {
          return sortDirection === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        }

        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return data;
  }, [populationData, searchQuery, sortField, sortDirection, dataView]);

  // Handle sort
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

  // Export CSV - Exports ALL data regardless of view
  const exportToCSV = () => {
    const csvContent = [
      [
        "Population",
        "Total Exome", "Total Genome",
        "Male Exome", "Male Genome",
        "Female Exome", "Female Genome"
      ],
      ...populationData.map((row) => [
        row.name,
        row.totalExome !== null ? row.totalExome.toString() : "—",
        row.totalGenome !== null ? row.totalGenome.toString() : "—",
        row.maleExome !== null ? row.maleExome.toString() : "—",
        row.maleGenome !== null ? row.maleGenome.toString() : "—",
        row.femaleExome !== null ? row.femaleExome.toString() : "—",
        row.femaleGenome !== null ? row.femaleGenome.toString() : "—",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allele-frequencies-${variant.variant_vcf || "variant"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data based on view
  const chartData = filteredAndSortedData.map((pop) => {
    if (dataView === "compare") {
      return {
        name: pop.shortName,
        "Male Exome": pop.maleExome,
        "Female Exome": pop.femaleExome,
        "Male Genome": pop.maleGenome,
        "Female Genome": pop.femaleGenome,
      };
    }

    const keys = getViewKeys(dataView) as { exome: keyof PopulationData; genome: keyof PopulationData };
    return {
      name: pop.shortName,
      "Exome": pop[keys.exome],
      "Genome": pop[keys.genome],
    };
  });

  const viewKeys = getViewKeys(dataView);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Allele Frequencies</CardTitle>
            <p className="text-sm text-muted-foreground">
              gnomAD v4.1 allele frequencies by population
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 border-b pb-0">
          {/* View Tabs (Table vs Viz) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("table")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === "table"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              Table View
            </button>
            <button
              onClick={() => setActiveTab("visualization")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === "visualization"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              Visualization
            </button>
          </div>

          {/* Data View Selector (Overall/Male/Female/Compare) */}
          <div className="flex items-center bg-muted/50 p-1 rounded-lg mb-2 sm:mb-0">
            {(["overall", "male", "female", "compare"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setDataView(view)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dataView === view
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search populations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {activeTab === "table" ? (
          <AlleleFrequencyTable
            data={filteredAndSortedData}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            viewKeys={viewKeys}
            isCompare={dataView === "compare"}
          />
        ) : (
          <AlleleFrequencyChart
            data={chartData}
            viewLabel={viewKeys.label}
            isCompare={dataView === "compare"}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Table Component with Sorting
interface TableProps {
  data: PopulationData[];
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  viewKeys: { exome?: keyof PopulationData; genome?: keyof PopulationData; label: string };
  isCompare: boolean;
}

function AlleleFrequencyTable({ data, sortField, sortDirection, onSort, viewKeys, isCompare }: TableProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left w-1/3">
                <button
                  onClick={() => onSort("name")}
                  className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                >
                  Population
                  <SortIcon field="name" />
                </button>
              </th>

              {isCompare ? (
                <>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => onSort("maleExome")} className="flex items-center text-sm font-semibold hover:text-foreground">
                      Male Exome <SortIcon field="maleExome" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => onSort("femaleExome")} className="flex items-center text-sm font-semibold hover:text-foreground">
                      Female Exome <SortIcon field="femaleExome" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => onSort("maleGenome")} className="flex items-center text-sm font-semibold hover:text-foreground">
                      Male Genome <SortIcon field="maleGenome" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => onSort("femaleGenome")} className="flex items-center text-sm font-semibold hover:text-foreground">
                      Female Genome <SortIcon field="femaleGenome" />
                    </button>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-left">
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onSort("exome")}
                          className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                        >
                          gnomAD v4.1 Exome ({viewKeys.label})
                          <SortIcon field="exome" />
                        </button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{viewKeys.label} allele frequency in gnomAD v4.1 Exome</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onSort("genome")}
                          className="flex items-center text-sm font-semibold hover:text-foreground transition-colors"
                        >
                          gnomAD v4.1 Genome ({viewKeys.label})
                          <SortIcon field="genome" />
                        </button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{viewKeys.label} allele frequency in gnomAD v4.1 Genome</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => {
              if (isCompare) {
                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-mono">{row.maleExome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-pink-600 font-mono">{row.femaleExome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-blue-800 font-mono">{row.maleGenome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-pink-800 font-mono">{row.femaleGenome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                );
              }

              const exomeVal = row[viewKeys.exome!] as number | null;
              const genomeVal = row[viewKeys.genome!] as number | null;

              return (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {exomeVal !== null ? (
                      <span className="text-blue-600 font-mono">
                        {exomeVal.toFixed(6)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {genomeVal !== null ? (
                      <span className="text-blue-600 font-mono">
                        {genomeVal.toFixed(6)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Custom Tooltip Component using reusable ChartTooltip
const CustomTooltip = (props: any) => {
  const { payload } = props;
  return (
    <ChartTooltip {...props}>
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium">
            {entry.value !== null ? entry.value.toFixed(6) : "—"}
          </span>
        </div>
      ))}
    </ChartTooltip>
  );
};

// Chart Component with Recharts
function AlleleFrequencyChart({ data, viewLabel, isCompare }: { data: any[]; viewLabel: string; isCompare: boolean }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-4">{viewLabel} Allele Frequencies</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
              interval={0}
            />
            <YAxis
              label={{
                value: "Allele Frequency",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
                offset: 0
              }}
              className="text-xs"
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Legend verticalAlign="top" height={36} />
            {isCompare ? (
              <>
                <Bar dataKey="Male Exome" fill="#3b82f6" name="Male Exome" />
                <Bar dataKey="Female Exome" fill="#ec4899" name="Female Exome" />
                <Bar dataKey="Male Genome" fill="#1e40af" name="Male Genome" />
                <Bar dataKey="Female Genome" fill="#be185d" name="Female Genome" />
              </>
            ) : (
              <>
                <Bar dataKey="Exome" fill="#3b82f6" name={`gnomAD v4.1 Exome (${viewLabel})`} />
                <Bar dataKey="Genome" fill="#1e40af" name={`gnomAD v4.1 Genome (${viewLabel})`} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
