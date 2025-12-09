import type { OpenTargetsConsequenceRow } from "@/features/variant/types/opentargets";
import { createColumns, cell, categories, tooltip, Badge } from "@/lib/table/column-builder";
import { ExternalLink } from "@/components/ui/external-link";

const col = createColumns<OpenTargetsConsequenceRow>();

// Impact categories with consistent badge colors
const impactCategories = categories([
  { label: "HIGH", match: "HIGH", color: "red", description: "High-impact variants likely to disrupt gene function (frameshift, stop gain, splice donor/acceptor)" },
  { label: "MODERATE", match: "MODERATE", color: "orange", description: "Moderate-impact variants that may alter protein function (missense, in-frame indels)" },
  { label: "LOW", match: "LOW", color: "amber", description: "Low-impact variants with minimal expected effect (synonymous, splice region)" },
  { label: "MODIFIER", match: "MODIFIER", color: "gray", description: "Non-coding or intergenic variants with uncertain functional impact" },
]);

export const openTargetsConsequencesColumns = [
  col.display("approvedSymbol", {
    header: "Gene",
    description: tooltip({
      title: "Gene Symbol",
      description: "HGNC-approved gene symbol linked to Open Targets Platform gene page.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.approvedSymbol;
      const targetId = row.original.targetId;
      if (!symbol) return "-";
      return (
        <ExternalLink href={`https://platform.opentargets.org/target/${targetId}`} className="font-medium">
          {symbol}
        </ExternalLink>
      );
    },
  }),

  col.display("transcriptId", {
    header: "Transcript",
    description: tooltip({
      title: "Ensembl Transcript ID",
      description: "Ensembl transcript identifier linked to Ensembl transcript page.",
      citation: "Ensembl",
    }),
    cell: ({ row }) => {
      const val = row.original.transcriptId;
      if (!val) return "-";
      return (
        <ExternalLink href={`https://www.ensembl.org/Homo_sapiens/Transcript/Summary?t=${val}`} className="font-mono text-xs">
          {val}
        </ExternalLink>
      );
    },
  }),

  col.accessor("impact", {
    accessor: "impact",
    header: "Impact",
    description: tooltip({
      title: "Variant Impact",
      description: "VEP-predicted functional impact of the variant on the transcript.",
      citation: "Ensembl VEP",
      categories: impactCategories,
    }),
    cell: cell.badge(impactCategories),
  }),

  col.accessor("consequenceTerms", {
    accessor: "consequenceTerms",
    header: "Consequence",
    description: tooltip({
      title: "Consequence Terms",
      description: "Sequence Ontology terms describing the variant's molecular consequence on the transcript.",
      citation: "Sequence Ontology",
    }),
    cell: cell.text(),
  }),

  col.display("aminoAcidChange", {
    header: "AA Change",
    description: tooltip({
      title: "Amino Acid Change",
      description: "Three-letter amino acid change notation (e.g., Met1Val) for protein-coding variants.",
    }),
    cell: ({ row }) => {
      const val = row.original.aminoAcidChange;
      return val ? <span className="font-mono">{val}</span> : "-";
    },
  }),

  col.display("isEnsemblCanonical", {
    header: "Canonical",
    description: tooltip({
      title: "Canonical Transcript",
      description: "Whether this is the Ensembl canonical transcript for the gene.",
      citation: "Ensembl",
    }),
    cell: ({ row }) => {
      const val = row.original.isEnsemblCanonical;
      return <Badge color={val ? "emerald" : "gray"}>{val ? "Yes" : "No"}</Badge>;
    },
  }),

  col.display("lofteePrediction", {
    header: "LOFTEE",
    description: tooltip({
      title: "LOFTEE Prediction",
      description: "Loss-Of-Function Transcript Effect Estimator classifies variants as high-confidence or low-confidence loss-of-function.",
      citation: "Karczewski et al., 2020",
    }),
    cell: ({ row }) => {
      const val = row.original.lofteePrediction;
      if (!val) return "-";
      const color = val === "HC" ? "red" : val === "LC" ? "orange" : "gray";
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("codons", {
    header: "Codons",
    description: tooltip({
      title: "Codon Change",
      description: "Reference and alternate codons showing the nucleotide change in triplet context.",
    }),
    cell: ({ row }) => {
      const val = row.original.codons;
      return val ? <span className="font-mono text-xs">{val}</span> : "-";
    },
  }),

  col.accessor("consequenceScore", {
    accessor: "consequenceScore",
    header: "Score",
    description: tooltip({
      title: "Consequence Score",
      description: "Numeric score representing the severity of the consequence term.",
    }),
    cell: cell.decimal(2),
  }),

  col.display("distanceFromTss", {
    header: "TSS Distance",
    description: tooltip({
      title: "Distance from TSS",
      description: "Distance in base pairs from the transcription start site.",
    }),
    cell: ({ row }) => {
      const val = row.original.distanceFromTss;
      if (val === null || val === undefined) return "-";
      return <span className="font-mono">{val.toLocaleString()}</span>;
    },
  }),
];
