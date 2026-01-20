"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/charts";
import { DataSurface } from "@/components/ui/data-surface";
import {
  type GnomadPopulation,
  type GnomadSex,
  getGnomadMetrics,
  type Variant,
} from "@/features/variant/types";

// ============================================================================
// Types
// ============================================================================

interface PopulationRow {
  id: string;
  population: string;
  code: string;
  alleleCount: number | null;
  alleleNumber: number | null;
  homozygotes: number | null;
  frequency: number | null;
}

type DataSource = "genome" | "exome";
type SexFilter = "overall" | "male" | "female";

interface AlleleFrequencyDataTableProps {
  variant: Variant;
}

// ============================================================================
// Population Configuration
// ============================================================================

const POPULATIONS: Array<{
  id: string;
  name: string;
  code: string;
  prefix: GnomadPopulation;
}> = [
  { id: "all", name: "Global", code: "ALL", prefix: "" },
  { id: "afr", name: "African/African American", code: "AFR", prefix: "afr" },
  { id: "amr", name: "Admixed American", code: "AMR", prefix: "amr" },
  { id: "asj", name: "Ashkenazi Jewish", code: "ASJ", prefix: "asj" },
  { id: "eas", name: "East Asian", code: "EAS", prefix: "eas" },
  { id: "fin", name: "Finnish", code: "FIN", prefix: "fin" },
  { id: "nfe", name: "Non-Finnish European", code: "NFE", prefix: "nfe" },
  { id: "sas", name: "South Asian", code: "SAS", prefix: "sas" },
  { id: "ami", name: "Amish", code: "AMI", prefix: "ami" },
  { id: "mid", name: "Middle Eastern", code: "MID", prefix: "mid" },
  { id: "oth", name: "Other", code: "OTH", prefix: "remaining" },
];

// ============================================================================
// Cell Renderers
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

function FrequencyCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono font-medium tabular-nums text-slate-900">
        {value.toFixed(6)}
      </span>
      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(value * 100 * 3, 100)}%` }}
        />
      </div>
    </div>
  );
}

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
// Chart Component
// ============================================================================

function PopulationChart({ data }: { data: PopulationRow[] }) {
  const chartData = [...data]
    .filter((d) => d.frequency !== null)
    .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
    .map((d) => ({
      id: d.id,
      label: d.code,
      value: d.frequency,
    }));

  return (
    <BarChart
      data={chartData}
      layout="horizontal"
      colorScheme={{ type: "single", color: "oklch(0.51 0.21 286.5)" }}
      valueFormatter={(v) => v.toFixed(6)}
      barSize={24}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AlleleFrequencyDataTable({
  variant,
}: AlleleFrequencyDataTableProps) {
  const hasGenome = Boolean(variant.gnomad_genome);
  const hasExome = Boolean(variant.gnomad_exome);
  const [dataSource, setDataSource] = useState<DataSource>(() =>
    hasGenome ? "genome" : "exome",
  );
  const [sexFilter, setSexFilter] = useState<SexFilter>("overall");

  useEffect(() => {
    if (dataSource === "genome" && !hasGenome && hasExome) {
      setDataSource("exome");
    }
    if (dataSource === "exome" && !hasExome && hasGenome) {
      setDataSource("genome");
    }
  }, [dataSource, hasGenome, hasExome]);

  // Transform gnomAD data to rows based on current filters
  const populationData = useMemo((): PopulationRow[] => {
    const gnomadData =
      dataSource === "genome" ? variant.gnomad_genome : variant.gnomad_exome;

    const sexSuffix: GnomadSex =
      sexFilter === "male" ? "xy" : sexFilter === "female" ? "xx" : "";

    return POPULATIONS.map((pop) => {
      const metrics = getGnomadMetrics(gnomadData, pop.prefix, sexSuffix);

      return {
        id: pop.id,
        population: pop.name,
        code: pop.code,
        alleleCount: metrics?.ac ?? null,
        alleleNumber: metrics?.an ?? null,
        homozygotes: metrics?.hom ?? null,
        frequency: metrics?.af ?? null,
      };
    });
  }, [variant, dataSource, sexFilter]);

  // Column definitions
  const columns = useMemo(
    (): ColumnDef<PopulationRow>[] => [
      {
        id: "population",
        accessorKey: "population",
        header: "Population",
        enableSorting: true,
        cell: ({ row }) => (
          <PopulationBadge
            code={row.original.code}
            name={row.original.population}
          />
        ),
      },
      {
        id: "alleleCount",
        accessorKey: "alleleCount",
        header: "Allele Count",
        enableSorting: true,
        meta: { description: "Number of alternate alleles observed" },
        cell: ({ row }) => <NumberCell value={row.original.alleleCount} />,
      },
      {
        id: "alleleNumber",
        accessorKey: "alleleNumber",
        header: "Allele Number",
        enableSorting: true,
        meta: { description: "Total number of alleles analyzed" },
        cell: ({ row }) => <NumberCell value={row.original.alleleNumber} />,
      },
      {
        id: "homozygotes",
        accessorKey: "homozygotes",
        header: "Homozygotes",
        enableSorting: true,
        meta: { description: "Number of homozygous individuals" },
        cell: ({ row }) => <NumberCell value={row.original.homozygotes} />,
      },
      {
        id: "frequency",
        accessorKey: "frequency",
        header: "Frequency",
        enableSorting: true,
        meta: { description: "Allele frequency (AC/AN)" },
        cell: ({ row }) => <FrequencyCell value={row.original.frequency} />,
      },
    ],
    [],
  );

  return (
    <DataSurface
      columns={columns}
      data={populationData}
      icon={Users}
      title="Population Genetics"
      subtitle="gnomAD v4.1"
      searchPlaceholder="Search populations..."
      searchColumn="population"
      exportable
      exportFilename={`allele-frequencies-${variant.variant_vcf || "variant"}`}
      dimensions={[
        {
          label: "Dataset",
          options: [
            { value: "genome", label: "Genomes" },
            { value: "exome", label: "Exomes" },
          ],
          value: dataSource,
          onChange: (v) => setDataSource(v as DataSource),
        },
        {
          label: "Sex",
          options: [
            { value: "overall", label: "Overall" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ],
          value: sexFilter,
          onChange: (v) => setSexFilter(v as SexFilter),
        },
      ]}
      showViewSwitch
      visualization={PopulationChart}
      defaultPageSize={20}
      emptyMessage="No population data available"
    />
  );
}
