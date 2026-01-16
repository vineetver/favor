"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Table, BarChart3 } from "lucide-react";
import {
  DataTable,
  DataTableProgress,
  DataTableHeader,
} from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  type Variant,
  type GnomadPopulation,
  getGnomadMetrics,
} from "@/features/variant/types";
import { ChartTooltip, type TooltipPayloadEntry } from "@/components/common/chart-tooltip";

// ============================================================================
// Types
// ============================================================================

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

type DataView = "overall" | "male" | "female" | "compare";

interface AlleleFrequencyVisualizationProps {
  variant: Variant;
}

// ============================================================================
// Custom Cell Components
// ============================================================================

function FrequencyCell({ value, color = "blue" }: { value: number | null; color?: "blue" | "pink" }) {
  if (value === null) {
    return <span className="text-slate-400">—</span>;
  }

  const colorClass = color === "pink" ? "text-pink-600" : "text-blue-600";

  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-[15px] tabular-nums ${colorClass}`}>
        {value.toExponential(2)}
      </span>
      <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color === "pink" ? "bg-pink-500" : "bg-blue-500"}`}
          style={{ width: `${Math.min(value * 1000000, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AlleleFrequencyVisualization({
  variant,
}: AlleleFrequencyVisualizationProps) {
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [dataView, setDataView] = useState<DataView>("overall");

  // Prepare population data
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

  // Dynamic columns based on view
  const columns = useMemo((): ColumnDef<PopulationData>[] => {
    const baseColumn: ColumnDef<PopulationData> = {
      accessorKey: "name",
      header: "Population",
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900">{row.original.name}</span>
      ),
    };

    if (dataView === "compare") {
      return [
        baseColumn,
        {
          accessorKey: "maleExome",
          header: () => (
            <DataTableHeader tooltip="Male allele frequency in gnomAD v4.1 Exome">
              Male Exome
            </DataTableHeader>
          ),
          cell: ({ row }) => <FrequencyCell value={row.original.maleExome} color="blue" />,
        },
        {
          accessorKey: "femaleExome",
          header: () => (
            <DataTableHeader tooltip="Female allele frequency in gnomAD v4.1 Exome">
              Female Exome
            </DataTableHeader>
          ),
          cell: ({ row }) => <FrequencyCell value={row.original.femaleExome} color="pink" />,
        },
        {
          accessorKey: "maleGenome",
          header: () => (
            <DataTableHeader tooltip="Male allele frequency in gnomAD v4.1 Genome">
              Male Genome
            </DataTableHeader>
          ),
          cell: ({ row }) => <FrequencyCell value={row.original.maleGenome} color="blue" />,
        },
        {
          accessorKey: "femaleGenome",
          header: () => (
            <DataTableHeader tooltip="Female allele frequency in gnomAD v4.1 Genome">
              Female Genome
            </DataTableHeader>
          ),
          cell: ({ row }) => <FrequencyCell value={row.original.femaleGenome} color="pink" />,
        },
      ];
    }

    const viewConfig = {
      overall: { exome: "totalExome" as const, genome: "totalGenome" as const, label: "Overall" },
      male: { exome: "maleExome" as const, genome: "maleGenome" as const, label: "Male" },
      female: { exome: "femaleExome" as const, genome: "femaleGenome" as const, label: "Female" },
    }[dataView] ?? { exome: "totalExome" as const, genome: "totalGenome" as const, label: "Overall" };

    return [
      baseColumn,
      {
        accessorKey: viewConfig.exome,
        header: () => (
          <DataTableHeader tooltip={`${viewConfig.label} allele frequency in gnomAD v4.1 Exome`}>
            Exome ({viewConfig.label})
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <DataTableProgress
            value={row.original[viewConfig.exome]}
            max={0.5}
            format="scientific"
            color="blue"
          />
        ),
      },
      {
        accessorKey: viewConfig.genome,
        header: () => (
          <DataTableHeader tooltip={`${viewConfig.label} allele frequency in gnomAD v4.1 Genome`}>
            Genome ({viewConfig.label})
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <DataTableProgress
            value={row.original[viewConfig.genome]}
            max={0.5}
            format="scientific"
            color="purple"
          />
        ),
      },
    ];
  }, [dataView]);

  // Chart data
  const chartData = useMemo(() => {
    if (dataView === "compare") {
      return populationData
        .map((pop) => ({
          name: pop.name,
          Male: ((pop.maleExome ?? 0) + (pop.maleGenome ?? 0)) / 2,
          Female: ((pop.femaleExome ?? 0) + (pop.femaleGenome ?? 0)) / 2,
        }))
        .sort((a, b) => Math.max(b.Male, b.Female) - Math.max(a.Male, a.Female));
    }

    const viewConfig = {
      overall: { exome: "totalExome" as const, genome: "totalGenome" as const },
      male: { exome: "maleExome" as const, genome: "maleGenome" as const },
      female: { exome: "femaleExome" as const, genome: "femaleGenome" as const },
    }[dataView] ?? { exome: "totalExome" as const, genome: "totalGenome" as const };

    return populationData
      .map((pop) => ({
        name: pop.name,
        Exome: pop[viewConfig.exome],
        Genome: pop[viewConfig.genome],
      }))
      .sort((a, b) =>
        Math.max((b.Exome ?? 0), (b.Genome ?? 0)) - Math.max((a.Exome ?? 0), (a.Genome ?? 0))
      );
  }, [populationData, dataView]);

  // Data view filter panel
  const filterPanel = (
    <div className="flex items-center gap-3">
      <span className="text-base font-medium text-slate-500">View:</span>
      <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
        {(["overall", "male", "female", "compare"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setDataView(view)}
            className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
              dataView === view
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  // Tabs configuration
  const tabs = [
    { id: "table", label: "Frequency Table", icon: Table },
    { id: "chart", label: "Visualization", icon: BarChart3 },
  ];

  if (activeTab === "chart") {
    return (
      <Card>
        <CardContent className="!p-0">
          {/* Header with tabs */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as "table" | "chart")}
                      className={`flex items-center gap-2 px-4 py-2 text-base font-semibold rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {filterPanel}
            </div>
          </div>

          {/* Chart */}
          <div className="p-6">
            <AlleleFrequencyChart data={chartData} isCompare={dataView === "compare"} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={populationData}
      searchPlaceholder="Search populations..."
      searchColumn="name"
      exportFilename={`allele-frequencies-${variant.variant_vcf || "variant"}`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as "table" | "chart")}
      filterPanel={filterPanel}
      showFilters={true}
      defaultPageSize={20}
      emptyMessage="No population data available"
    />
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
        <div key={index} className="flex items-center gap-2 text-[15px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono font-medium text-white">
            {typeof entry.value === "number" ? entry.value.toExponential(2) : "—"}
          </span>
        </div>
      ))}
    </ChartTooltip>
  );
};

function AlleleFrequencyChart({
  data,
  isCompare,
}: {
  data: Record<string, unknown>[];
  isCompare: boolean;
}) {
  const chartHeight = Math.max(400, data.length * 55);

  if (isCompare) {
    return (
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span className="text-slate-400">Average Allele Frequency:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }} />
            <span className="text-slate-600">Male</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ec4899" }} />
            <span className="text-slate-600">Female</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              domain={[0, "auto"]}
              tickFormatter={(value) => value.toExponential(1)}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={220}
              tick={{ fontSize: 12, fill: "#334155" }}
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="Male" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} name="Male" />
            <Bar dataKey="Female" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={18} name="Female" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[13px]">
        <span className="text-slate-400">Allele Frequencies:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }} />
          <span className="text-slate-600">gnomAD v4.1 Exome</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#7c3aed" }} />
          <span className="text-slate-600">gnomAD v4.1 Genome</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={(value) => value.toExponential(1)}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={220}
            tick={{ fontSize: 12, fill: "#334155" }}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="Exome" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
          <Bar dataKey="Genome" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
