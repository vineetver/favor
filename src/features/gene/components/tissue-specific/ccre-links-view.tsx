"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState, useCallback } from "react";
import type { CcreLinkRow } from "@features/gene/api/region";
import { CcreDetailSheet } from "./ccre-detail-sheet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTissueName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\((\d+)\s+(Years?|Days?)\)/gi, "($1 $2)");
}

// Readable source labels
const SOURCE_LABELS: Record<string, string> = {
  ccre_chiapet: "ChIA-PET",
  ccre_crispr: "CRISPR",
  ENCODE_SCREEN: "ENCODE SCREEN",
};

function formatSource(raw: string): string {
  return SOURCE_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// Client fetch
// ---------------------------------------------------------------------------

interface CcreLinksFilters {
  source?: string;
  tissue?: string;
}

async function fetchCcreLinksClient(
  gene: string,
  filters: CcreLinksFilters,
): Promise<CcreLinkRow[]> {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.tissue) params.set("tissue", filters.tissue);
  params.set("limit", "50");

  const res = await fetch(
    `/api/v1/genes/${encodeURIComponent(gene)}/ccre-links?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CcreLinksViewProps {
  gene: string;
  initialData: CcreLinkRow[];
  sources: string[];
  tissues: string[];
}

export function CcreLinksView({
  gene,
  initialData,
  sources,
  tissues,
}: CcreLinksViewProps) {
  const searchParams = useClientSearchParams();

  const filters = useMemo((): CcreLinksFilters => {
    const f: CcreLinksFilters = {};
    const source = searchParams.get("source");
    if (source) f.source = source;
    const tissue = searchParams.get("tissue");
    if (tissue) f.tissue = tissue;
    return f;
  }, [searchParams]);

  const hasFilters = Boolean(filters.source || filters.tissue);

  const { data: rows, isLoading, isFetching } = useQuery({
    queryKey: ["ccre-links", gene, filters],
    queryFn: () => fetchCcreLinksClient(gene, filters),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    initialData: hasFilters ? undefined : initialData,
  });

  // cCRE detail sheet state
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openCcreSheet = useCallback((ccreId: string) => {
    setSelectedCcre(ccreId);
    setSheetOpen(true);
  }, []);

  // Columns (need closure over openCcreSheet)
  const columns = useMemo(
    (): ColumnDef<CcreLinkRow, unknown>[] => [
      {
        id: "ccre_id",
        accessorKey: "ccre_id",
        header: "cCRE",
        enableSorting: false,
        cell: ({ getValue }) => {
          const id = getValue() as string;
          return (
            <button
              className="text-xs font-mono text-primary hover:underline cursor-pointer"
              onClick={() => openCcreSheet(id)}
            >
              {id}
            </button>
          );
        },
      },
      {
        id: "source",
        accessorKey: "source",
        header: "Source",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatSource(getValue() as string)}
          </span>
        ),
      },
      {
        id: "method",
        accessorKey: "method",
        header: "Method",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "tissue_name",
        accessorKey: "tissue_name",
        header: "Tissue",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {formatTissueName(getValue() as string)}
          </span>
        ),
      },
      {
        id: "score",
        accessorKey: "score",
        header: "Score",
        enableSorting: false,
        cell: ({ row }) => {
          const score = row.original.score;
          const effect = row.original.effect_size;
          if (score != null) {
            return (
              <span className="text-xs tabular-nums text-foreground font-medium">
                {score.toFixed(3)}
              </span>
            );
          }
          if (effect != null) {
            return (
              <span className="text-xs tabular-nums text-muted-foreground">
                effect: {effect.toFixed(3)}
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground/40">&mdash;</span>;
        },
      },
    ],
    [openCcreSheet],
  );

  // Filter configs
  const filterConfigs = useMemo(
    (): ServerFilterConfig[] => [
      {
        id: "source",
        label: "Source",
        type: "select",
        placeholder: "All sources",
        options: sources.map((s) => ({ value: s, label: formatSource(s) })),
      },
      {
        id: "tissue",
        label: "Tissue",
        type: "select",
        placeholder: "All tissues",
        options: tissues.map((t) => ({
          value: t,
          label: formatTissueName(t),
        })),
      },
    ],
    [sources, tissues],
  );

  const tableState = useServerTable({
    filters: filterConfigs,
    serverPagination: false,
  });

  const data = rows ?? [];

  return (
    <>
      <DataSurface
        data={data}
        columns={columns}
        subtitle={`${data.length} cCRE linkages to ${gene}`}
        searchPlaceholder="Search cCREs, tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`ccre-links-${gene}`}
        filterable
        filters={filterConfigs}
        filterValues={tableState.filterValues}
        onFilterChange={tableState.onFilterChange}
        filterChips={tableState.filterChips}
        onRemoveFilterChip={tableState.onRemoveFilterChip}
        onClearFilters={tableState.onClearFilters}
        loading={isLoading && data.length === 0}
        transitioning={isFetching && data.length > 0}
        emptyMessage="No cCRE linkages found for this gene"
      />

      <CcreDetailSheet
        ccreId={selectedCcre}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
