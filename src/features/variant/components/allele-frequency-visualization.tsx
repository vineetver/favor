"use client";

import { useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Download,
  Search,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
import { ChartTooltip, type TooltipPayloadEntry } from "@/components/common/chart-tooltip";

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

type SortField =
  | "name"
  | "exome"
  | "genome"
  | "maleExome"
  | "maleGenome"
  | "femaleExome"
  | "femaleGenome";
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

    return populations.map((pop) => ({
      id: pop.id,
      name: pop.name,
      shortName: pop.shortName,
      totalExome: getGnomadMetrics(variant.gnomad_exome, pop.prefix, "")?.af ?? null,
      totalGenome: getGnomadMetrics(variant.gnomad_genome, pop.prefix, "")?.af ?? null,
      maleExome: getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xy")?.af ?? null,
      maleGenome: getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xy")?.af ?? null,
      femaleExome: getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xx")?.af ?? null,
      femaleGenome: getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xx")?.af ?? null,
    }));
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

    if (searchQuery) {
      data = data.filter((pop) =>
        pop.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortField && sortDirection) {
      const keys = getViewKeys(dataView);

      data = [...data].sort((a, b) => {
        let aVal: string | number | null;
        let bVal: string | number | null;

        if (sortField === "name") {
          aVal = a.name;
          bVal = b.name;
        } else if (dataView === "compare") {
          aVal = a[sortField as keyof PopulationData] as number | null;
          bVal = b[sortField as keyof PopulationData] as number | null;
        } else {
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

  const exportToCSV = () => {
    const csvContent = [
      ["Population", "Total Exome", "Total Genome", "Male Exome", "Male Genome", "Female Exome", "Female Genome"],
      ...populationData.map((row) => [
        row.name,
        row.totalExome?.toString() ?? "—",
        row.totalGenome?.toString() ?? "—",
        row.maleExome?.toString() ?? "—",
        row.maleGenome?.toString() ?? "—",
        row.femaleExome?.toString() ?? "—",
        row.femaleGenome?.toString() ?? "—",
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

  const chartData = filteredAndSortedData.map((pop) => {
    // Use full name for better readability in horizontal chart
    const displayName = pop.name;

    if (dataView === "compare") {
      return {
        name: displayName,
        "Male Exome": pop.maleExome,
        "Female Exome": pop.femaleExome,
        "Male Genome": pop.maleGenome,
        "Female Genome": pop.femaleGenome,
      };
    }

    const keys = getViewKeys(dataView) as { exome: keyof PopulationData; genome: keyof PopulationData };
    return {
      name: displayName,
      Exome: pop[keys.exome],
      Genome: pop[keys.genome],
    };
  });

  const viewKeys = getViewKeys(dataView);
  const rowCount = filteredAndSortedData.length;

  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("table")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "table"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Frequency Table
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                {rowCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("visualization")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "visualization"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Visualization
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Data View Selector */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg">
              {(["overall", "male", "female", "compare"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setDataView(view)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    dataView === view
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={exportToCSV}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search populations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
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
        <div className="p-6">
          <AlleleFrequencyChart
            data={chartData}
            viewLabel={viewKeys.label}
            isCompare={dataView === "compare"}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Table Component
// ============================================================================

interface TableProps {
  data: PopulationData[];
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  viewKeys: { exome?: keyof PopulationData; genome?: keyof PopulationData; label: string };
  isCompare: boolean;
}

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField | null; sortDirection: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
  if (sortDirection === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  return <ArrowDown className="h-3.5 w-3.5" />;
}

function AlleleFrequencyTable({ data, sortField, sortDirection, onSort, viewKeys, isCompare }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border/40">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">
              <button onClick={() => onSort("name")} className="flex items-center gap-1 hover:text-foreground/80">
                Population
                <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
              </button>
            </th>

            {isCompare ? (
              <>
                <th className="px-6 py-3 text-left font-semibold">
                  <button onClick={() => onSort("maleExome")} className="flex items-center gap-1 hover:text-foreground/80">
                    Male Exome <SortIcon field="maleExome" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <button onClick={() => onSort("femaleExome")} className="flex items-center gap-1 hover:text-foreground/80">
                    Female Exome <SortIcon field="femaleExome" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <button onClick={() => onSort("maleGenome")} className="flex items-center gap-1 hover:text-foreground/80">
                    Male Genome <SortIcon field="maleGenome" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <button onClick={() => onSort("femaleGenome")} className="flex items-center gap-1 hover:text-foreground/80">
                    Female Genome <SortIcon field="femaleGenome" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              </>
            ) : (
              <>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onSort("exome")} className="flex items-center gap-1 hover:text-foreground/80">
                      gnomAD v4.1 Exome ({viewKeys.label})
                      <SortIcon field="exome" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-5 w-5 cursor-help flex-shrink-0 text-white fill-black" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{viewKeys.label} allele frequency in gnomAD v4.1 Exome</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onSort("genome")} className="flex items-center gap-1 hover:text-foreground/80">
                      gnomAD v4.1 Genome ({viewKeys.label})
                      <SortIcon field="genome" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-5 w-5 cursor-help flex-shrink-0 text-white fill-black" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{viewKeys.label} allele frequency in gnomAD v4.1 Genome</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {data.map((row) => {
            if (isCompare) {
              return (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{row.name}</td>
                  <td className="px-6 py-4 text-blue-600 font-mono">
                    {row.maleExome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4 text-pink-600 font-mono">
                    {row.femaleExome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4 text-blue-800 font-mono">
                    {row.maleGenome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4 text-pink-800 font-mono">
                    {row.femaleGenome?.toFixed(6) ?? <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            }

            const exomeVal = row[viewKeys.exome!] as number | null;
            const genomeVal = row[viewKeys.genome!] as number | null;

            return (
              <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium">{row.name}</td>
                <td className="px-6 py-4">
                  {exomeVal !== null ? (
                    <span className="text-blue-600 font-mono">{exomeVal.toFixed(6)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {genomeVal !== null ? (
                    <span className="text-blue-600 font-mono">{genomeVal.toFixed(6)}</span>
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
  );
}

// ============================================================================
// Chart Component
// ============================================================================

const CustomTooltip = (props: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  const { payload } = props;
  return (
    <ChartTooltip {...props}>
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium">
            {typeof entry.value === "number" ? entry.value.toFixed(6) : "—"}
          </span>
        </div>
      ))}
    </ChartTooltip>
  );
};

function AlleleFrequencyChart({
  data,
  viewLabel,
  isCompare,
}: {
  data: Record<string, unknown>[];
  viewLabel: string;
  isCompare: boolean;
}) {
  // Calculate dynamic height based on number of rows - more space for compare mode (4 bars)
  const rowHeight = isCompare ? 80 : 55;
  const chartHeight = Math.max(400, data.length * rowHeight);

  // Sort data by highest value descending for better visualization
  const sortedData = [...data].sort((a, b) => {
    const aMax = Math.max(
      (a["Exome"] as number) || 0,
      (a["Genome"] as number) || 0,
      (a["Male Exome"] as number) || 0,
      (a["Female Exome"] as number) || 0,
      (a["Male Genome"] as number) || 0,
      (a["Female Genome"] as number) || 0
    );
    const bMax = Math.max(
      (b["Exome"] as number) || 0,
      (b["Genome"] as number) || 0,
      (b["Male Exome"] as number) || 0,
      (b["Female Exome"] as number) || 0,
      (b["Male Genome"] as number) || 0,
      (b["Female Genome"] as number) || 0
    );
    return bMax - aMax;
  });

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">{viewLabel} Frequencies:</span>
        {isCompare ? (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#60a5fa" }} />
              <span>Male Exome</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f472b6" }} />
              <span>Female Exome</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#2563eb" }} />
              <span>Male Genome</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#db2777" }} />
              <span>Female Genome</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }} />
              <span>gnomAD v4.1 Exome</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#1e40af" }} />
              <span>gnomAD v4.1 Genome</span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={220}
            tick={{ fontSize: 12 }}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
          {isCompare ? (
            <>
              <Bar dataKey="Male Exome" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="Female Exome" fill="#f472b6" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="Male Genome" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="Female Genome" fill="#db2777" radius={[0, 4, 4, 0]} barSize={12} />
            </>
          ) : (
            <>
              <Bar dataKey="Exome" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
              <Bar dataKey="Genome" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
