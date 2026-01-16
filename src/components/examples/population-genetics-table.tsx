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
import { Users } from "lucide-react";
import { DataSurface } from "@/components/ui/data-surface";

interface PopulationRow {
  id: string;
  population: string;
  code: string;
  alleleCount: number;
  alleleNumber: number;
  homozygotes: number;
  frequency: number;
}

// Different data for genomes vs exomes
const GENOME_DATA: PopulationRow[] = [
  { id: "1", population: "Global", code: "ALL", alleleCount: 24542, alleleNumber: 152312, homozygotes: 2522, frequency: 0.161143 },
  { id: "2", population: "African/African American", code: "AFR", alleleCount: 12027, alleleNumber: 41612, homozygotes: 1738, frequency: 0.289048 },
  { id: "3", population: "Admixed American", code: "AMR", alleleCount: 2067, alleleNumber: 15312, homozygotes: 158, frequency: 0.135000 },
  { id: "4", population: "Ashkenazi Jewish", code: "ASJ", alleleCount: 312, alleleNumber: 5124, homozygotes: 12, frequency: 0.060890 },
  { id: "5", population: "East Asian", code: "EAS", alleleCount: 1823, alleleNumber: 19824, homozygotes: 89, frequency: 0.091952 },
  { id: "6", population: "Finnish", code: "FIN", alleleCount: 892, alleleNumber: 12654, homozygotes: 34, frequency: 0.070492 },
  { id: "7", population: "Non-Finnish European", code: "NFE", alleleCount: 5124, alleleNumber: 47234, homozygotes: 412, frequency: 0.108482 },
  { id: "8", population: "South Asian", code: "SAS", alleleCount: 1897, alleleNumber: 15234, homozygotes: 79, frequency: 0.124540 },
  { id: "9", population: "Other", code: "OTH", alleleCount: 400, alleleNumber: 5318, homozygotes: 0, frequency: 0.075234 },
];

const EXOME_DATA: PopulationRow[] = [
  { id: "1", population: "Global", code: "ALL", alleleCount: 18234, alleleNumber: 98234, homozygotes: 1823, frequency: 0.185612 },
  { id: "2", population: "African/African American", code: "AFR", alleleCount: 8234, alleleNumber: 28123, homozygotes: 982, frequency: 0.292812 },
  { id: "3", population: "Admixed American", code: "AMR", alleleCount: 1523, alleleNumber: 12312, homozygotes: 98, frequency: 0.123712 },
  { id: "4", population: "Ashkenazi Jewish", code: "ASJ", alleleCount: 234, alleleNumber: 4123, homozygotes: 8, frequency: 0.056762 },
  { id: "5", population: "East Asian", code: "EAS", alleleCount: 1423, alleleNumber: 15234, homozygotes: 62, frequency: 0.093412 },
  { id: "6", population: "Finnish", code: "FIN", alleleCount: 712, alleleNumber: 9823, homozygotes: 24, frequency: 0.072491 },
  { id: "7", population: "Non-Finnish European", code: "NFE", alleleCount: 4234, alleleNumber: 38234, homozygotes: 312, frequency: 0.110741 },
  { id: "8", population: "South Asian", code: "SAS", alleleCount: 1523, alleleNumber: 12312, homozygotes: 58, frequency: 0.123712 },
  { id: "9", population: "Other", code: "OTH", alleleCount: 351, alleleNumber: 4073, homozygotes: 0, frequency: 0.086171 },
];

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

function FrequencyCell({ value }: { value: number }) {
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

function NumberCell({ value }: { value: number }) {
  return (
    <span className="text-sm font-mono tabular-nums text-slate-600">
      {value.toLocaleString()}
    </span>
  );
}

function PopulationChart({ data }: { data: PopulationRow[] }) {
  const chartData = [...data]
    .sort((a, b) => b.frequency - a.frequency)
    .map((d) => ({ name: d.code, fullName: d.population, value: d.frequency }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 40, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, "auto"]} tickFormatter={(v) => v.toFixed(2)} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }} />
        <RechartsTooltip
          content={({ payload }) => {
            const entry = payload?.[0];
            if (!entry) return null;
            return (
              <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                <div className="font-medium">{(entry.payload as { fullName: string }).fullName}</div>
                <div className="text-slate-300">Frequency: {(entry.value as number).toFixed(6)}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="value" fill="oklch(0.51 0.21 286.5)" radius={[0, 4, 4, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PopulationGeneticsTable() {
  const [dataset, setDataset] = useState("genome");
  const [sex, setSex] = useState("overall");

  // Data changes based on dataset selection
  const data = useMemo(() => {
    const baseData = dataset === "genome" ? GENOME_DATA : EXOME_DATA;
    // Simulate sex filter by modifying frequencies
    if (sex === "male") {
      return baseData.map(row => ({
        ...row,
        frequency: row.frequency * 1.05,
        alleleCount: Math.round(row.alleleCount * 0.52),
        alleleNumber: Math.round(row.alleleNumber * 0.5),
      }));
    }
    if (sex === "female") {
      return baseData.map(row => ({
        ...row,
        frequency: row.frequency * 0.95,
        alleleCount: Math.round(row.alleleCount * 0.48),
        alleleNumber: Math.round(row.alleleNumber * 0.5),
      }));
    }
    return baseData;
  }, [dataset, sex]);

  const columns = useMemo((): ColumnDef<PopulationRow>[] => [
    {
      id: "population",
      accessorKey: "population",
      header: "Population",
      enableSorting: true,
      cell: ({ row }) => <PopulationBadge code={row.original.code} name={row.original.population} />,
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
  ], []);

  return (
    <DataSurface
      columns={columns}
      data={data}
      icon={Users}
      title="Population Genetics"
      subtitle={`Allele frequency across populations • gnomAD v4.1 • ${dataset === "genome" ? "Genomes" : "Exomes"} • ${sex.charAt(0).toUpperCase() + sex.slice(1)}`}
      searchPlaceholder="Search populations..."
      searchColumn="population"
      exportable
      exportFilename="population-frequencies"
      dimensions={[
        {
          label: "Dataset",
          options: [
            { value: "genome", label: "Genomes" },
            { value: "exome", label: "Exomes" },
          ],
          value: dataset,
          onChange: (v) => setDataset(v),
        },
        {
          label: "Sex",
          options: [
            { value: "overall", label: "Overall" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ],
          value: sex,
          onChange: (v) => setSex(v),
        },
      ]}
      showViewSwitch
      visualization={PopulationChart}
      defaultPageSize={10}
      emptyMessage="No population data available"
    />
  );
}
