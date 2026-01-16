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
import { Table, BarChart3, Users } from "lucide-react";
import {
  DataTable,
  DataTableProgress,
  DataTableHeader,
  DataTableTabs,
  DataTableSubTabs,
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
  // For extended view
  alleleCountExome: number | null;
  alleleNumberExome: number | null;
  homozygotesExome: number | null;
  alleleCountGenome: number | null;
  alleleNumberGenome: number | null;
  homozygotesGenome: number | null;
}

type DataView = "overall" | "male" | "female";
type DataSource = "exome" | "genome";

interface AlleleFrequencyVisualizationProps {
  variant: Variant;
}

// ============================================================================
// Population Badge Component
// ============================================================================

function PopulationBadge({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600 border border-slate-200">
        {code}
      </span>
      <span className="text-sm text-slate-700">{name}</span>
    </div>
  );
}

// ============================================================================
// Frequency Cell with Progress Bar
// ============================================================================

function FrequencyCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono font-medium tabular-nums text-slate-900">
        {value.toFixed(6)}
      </span>
      <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Number Cell with Formatting
// ============================================================================

function NumberCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <span className="text-sm font-mono tabular-nums text-slate-600">
      {value.toLocaleString()}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AlleleFrequencyVisualization({
  variant,
}: AlleleFrequencyVisualizationProps) {
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [dataSource, setDataSource] = useState<DataSource>("genome");
  const [dataView, setDataView] = useState<DataView>("overall");

  // Prepare population data
  const populationData: PopulationData[] = useMemo(() => {
    const populations: Array<{
      id: string;
      name: string;
      shortName: string;
      prefix: GnomadPopulation;
    }> = [
      { id: "all", name: "Global", shortName: "ALL", prefix: "" },
      { id: "afr", name: "African/African American", shortName: "AFR", prefix: "afr" },
      { id: "amr", name: "Admixed American", shortName: "AMR", prefix: "amr" },
      { id: "asj", name: "Ashkenazi Jewish", shortName: "ASJ", prefix: "asj" },
      { id: "eas", name: "East Asian", shortName: "EAS", prefix: "eas" },
      { id: "fin", name: "Finnish", shortName: "FIN", prefix: "fin" },
      { id: "nfe", name: "Non-Finnish European", shortName: "NFE", prefix: "nfe" },
      { id: "sas", name: "South Asian", shortName: "SAS", prefix: "sas" },
      { id: "oth", name: "Other", shortName: "OTH", prefix: "remaining" },
    ];

    return populations.map((pop) => {
      const exomeMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "");
      const genomeMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "");
      const exomeMaleMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xy");
      const genomeMaleMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xy");
      const exomeFemaleMetrics = getGnomadMetrics(variant.gnomad_exome, pop.prefix, "xx");
      const genomeFemaleMetrics = getGnomadMetrics(variant.gnomad_genome, pop.prefix, "xx");

      return {
        id: pop.id,
        name: pop.name,
        shortName: pop.shortName,
        totalExome: exomeMetrics?.af ?? null,
        totalGenome: genomeMetrics?.af ?? null,
        maleExome: exomeMaleMetrics?.af ?? null,
        maleGenome: genomeMaleMetrics?.af ?? null,
        femaleExome: exomeFemaleMetrics?.af ?? null,
        femaleGenome: genomeFemaleMetrics?.af ?? null,
        alleleCountExome: exomeMetrics?.ac ?? null,
        alleleNumberExome: exomeMetrics?.an ?? null,
        homozygotesExome: exomeMetrics?.hom ?? null,
        alleleCountGenome: genomeMetrics?.ac ?? null,
        alleleNumberGenome: genomeMetrics?.an ?? null,
        homozygotesGenome: genomeMetrics?.hom ?? null,
      };
    });
  }, [variant]);

  // Dynamic columns based on source and view
  const columns = useMemo((): ColumnDef<PopulationData>[] => {
    const sourceSuffix = dataSource === "exome" ? "Exome" : "Genome";

    // Get AF field based on source and view
    const getAfField = (): keyof PopulationData => {
      if (dataView === "overall") {
        return dataSource === "exome" ? "totalExome" : "totalGenome";
      }
      return `${dataView}${sourceSuffix}` as keyof PopulationData;
    };

    const acField = `alleleCount${sourceSuffix}` as keyof PopulationData;
    const anField = `alleleNumber${sourceSuffix}` as keyof PopulationData;
    const homField = `homozygotes${sourceSuffix}` as keyof PopulationData;
    const afField = getAfField();

    return [
      {
        id: "population",
        accessorKey: "name",
        header: "Population",
        cell: ({ row }) => (
          <PopulationBadge code={row.original.shortName} name={row.original.name} />
        ),
      },
      {
        id: "alleleCount",
        accessorFn: (row) => row[acField],
        header: () => (
          <DataTableHeader tooltip="Number of alternate alleles observed">
            Allele Count
          </DataTableHeader>
        ),
        cell: ({ row }) => <NumberCell value={row.original[acField] as number | null} />,
      },
      {
        id: "alleleNumber",
        accessorFn: (row) => row[anField],
        header: () => (
          <DataTableHeader tooltip="Total number of alleles analyzed">
            Allele Number
          </DataTableHeader>
        ),
        cell: ({ row }) => <NumberCell value={row.original[anField] as number | null} />,
      },
      {
        id: "homozygotes",
        accessorFn: (row) => row[homField],
        header: () => (
          <DataTableHeader tooltip="Number of homozygous individuals">
            Homozygotes
          </DataTableHeader>
        ),
        cell: ({ row }) => <NumberCell value={row.original[homField] as number | null} />,
      },
      {
        id: "frequency",
        accessorFn: (row) => row[afField],
        header: () => (
          <DataTableHeader tooltip="Allele frequency (AC/AN)">
            Frequency
          </DataTableHeader>
        ),
        cell: ({ row }) => <FrequencyCell value={row.original[afField] as number | null} />,
      },
    ];
  }, [dataSource, dataView]);

  // Source tabs (Genomes/Exomes)
  const sourceTabs = [
    { id: "genome", label: "Genomes" },
    { id: "exome", label: "Exomes" },
  ];

  // View tabs (Overall/Male/Female)
  const viewOptions = [
    { value: "overall", label: "Overall" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ];

  // Main tabs (Table/Chart)
  const mainTabs = [
    { id: "table", label: "Frequency Table", icon: Table },
    { id: "chart", label: "Visualization", icon: BarChart3 },
  ];

  // Filter panel with source tabs + view tabs
  const filterPanel = (
    <div className="flex items-center gap-4">
      {/* Source tabs (filled style) */}
      <DataTableTabs
        tabs={sourceTabs}
        activeTab={dataSource}
        onTabChange={(id) => setDataSource(id as DataSource)}
        variant="filled"
      />

      {/* View tabs (plain style) */}
      <DataTableSubTabs
        options={viewOptions}
        value={dataView}
        onChange={(v) => setDataView(v as DataView)}
      />
    </div>
  );

  // Chart data
  const chartData = useMemo(() => {
    const afField = dataView === "overall"
      ? (dataSource === "exome" ? "totalExome" : "totalGenome")
      : `${dataView}${dataSource === "exome" ? "Exome" : "Genome"}` as keyof PopulationData;

    return populationData
      .map((pop) => ({
        name: pop.shortName,
        fullName: pop.name,
        value: pop[afField] as number | null,
      }))
      .filter((d) => d.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [populationData, dataSource, dataView]);

  // Export handler
  const handleExport = () => {
    const headers = ["Population", "Code", "Allele Count", "Allele Number", "Homozygotes", "Frequency"];
    const rows = populationData.map((pop) => {
      const acField = dataSource === "exome" ? "alleleCountExome" : "alleleCountGenome";
      const anField = dataSource === "exome" ? "alleleNumberExome" : "alleleNumberGenome";
      const homField = dataSource === "exome" ? "homozygotesExome" : "homozygotesGenome";
      const afField = dataSource === "exome" ? "totalExome" : "totalGenome";

      return [
        pop.name,
        pop.shortName,
        pop[acField] ?? "",
        pop[anField] ?? "",
        pop[homField] ?? "",
        pop[afField] ?? "",
      ].map(v => `"${v}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allele-frequencies-${variant.variant_vcf || "variant"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === "chart") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="!p-0">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-white flex flex-col gap-5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-semibold text-slate-900">Population Genetics</h3>
                  <span className="text-sm text-slate-500">gnomAD v4.1</span>
                </div>
              </div>
              <DataTableTabs
                tabs={mainTabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as "table" | "chart")}
              />
            </div>

            {/* Filter row */}
            <div className="flex items-center justify-end gap-4">
              {filterPanel}
            </div>
          </div>

          {/* Chart */}
          <div className="p-6">
            <AlleleFrequencyChart data={chartData} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={populationData}
      icon={Users}
      title="Population Genetics"
      subtitle="gnomAD v4.1"
      searchPlaceholder="Search ancestry..."
      searchColumn="name"
      exportable={true}
      exportFilename={`allele-frequencies-${variant.variant_vcf || "variant"}`}
      tabs={mainTabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as "table" | "chart")}
      filterPanel={filterPanel}
      defaultPageSize={20}
      emptyMessage="No population data available"
    />
  );
}

// ============================================================================
// Chart Component
// ============================================================================

const CustomTooltip = (props: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  const { payload, label } = props;
  const entry = payload?.[0];

  if (!entry) return null;

  return (
    <ChartTooltip {...props}>
      <div className="flex flex-col gap-1">
        <span className="text-white font-medium">{(entry.payload as { fullName?: string })?.fullName || label}</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Frequency:</span>
          <span className="font-mono text-white">
            {typeof entry.value === "number" ? entry.value.toFixed(6) : "—"}
          </span>
        </div>
      </div>
    </ChartTooltip>
  );
};

function AlleleFrequencyChart({
  data,
}: {
  data: { name: string; fullName: string; value: number | null }[];
}) {
  const chartHeight = Math.max(300, data.length * 45);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
        barCategoryGap="25%"
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          domain={[0, "auto"]}
          tickFormatter={(value) => value.toFixed(2)}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={50}
          tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
        />
        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Bar
          dataKey="value"
          fill="oklch(0.51 0.21 286.5)"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
