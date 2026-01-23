import { REGULATORY_STATE_MAP, type Variant } from "@features/variant/types";
import {
  Badge,
  categories,
  cell,
  createColumns,
  type DerivedColumn,
  tooltip,
} from "@infra/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const regulatoryStateCategories = categories([
  {
    label: "Active",
    match: "Active",
    color: "emerald",
    description: "Associated with open chromatin and gene activation",
  },
  {
    label: "Repressed",
    match: "Repressed",
    color: "rose",
    description: "Associated with closed chromatin and gene silencing",
  },
  {
    label: "Transcription",
    match: "Transcription",
    color: "sky",
    description: "Associated with active transcription",
  },
]);

// ============================================================================
// Regulatory State Derived Column
// ============================================================================

const regulatoryStateColumn: DerivedColumn = {
  header: "Regulatory State",
  headerTooltip: regulatoryStateCategories.description(
    "The regulatory state indicates the functional role of this epigenetic mark.",
  ),
  // Derive regulatory state from column ID
  derive: (_value, id) => {
    if (!id) return null;
    return REGULATORY_STATE_MAP[id] ?? null;
  },
  render: (value) => {
    const state = value as string | null;
    if (!state) return "—";
    const color = regulatoryStateCategories.getColor(state);
    return <Badge color={color}>{state}</Badge>;
  },
};

