"use client";

import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useScoresetVariants } from "../../hooks/use-scoreset-variants";
import { scoreToBand } from "../../lib/bands";
import type {
  Calibration,
  GenomicVariant,
  MavedbVariant,
  Page,
  ProteinVariant,
} from "../../types";
import { BandChip } from "../shared/band-chip";
import { RegionLink } from "../shared/region-link";

interface VariantsTableProps {
  urn: string;
  bands: Calibration[];
  /** Authoritative scoreset row count from `/scoresets/{urn}` metadata. */
  totalVariants: number;
  initialData?: Page<MavedbVariant>;
  searchQuery?: string;
  scoreMin?: number | null;
  scoreMax?: number | null;
}

interface RowDisplay {
  /** What goes in the "Change" column. */
  change: string | null;
  /** Tooltip on the change cell — extra coord info. */
  changeTooltip: string | undefined;
  /** What goes in the "Position" column. */
  positionLabel: string | null;
  /** What goes in the "Region" column. */
  loc: string | null;
  locTooltip: string | undefined;
}

function genomicLoc(v: GenomicVariant): string {
  // Half-open span; SNV → 1 bp, indel → ref-allele length.
  return `${v.chrom_id}-${v.position}-${v.position + (v.ref_allele.length || 1)}`;
}

function genomicChangeText(v: GenomicVariant): string {
  // Prefer the cDNA HGVS if present (the canonical scientific identifier),
  // fall back to the bare allele substitution.
  if (v.hgvs_nt) return v.hgvs_nt;
  return `${v.ref_allele}>${v.alt_allele}`;
}

function describeRow(v: MavedbVariant): RowDisplay {
  if (v.coords === "protein") {
    return describeProtein(v);
  }
  return describeGenomic(v);
}

function describeProtein(v: ProteinVariant): RowDisplay {
  return {
    change: v.hgvs_pro,
    changeTooltip: `Global aa ${v.aa_pos}: ${v.aa_ref}→${v.aa_alt}`,
    positionLabel: `aa ${v.aa_pos.toLocaleString()}`,
    loc: v.aa_pos_region
      ? `${v.aa_pos_region.chromosome}-${v.aa_pos_region.start}-${v.aa_pos_region.end}`
      : null,
    locTooltip: v.aa_pos_region?.exon_split
      ? "Codon spans an exon boundary"
      : undefined,
  };
}

function describeGenomic(v: GenomicVariant): RowDisplay {
  const tooltip = v.hgvs_pro
    ? `Protein: ${v.hgvs_pro}`
    : v.hgvs_g
      ? v.hgvs_g
      : undefined;
  return {
    change: genomicChangeText(v),
    changeTooltip: tooltip,
    positionLabel: `chr${v.chrom_id}:${v.position.toLocaleString()}`,
    loc: genomicLoc(v),
    locTooltip: undefined,
  };
}

export function VariantsTable({
  urn,
  bands,
  totalVariants,
  initialData,
  searchQuery,
  scoreMin,
  scoreMax,
}: VariantsTableProps) {
  const filters = useMemo(
    () => ({
      q: searchQuery || undefined,
      score_min: typeof scoreMin === "number" ? scoreMin : undefined,
      score_max: typeof scoreMax === "number" ? scoreMax : undefined,
    }),
    [searchQuery, scoreMin, scoreMax],
  );

  const [pageSize, setPageSize] = useState(50);

  const { rows, hasNext, hasPrev, next, prev, isLoading, isFetching, error } =
    useScoresetVariants({
      urn,
      filters,
      pageSize,
      initialData,
    });

  const columns = useMemo<ColumnDef<MavedbVariant, unknown>[]>(
    () => [
      {
        id: "hgvs",
        accessorFn: (r) => describeRow(r).change,
        header: "HGVS",
        cell: ({ row }) => {
          const d = describeRow(row.original);
          if (!d.change) return <Dash />;
          return (
            <span className="text-xs font-mono" title={d.changeTooltip}>
              {d.change}
            </span>
          );
        },
      },
      {
        id: "position",
        accessorFn: (r) => describeRow(r).positionLabel,
        header: "Position",
        cell: ({ getValue }) => {
          const label = getValue() as string | null;
          if (!label) return <Dash />;
          return (
            <span className="text-xs tabular-nums text-muted-foreground">
              {label}
            </span>
          );
        },
      },
      {
        id: "region",
        accessorFn: (r) => describeRow(r).loc,
        header: "Genome region",
        cell: ({ row }) => {
          const d = describeRow(row.original);
          if (!d.loc) return <Dash />;
          return <RegionLink loc={d.loc} tooltip={d.locTooltip} />;
        },
      },
      {
        id: "score",
        accessorKey: "score",
        header: "Functional score",
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          if (v == null) return <Dash />;
          return (
            <span className="text-xs tabular-nums text-foreground">
              {v.toFixed(3)}
            </span>
          );
        },
      },
      {
        id: "band",
        accessorFn: (r) => r.score,
        header: "ACMG band",
        cell: ({ row }) => {
          const score = row.original.score;
          if (score == null || bands.length === 0) return <Dash />;
          const band = scoreToBand(score, bands);
          if (!band) return <Dash />;
          return (
            <BandChip labelClass={band.label_class}>
              {band.display_label}
            </BandChip>
          );
        },
      },
    ],
    [bands],
  );

  const activeBand = useMemo(() => {
    if (scoreMin == null && scoreMax == null) return null;
    return (
      bands.find(
        (b) =>
          (b.range_low ?? null) === scoreMin &&
          (b.range_high ?? null) === scoreMax,
      ) ?? null
    );
  }, [bands, scoreMin, scoreMax]);

  const subtitle = activeBand
    ? `Variants in ${activeBand.display_label}`
    : `${totalVariants.toLocaleString()} variants`;

  return (
    <section>
      <DataSurface
        title="Scoreset variants"
        subtitle={subtitle}
        data={rows}
        columns={columns}
        loading={isLoading && rows.length === 0}
        transitioning={isFetching && rows.length > 0}
        searchable={false}
        exportable
        exportFilename={`mavedb-variants-${urn}`}
        pageSizeOptions={[25, 50, 100, 200]}
        serverPagination={{
          totalCount: activeBand ? undefined : totalVariants,
          pageSize,
          hasMore: hasNext,
          onNextPage: next,
          onPreviousPage: prev,
          onPageSizeChange: setPageSize,
          canGoNext: hasNext,
          canGoPrevious: hasPrev,
        }}
        emptyMessage={
          error
            ? error instanceof Error
              ? error.message
              : "Failed to load variants."
            : "No variants in this scoreset."
        }
      />
    </section>
  );
}
