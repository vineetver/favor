import type { ColumnDef } from "@tanstack/react-table";
import type { Variant } from "@features/variant/types";
import { createColumns, tooltip } from "@infra/table/column-builder";
import { basicColumns } from "@features/variant/config/hg38/columns/basic";
import { functionalClassColumns } from "@features/variant/config/hg38/columns/functional-class";
import { clinvarColumns } from "@features/variant/config/hg38/columns/clinvar";
import { proteinFunctionColumns } from "@features/variant/config/hg38/columns/protein-function";
import { integrativeColumns } from "@features/variant/config/hg38/columns/integrative";
import { apcColumns } from "@features/variant/config/hg38/columns/shared";
import { spliceAiColumns } from "@features/variant/config/hg38/columns/splice-ai";
import { somaticMutationColumns } from "@features/variant/config/hg38/columns/somatic-mutation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";

const col = createColumns<Variant>();

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
    if (filtered.length === 0) return <span className="text-muted-foreground">—</span>;

    const display = filtered[0];
    const rest = filtered.length - 1;

    if (filtered.length === 1 && display.length <= 20) {
      return <span className="font-medium text-foreground text-xs">{display}</span>;
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
          <TooltipContent side="bottom" className="max-w-sm max-h-48 overflow-y-auto">
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

// Compose columns from existing variant column definitions
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
  // Allele frequencies
  basicColumns[4] as ColumnDef<Variant>, // bravo_af
  basicColumns[2] as ColumnDef<Variant>, // bravo filter_status
  basicColumns[7] as ColumnDef<Variant>, // gnomad_genome_af
  basicColumns[6] as ColumnDef<Variant>, // gnomad_exome_af
  basicColumns[5] as ColumnDef<Variant>, // tg_all
  // Regulatory
  functionalClassColumns[4] as ColumnDef<Variant>, // cage_promoter
  functionalClassColumns[5] as ColumnDef<Variant>, // cage_enhancer
  functionalClassColumns[6] as ColumnDef<Variant>, // genehancer
  // Integrative scores
  integrativeColumns[10] as ColumnDef<Variant>, // linsight
  integrativeColumns[11] as ColumnDef<Variant>, // fathmm_xf
  // aPC scores
  apcColumns.proteinFunction as ColumnDef<Variant>,
  apcColumns.conservation as ColumnDef<Variant>,
  apcColumns.epigeneticsActive as ColumnDef<Variant>,
  // SpliceAI
  spliceAiColumns[0] as ColumnDef<Variant>,
  // COSMIC
  somaticMutationColumns[0] as ColumnDef<Variant>, // aa
  somaticMutationColumns[1] as ColumnDef<Variant>, // cds
];