export const epigeneticsColumns = [
  apcColumns.epigeneticsActive,
  apcColumns.epigeneticsRepressed,
  apcColumns.epigeneticsTranscription,

  col.accessor("encode_dnase_sum", {
    accessor: (row) => row.main?.encode?.dnase?.phred,
    header: "DNase",
    description: tooltip({
      title: "DNase",
      description:
        "DNase-seq measures chromatin accessibility by identifying regions where DNA is accessible to DNase I enzyme. Open chromatin regions indicate active regulatory elements.",
      range: "[0.001, 118672]",
      defaultValue: "0.0",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥0.437)",
          meaning: "More accessible chromatin, likely regulatory regions",
        },
        {
          threshold: "Lower levels",
          meaning: "Less accessible chromatin, compact chromatin structure",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k27ac_sum", {
    accessor: (row) => row.main?.encode?.h3k27ac?.phred,
    header: "H3K27ac",
    description: tooltip({
      title: "H3K27ac",
      description:
        "Histone H3 lysine 27 acetylation mark, a key indicator of active enhancers and promoters. Distinguishes active enhancers from poised/inactive ones.",
      range: "[0.013, 288.608]",
      defaultValue: "0.36",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥7.82)",
          meaning: "Strong enhancer activity, active gene regulation",
        },
        {
          threshold: "Lower levels",
          meaning: "Weaker enhancer activity or inactive regulatory regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me1_sum", {
    accessor: (row) => row.main?.encode?.h3k4me1?.phred,
    header: "H3K4me1",
    description: tooltip({
      title: "H3K4me1",
      description:
        "Histone H3 lysine 4 monomethylation mark, commonly found at enhancer regions and regulatory elements. Marks both active and poised enhancers.",
      range: "[0.015, 91.954]",
      defaultValue: "0.37",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥5)",
          meaning: "Strong enhancer signature, active regulatory regions",
        },
        {
          threshold: "Lower levels",
          meaning: "Weaker enhancer activity or non-regulatory regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me2_sum", {
    accessor: (row) => row.main?.encode?.h3k4me2?.phred,
    header: "H3K4me2",
    description: tooltip({
      title: "H3K4me2",
      description:
        "Histone H3 lysine 4 dimethylation mark, associated with active promoters and transcriptional start sites.",
      range: "[0.024, 148.887]",
      defaultValue: "0.37",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥3.543)",
          meaning: "Active promoter regions, ongoing transcription",
        },
        {
          threshold: "Lower levels",
          meaning: "Inactive or weakly active promoters",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k4me3_sum", {
    accessor: (row) => row.main?.encode?.h3k4me3?.phred,
    header: "H3K4me3",
    description: tooltip({
      title: "H3K4me3",
      description:
        "Histone H3 lysine 4 trimethylation mark, the classical and most reliable marker of active promoters and transcriptional start sites.",
      range: "[0.012, 239.512]",
      defaultValue: "0.38",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥3.77)",
          meaning: "Highly active promoters, strong transcriptional activity",
        },
        {
          threshold: "Lower levels",
          meaning: "Inactive or weakly active promoters",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k9ac_sum", {
    accessor: (row) => row.main?.encode?.h3k9ac?.phred,
    header: "H3K9ac",
    description: tooltip({
      title: "H3K9ac",
      description:
        "Histone H3 lysine 9 acetylation mark, associated with transcriptionally active chromatin and gene expression.",
      range: "[0.019, 281.187]",
      defaultValue: "0.41",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥3.13)",
          meaning: "Active transcriptional regions, open chromatin",
        },
        {
          threshold: "Lower levels",
          meaning: "Transcriptionally inactive regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh4k20me1_sum", {
    accessor: (row) => row.main?.encode?.h4k20me1?.phred,
    header: "H4K20me1",
    description: tooltip({
      title: "H4K20me1",
      description:
        "Histone H4 lysine 20 monomethylation mark, associated with active chromatin, gene bodies, and transcriptional elongation.",
      range: "[0.054, 73.230]",
      defaultValue: "0.47",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥2.6)",
          meaning: "Active chromatin regions, ongoing transcription",
        },
        { threshold: "Lower levels", meaning: "Less active chromatin regions" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh2afz_sum", {
    accessor: (row) => row.main?.encode?.h2afz?.phred,
    header: "H2AFZ",
    description: tooltip({
      title: "H2AFZ",
      description:
        "Histone variant H2A.Z associated with transcriptional regulation, nucleosome positioning, and active chromatin regions. Facilitates transcription factor binding and gene regulation.",
      range: "[0.031, 96.072]",
      defaultValue: "0.42",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥2.1)",
          meaning: "Active regulatory elements, promoters and enhancers",
        },
        {
          threshold: "Lower levels",
          meaning: "Less active or inactive regulatory regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k9me3_sum", {
    accessor: (row) => row.main?.encode?.h3k9me3?.phred,
    header: "H3K9me3",
    description: tooltip({
      title: "H3K9me3",
      description:
        "Histone H3 lysine 9 trimethylation mark, a key marker of constitutive heterochromatin and gene silencing. Maintains long-term gene silencing and chromosome structure.",
      range: "[0.011, 58.712]",
      defaultValue: "0.38",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥3.61)",
          meaning: "Strongly repressed regions, heterochromatin",
        },
        {
          threshold: "Lower levels",
          meaning: "Less repressed or euchromatic regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k27me3_sum", {
    accessor: (row) => row.main?.encode?.h3k27me3?.phred,
    header: "H3K27me3",
    description: tooltip({
      title: "H3K27me3",
      description:
        "Histone H3 lysine 27 trimethylation mark, associated with facultative heterochromatin and Polycomb-mediated gene repression. Maintains developmental gene silencing and can be reversed.",
      range: "[0.014, 87.122]",
      defaultValue: "0.47",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥3.69)",
          meaning: "Polycomb-repressed regions, poised developmental genes",
        },
        {
          threshold: "Lower levels",
          meaning: "Less repressed or active regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k36me3_sum", {
    accessor: (row) => row.main?.encode?.h3k36me3?.phred,
    header: "H3K36me3",
    description: tooltip({
      title: "H3K36me3",
      description:
        "Histone H3 lysine 36 trimethylation mark, associated with actively transcribed gene bodies and transcriptional elongation.",
      range: "[0.009, 56.176]",
      defaultValue: "0.39",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥2.79)",
          meaning: "Actively transcribed gene bodies, ongoing elongation",
        },
        {
          threshold: "Lower levels",
          meaning: "Less transcriptionally active regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodeh3k79me2_sum", {
    accessor: (row) => row.main?.encode?.h3k79me2?.phred,
    header: "H3K79me2",
    description: tooltip({
      title: "H3K79me2",
      description:
        "Histone H3 lysine 79 dimethylation mark, associated with active transcription, elongating RNA polymerase, and chromatin dynamics.",
      range: "[0.015, 118.706]",
      defaultValue: "0.34",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥2.32)",
          meaning: "Actively transcribing regions, elongating RNA polymerase",
        },
        {
          threshold: "Lower levels",
          meaning: "Less transcriptionally active regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("encodetotal_rna_sum", {
    accessor: (row) => row.main?.encode?.total_rna?.phred,
    header: "totalRNA",
    description: tooltip({
      title: "Total RNA",
      description:
        "RNA sequencing signal measuring total RNA expression levels across multiple cell lines. Direct measure of transcriptional activity.",
      range: "[0, 92282.7]",
      defaultValue: "0.0",
      citation: "ENCODE Project Consortium, 2012",
      guides: [
        {
          threshold: "Higher levels (≥27.38)",
          meaning: "Highly transcribed regions, active gene expression",
        },
        {
          threshold: "Lower levels",
          meaning: "Less transcriptionally active or silent regions",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("gc", {
    accessor: (row) => row.main?.sequence_context?.gc,
    header: "GC",
    description: tooltip({
      title: "GC Content",
      description:
        "Percentage of guanine and cytosine nucleotides in a 150bp window around the variant. Affects chromatin structure and mutation patterns.",
      range: "[0, 1]",
      defaultValue: "0.42",
      guides: [
        {
          threshold: "Higher GC content (>0.6)",
          meaning: "GC-rich regions, often gene-dense areas",
        },
        {
          threshold: "Lower GC content (<0.3)",
          meaning: "AT-rich regions, often heterochromatic",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("cpg", {
    accessor: (row) => row.main?.sequence_context?.cpg,
    header: "CpG",
    description: tooltip({
      title: "CpG Content",
      description:
        "Percentage of CpG dinucleotides in a 150bp window around the variant. Relates to DNA methylation and gene regulation.",
      range: "[0, 0.6]",
      defaultValue: "0.02",
      guides: [
        {
          threshold: "Higher CpG content (>0.1)",
          meaning: "CpG islands, often unmethylated promoters",
        },
        {
          threshold: "Lower CpG content (<0.05)",
          meaning: "CpG-poor regions, potentially methylated",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),
];

export const epigeneticsGroup = col.group(
  "epigenetics",
  "Epigenetics",
  epigeneticsColumns,
  {
    derivedColumn: regulatoryStateColumn,
    view: {
      format: "transposed",
      search: true,
      export: true,
    },
  },
);
