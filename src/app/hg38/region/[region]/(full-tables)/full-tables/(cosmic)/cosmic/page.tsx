"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { safeCellRenderer, isValidString } from "@/lib/variant/annotations/helpers";
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { TablePagination } from "@/components/ui/pagination";
import { NoSearchResults } from "@/components/ui/no-data-found";
import { UniversalDataTableToolbar, useFilters, type FilterConfig } from "@/components/ui/universal-filter";
import { createGlobalSearchFilter } from "@/components/ui/universal-filter/presets";
import { fetchCosmicByRegion } from "@/lib/region/api";

export interface Cosmic {
  variant_vcf: string;
  gene: string;
  transcript: string;
  cds: string;
  aa: string;
  hgvsc: string;
  hgvsp: string;
  hgvsg: string;
  genome_screen_sample_count: number;
  is_canonical: string;
  tier: string;
  so_term: string;
}

// Create COSMIC-specific filters
const createCosmicFilters = (): FilterConfig[] => [
  createGlobalSearchFilter(["variant_vcf", "cds", "aa", "tier", "so_term", "gene"]),
  {
    id: "is_canonical",
    type: "select",
    label: "Is Canonical",
    placeholder: "All Transcripts",
    options: [
      { label: "Yes", value: "y" },
      { label: "No", value: "n" },
    ],
  },
  {
    id: "tier",
    type: "select", 
    label: "Tier",
    placeholder: "All Tiers",
    options: [
      { label: "Tier 1", value: "1" },
      { label: "Tier 2", value: "2" },
      { label: "Tier 3", value: "3" },
    ],
  },
  {
    id: "so_term",
    type: "select",
    label: "SO Term",
    placeholder: "All SO Terms",
    options: [
      { label: "Missense Variant", value: "missense_variant" },
      { label: "Synonymous Variant", value: "synonymous_variant" },
      { label: "Stop Gained", value: "stop_gained" },
      { label: "Splice Acceptor Variant", value: "splice_acceptor_variant" },
      { label: "Splice Donor Variant", value: "splice_donor_variant" },
      { label: "Frameshift Variant", value: "frameshift_variant" },
      { label: "Inframe Insertion", value: "inframe_insertion" },
      { label: "Inframe Deletion", value: "inframe_deletion" },
    ],
  },
  {
    id: "genome_screen_sample_count",
    type: "range",
    label: "Sample Count Range",
    min: 0,
    max: 10000,
    step: 1,
  },
];

export default function RegionCosmicPage() {
  const { region } = useParams();
  const [data, setData] = useState<Cosmic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    const fetchCosmicData = async () => {
      if (!region) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchCosmicByRegion(region as string);
        if (result === null) {
          throw new Error('Failed to fetch COSMIC data');
        }
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch COSMIC data');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCosmicData();
  }, [region]);

  // Set up filters and filtering
  const filters = useMemo(() => createCosmicFilters(), []);
  const { filterValues, setFilterValues, filteredData } = useFilters({ data, filters });

  const columns: ColumnDef<Cosmic>[] = useMemo(() => [
    {
      accessorKey: "variant_vcf",
      header: createColumnHeader("Variant (VCF)", {
        tooltip: "VCF format variant notation representing genomic position and alleles",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return safeCellRenderer(
          value,
          (str) => <span className="font-mono text-xs">{str}</span>,
          isValidString,
        );
      },
    },
    {
      accessorKey: "gene",
      header: createColumnHeader("Gene", {
        tooltip: "Gene symbol associated with this variant",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return safeCellRenderer(
          value,
          (str) => <span className="font-medium">{str}</span>,
          isValidString,
        );
      },
    },
    {
      accessorKey: "cds",
      header: createColumnHeader("Mutation (CDS)", {
        tooltip: "Coding sequence mutation following HGVS notation. Shows nucleotide changes in the coding region.",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return safeCellRenderer(
          value,
          (str) => <span className="font-mono text-xs">{str}</span>,
          isValidString,
        );
      },
    },
    {
      accessorKey: "aa",
      header: createColumnHeader("Mutation (Amino Acid)", {
        tooltip: "Amino acid change from the mutation. Format follows HGVS protein notation (e.g., p.V600E). Links to cancer phenotypes and drug responses.",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return safeCellRenderer(
          value,
          (str) => <span className="font-mono text-xs bg-muted/20 px-2 py-1 rounded">{str}</span>,
          isValidString,
        );
      },
    },
    {
      accessorKey: "genome_screen_sample_count",
      header: createColumnHeader("Genome Screen Sample Count", {
        tooltip: "Number of samples where this variant was observed in COSMIC cancer genome screens. Higher counts indicate more frequent cancer mutations.",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return <span className="font-medium">{value?.toLocaleString() || ""}</span>;
      },
    },
    {
      accessorKey: "is_canonical",
      header: createColumnHeader("Is Canonical", {
        tooltip: "Whether this mutation affects the Ensembl canonical transcript. Canonical transcripts are most conserved, highly expressed, and longest coding sequences.",
        sortable: true,
      }),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        switch (value) {
          case "y":
            return (
              <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-label-md font-medium leading-5 text-green-900">
                Yes
              </span>
            );
          case "n":
            return (
              <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-label-md font-medium leading-5 text-red-900">
                No
              </span>
            );
          default:
            return <span></span>;
        }
      },
    },
  ], []);

  // Set up the table with filtering
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  // Export function
  const exportTSV = () => {
    const headers = columns.map((col) => {
      if ("accessorKey" in col && col.accessorKey)
        return col.accessorKey.toString();
      return "column";
    });

    const rows = filteredData.map((row) =>
      columns.map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = (row as any)[col.accessorKey];
          return typeof value === "string" ? value : String(value || "");
        }
        return "";
      }),
    );

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmic-region-${region}-${new Date().toISOString().split('T')[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading COSMIC Data</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const hasData = data && data.length > 0;
  const hasFilteredData = hasData && table.getFilteredRowModel().rows.length > 0;

  if (!hasData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <NoSearchResults searchTerm="" className="py-8" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{`COSMIC Cancer Mutations - ${region}`}</CardTitle>
            <CardDescription>Cancer somatic mutations from the COSMIC database for this region</CardDescription>
          </div>

          <UniversalDataTableToolbar
            table={table}
            data={data}
            filters={filters.map(filter => ({
              ...filter,
              placeholder: filter.type === 'search' ? 'Search mutations...' : filter.placeholder
            }))}
            filterValues={filterValues}
            onFilterChange={setFilterValues}
            onExport={exportTSV}
            exportLabel="Export TSV"
          />
        </CardHeader>

        <CardContent className="grid grid-cols-1">
          {hasFilteredData ? (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination table={table} />
            </>
          ) : (
            <div className="p-6">
              <NoSearchResults
                searchTerm={filterValues.search as string || ""}
                onClearSearch={() => setFilterValues({ ...filterValues, search: "" })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}