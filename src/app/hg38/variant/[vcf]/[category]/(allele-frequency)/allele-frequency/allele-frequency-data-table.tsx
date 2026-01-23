"use client";

import {
  type GnomadPopulation,
  type GnomadSex,
  getGnomadMetrics,
  type Variant,
} from "@features/variant/types";
import { BarChart } from "@shared/components/charts";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface PopulationRow {
  id: string;
  population: string;
  code: string;
  tg: number | null; // 1000 Genomes
  exome: number | null; // gnomAD v4.1 Exome
  genome: number | null; // gnomAD v4.1 Genome
}

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
  tgKey: string | null; // 1000G uses different keys
}> = [
  { id: "all", name: "Global", code: "ALL", prefix: "", tgKey: "tg_all" },
  {
    id: "afr",
    name: "African/African American",
    code: "AFR",
    prefix: "afr",
    tgKey: "tg_afr",
  },
  {
    id: "amr",
    name: "Admixed American",
    code: "AMR",
    prefix: "amr",
    tgKey: "tg_amr",
  },
  {
    id: "asj",
    name: "Ashkenazi Jewish",
    code: "ASJ",
    prefix: "asj",
    tgKey: null,
  },
  {
    id: "eas",
    name: "East Asian",
    code: "EAS",
    prefix: "eas",
    tgKey: "tg_eas",
  },
  { id: "fin", name: "Finnish", code: "FIN", prefix: "fin", tgKey: null },
  {
    id: "nfe",
    name: "Non-Finnish European",
    code: "NFE",
    prefix: "nfe",
    tgKey: "tg_eur",
  },
  {
    id: "sas",
    name: "South Asian",
    code: "SAS",
    prefix: "sas",
    tgKey: "tg_sas",
  },
  { id: "ami", name: "Amish", code: "AMI", prefix: "ami", tgKey: null },
  {
    id: "mid",
    name: "Middle Eastern",
    code: "MID",
    prefix: "mid",
    tgKey: null,
  },
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

function FrequencyCell({
  value,
  min,
  max,
}: {
  value: number | null;
  min: number;
  max: number;
}) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }

  // Scale based on actual data range
  const range = max - min;
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono font-medium tabular-nums text-slate-900">
        {value.toFixed(6)}
      </span>
      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Chart Component
// ============================================================================

function PopulationChart({ data }: { data: PopulationRow[] }) {
  // Use gnomAD genome data for visualization (fallback to exome, then 1000G)
  const chartData = [...data]
    .filter((d) => d.genome !== null || d.exome !== null || d.tg !== null)
    .map((d) => ({
      id: d.id,
      label: d.code,
      value: d.genome ?? d.exome ?? d.tg ?? 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <BarChart
      data={chartData}
      layout="horizontal"
      colorScheme={{ type: "single", color: "oklch(0.51 0.21 286.5)" }}
      valueFormatter={(v) => v.toFixed(6)}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AlleleFrequencyDataTable({
  variant,
}: AlleleFrequencyDataTableProps) {
  const [sexFilter, setSexFilter] = useState<SexFilter>("overall");

  // Transform data to rows based on sex filter
  const populationData = useMemo((): PopulationRow[] => {
    const sexSuffix: GnomadSex =
      sexFilter === "male" ? "xy" : sexFilter === "female" ? "xx" : "";

    const rows = POPULATIONS.map((pop) => {
      // Get 1000 Genomes data (no sex-specific data available)
      let tgValue: number | null = null;
      if (sexFilter === "overall" && pop.tgKey && variant.tg) {
        const value = variant.tg[pop.tgKey as keyof typeof variant.tg];
        tgValue = typeof value === "number" ? value : null;
      }

      // Get gnomAD exome and genome data
      const exomeMetrics = getGnomadMetrics(
        variant.gnomad_exome,
        pop.prefix,
        sexSuffix,
      );
      const genomeMetrics = getGnomadMetrics(
        variant.gnomad_genome,
        pop.prefix,
        sexSuffix,
      );

      return {
        id: pop.id,
        population: pop.name,
        code: pop.code,
        tg: tgValue,
        exome: exomeMetrics?.af ?? null,
        genome: genomeMetrics?.af ?? null,
      };
    });

    // Sort by gnomAD genome frequency (descending), with nulls at the end
    return rows.sort((a, b) => {
      if (a.genome === null && b.genome === null) return 0;
      if (a.genome === null) return 1;
      if (b.genome === null) return -1;
      return b.genome - a.genome;
    });
  }, [variant, sexFilter]);

  // Calculate min/max for each dataset to scale bars appropriately
  const ranges = useMemo(() => {
    const tgValues = populationData
      .map((d) => d.tg)
      .filter((v): v is number => v !== null);
    const exomeValues = populationData
      .map((d) => d.exome)
      .filter((v): v is number => v !== null);
    const genomeValues = populationData
      .map((d) => d.genome)
      .filter((v): v is number => v !== null);

    return {
      tg: {
        min: tgValues.length > 0 ? Math.min(...tgValues) : 0,
        max: tgValues.length > 0 ? Math.max(...tgValues) : 1,
      },
      exome: {
        min: exomeValues.length > 0 ? Math.min(...exomeValues) : 0,
        max: exomeValues.length > 0 ? Math.max(...exomeValues) : 1,
      },
      genome: {
        min: genomeValues.length > 0 ? Math.min(...genomeValues) : 0,
        max: genomeValues.length > 0 ? Math.max(...genomeValues) : 1,
      },
    };
  }, [populationData]);

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
        id: "tg",
        accessorKey: "tg",
        header: "1000G Phase 3",
        enableSorting: true,
        meta: {
          description: "Allele frequency from 1000 Genomes Project Phase 3",
        },
        cell: ({ row }) => (
          <FrequencyCell
            value={row.original.tg}
            min={ranges.tg.min}
            max={ranges.tg.max}
          />
        ),
      },
      {
        id: "exome",
        accessorKey: "exome",
        header: "gnomAD v4.1 Exome",
        enableSorting: true,
        meta: {
          description: "Allele frequency from gnomAD v4.1 exome dataset",
        },
        cell: ({ row }) => (
          <FrequencyCell
            value={row.original.exome}
            min={ranges.exome.min}
            max={ranges.exome.max}
          />
        ),
      },
      {
        id: "genome",
        accessorKey: "genome",
        header: "gnomAD v4.1 Genome",
        enableSorting: true,
        meta: {
          description: "Allele frequency from gnomAD v4.1 genome dataset",
        },
        cell: ({ row }) => (
          <FrequencyCell
            value={row.original.genome}
            min={ranges.genome.min}
            max={ranges.genome.max}
          />
        ),
      },
    ],
    [ranges],
  );

  return (
    <DataSurface
      columns={columns}
      data={populationData}
      icon={Users}
      title="Ancestry Allele Frequencies"
      subtitle="1000 Genomes Phase 3 & gnomAD v4.1"
      searchPlaceholder="Search populations..."
      searchColumn="population"
      exportable
      exportFilename={`allele-frequencies-${variant.variant_vcf || "variant"}`}
      dimensions={[
        {
          label: "Sex",
          options: [
            { value: "overall", label: "Overall" },
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
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
