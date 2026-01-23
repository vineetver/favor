import type { Variant } from "@/features/variant/types";
import {
  categories,
  cell,
  createColumns,
  tooltip,
} from "@/infrastructure/table/column-builder";

const col = createColumns<Variant>();

const isCanonical = categories([
  {
    label: "Yes",
    match: /^y$/i,
    color: "green",
    description: "Affects canonical transcript (most biologically relevant)",
  },
  {
    label: "No",
    match: /^n$/i,
    color: "red",
    description: "Affects alternative transcript",
  },
]);

export const somaticMutationColumns = [
  col.accessor("aa", {
    accessor: (row) => row.cosmic?.aa,
    header: "Mutation (Amino Acid)",
    description: tooltip({
      title: "Mutation (Amino Acid)",
      description:
        "The change that has occurred in the peptide sequence as a result of the mutation. Syntax follows Human Genome Variation Society (HGVS) recommendations.",
      guides: [
        {
          threshold: "Format",
          meaning: "HGVS protein notation (e.g., p.V600E)",
        },
        {
          threshold: "Mutation type",
          meaning: "Shown in brackets after mutation string",
        },
        {
          threshold: "Clinical relevance",
          meaning: "Links to cancer phenotypes and drug responses",
        },
      ],
    }),
    cell: cell.text(),
  }),

  col.accessor("cds", {
    accessor: (row) => row.cosmic?.cds,
    header: "Mutation (CDS)",
    description: tooltip({
      title: "Mutation (CDS)",
      description:
        "The change that has occurred in the nucleotide sequence as a result of the mutation. Syntax follows HGVS recommendations for coding sequence notation.",
      guides: [
        {
          threshold: "Nonsense",
          meaning: "Substitution creating stop codon, truncating protein",
        },
        { threshold: "Missense", meaning: "Substitution changing amino acid" },
        {
          threshold: "Coding silent",
          meaning: "Synonymous substitution, same amino acid",
        },
        { threshold: "Intronic", meaning: "Non-coding region mutation" },
        {
          threshold: "Complex",
          meaning: "Multiple insertions, deletions, substitutions",
        },
      ],
    }),
    cell: cell.text(),
  }),

  col.accessor("genome_screen_sample_count", {
    accessor: (row) => row.cosmic?.sample_count,
    header: "Genome Screen Sample Count",
    description: tooltip({
      title: "Genome Screen Sample Count",
      description:
        "The number of samples in which this variant has been observed across COSMIC's cancer genome screens.",
      guides: [
        {
          threshold: "Higher counts",
          meaning: "More frequently observed in cancer samples",
        },
        {
          threshold: "Lower counts",
          meaning: "Rare or novel cancer mutations",
        },
        {
          threshold: "Clinical utility",
          meaning: "Frequency informs therapeutic targeting strategies",
        },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("is_canonical", {
    accessor: (row) => row.cosmic?.is_canonical,
    header: "Is Canonical",
    description: tooltip({
      title: "Is Canonical",
      description:
        "Indicates whether this mutation affects the Ensembl canonical transcript for the gene. Canonical transcripts are most conserved, highly expressed, and longest coding sequences.",
      categories: isCanonical,
    }),
    cell: cell.badge(isCanonical),
  }),
];

export const somaticMutationGroup = col.group(
  "somatic-mutation",
  "Somatic Mutation",
  somaticMutationColumns,
);
