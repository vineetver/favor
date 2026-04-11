import { basicColumns } from "@features/variant/config/hg38/columns/basic";
import { clinvarColumns } from "@features/variant/config/hg38/columns/clinvar";
import { functionalClassColumns } from "@features/variant/config/hg38/columns/functional-class";
import { integrativeColumns } from "@features/variant/config/hg38/columns/integrative";
import { proteinFunctionColumns } from "@features/variant/config/hg38/columns/protein-function";
import { apcColumns } from "@features/variant/config/hg38/columns/shared";
import { somaticMutationColumns } from "@features/variant/config/hg38/columns/somatic-mutation";
import { spliceAiColumns } from "@features/variant/config/hg38/columns/splice-ai";
import type { Variant } from "@features/variant/types";
import { createColumns, tooltip } from "@infra/table/column-builder";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";

const col = createColumns<Variant>();

/**
 * Locally re-id and enable sorting on a shared column without mutating it.
 * Lets us point a column at the API `sort_by` enum (e.g., remap
 * `apc_conservation_v2` → `apc_conservation`) only inside this table.
 */
function withSort<T>(column: ColumnDef<T>, apiSortId?: string): ColumnDef<T> {
  // Spread cast: TanStack's ColumnDef is a discriminated union and a generic
  // spread loses the discriminator. We know we're keeping the same shape and
  // only flipping enableSorting + id, so cast at the boundary.
  const next = {
    ...column,
    id: apiSortId ?? column.id ?? "",
    enableSorting: true,
  };
  return next as ColumnDef<T>;
}

// Custom genes column — truncates long transcript lists, full text on hover
const genesColumn = col.display("genes", {
  header: "Genes",
  description: tooltip({
    title: "Gencode Comprehensive Info",
    description:
      "Gene name(s) impacted by this variant. For intergenic regions, the nearby gene name is shown.",
  }),
  cell: ({ row }) => {
    const genes = row.original.genecode?.genes;
    if (!genes?.length) return <span className="text-muted-foreground">—</span>;

    const filtered = genes.filter(Boolean) as string[];
    if (filtered.length === 0)
      return <span className="text-muted-foreground">—</span>;

    const display = filtered[0];
    const rest = filtered.length - 1;

    if (filtered.length === 1 && display.length <= 20) {
      return (
        <span className="font-medium text-foreground text-xs">{display}</span>
      );
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-medium text-foreground text-xs cursor-default truncate max-w-[120px] inline-block align-bottom">
              {display}
              {rest > 0 && (
                <span className="text-muted-foreground ml-1">+{rest}</span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-sm max-h-48 overflow-y-auto"
          >
            <ul className="space-y-0.5 text-xs font-mono">
              {filtered.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
});

// Compose columns from existing variant column definitions.
// `withSort(col, apiSortId?)` flags a column server-sortable and (optionally)
// rebrands its id to match the API `sort_by` enum so the URL/sort signal
// roundtrips cleanly. See SORTABLE_COLUMNS in use-variant-scan-query.ts.
export const variantExplorerColumns: ColumnDef<Variant>[] = [
  // Core identification
  basicColumns[0] as ColumnDef<Variant>, // variant_vcf
  basicColumns[1] as ColumnDef<Variant>, // rsid
  genesColumn,
  // Gencode annotations
  functionalClassColumns[1] as ColumnDef<Variant>, // region_type
  functionalClassColumns[3] as ColumnDef<Variant>, // consequence
  // ClinVar
  clinvarColumns[0] as ColumnDef<Variant>, // clnsig
  clinvarColumns[2] as ColumnDef<Variant>, // clndn (disease name)
  clinvarColumns[4] as ColumnDef<Variant>, // clnrevstat (review status)
  // Protein predictions
  proteinFunctionColumns[1] as ColumnDef<Variant>, // AlphaMissense class
  proteinFunctionColumns[2] as ColumnDef<Variant>, // SIFT
  proteinFunctionColumns[3] as ColumnDef<Variant>, // PolyPhen
  // Allele frequencies — server-sortable
  withSort(basicColumns[4] as ColumnDef<Variant>), // bravo_af
  basicColumns[2] as ColumnDef<Variant>, // bravo filter_status
  withSort(basicColumns[7] as ColumnDef<Variant>), // gnomad_genome_af
  withSort(basicColumns[6] as ColumnDef<Variant>), // gnomad_exome_af
  basicColumns[5] as ColumnDef<Variant>, // tg_all
  // Regulatory
  functionalClassColumns[4] as ColumnDef<Variant>, // cage_promoter
  functionalClassColumns[5] as ColumnDef<Variant>, // cage_enhancer
  functionalClassColumns[6] as ColumnDef<Variant>, // genehancer
  // Integrative scores — server-sortable (already match API enum)
  withSort(integrativeColumns[10] as ColumnDef<Variant>), // linsight
  withSort(integrativeColumns[11] as ColumnDef<Variant>), // fathmm_xf
  // aPC scores — re-id where needed to match API enum
  apcColumns.proteinFunction as ColumnDef<Variant>,
  withSort(apcColumns.conservation as ColumnDef<Variant>, "apc_conservation"),
  apcColumns.epigeneticsActive as ColumnDef<Variant>,
  // CADD — server-sortable
  withSort(integrativeColumns[9] as ColumnDef<Variant>), // cadd_phred
  // SpliceAI / Pangolin / AlphaMissense — re-id'd to API enum names
  withSort(spliceAiColumns[0] as ColumnDef<Variant>, "pangolin_max_exome"), // pangolin_largest_ds_exome
  withSort(spliceAiColumns[1] as ColumnDef<Variant>, "pangolin_max_genome"), // pangolin_largest_ds_genome
  withSort(spliceAiColumns[2] as ColumnDef<Variant>, "splice_ai_max_exome"), // spliceai_ds_max_exome
  withSort(spliceAiColumns[3] as ColumnDef<Variant>, "splice_ai_max_genome"), // spliceai_ds_max_genome
  withSort(
    proteinFunctionColumns[7] as ColumnDef<Variant>, // am_pathogenicity
    "alpha_missense_max",
  ),
  // COSMIC
  somaticMutationColumns[0] as ColumnDef<Variant>, // aa
  somaticMutationColumns[1] as ColumnDef<Variant>, // cds
];
