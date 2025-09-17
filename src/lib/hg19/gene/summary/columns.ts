export interface SummaryColumnsType {
  name: string;
  slug: string;
  items: {
    key: number;
    header: string;
    accessor: string;
    tooltip: string;
  }[];
}

export async function getSummaryColumns(subCategorySlug: string): Promise<any> {
  return summaryHG19columns.find(
    (subCategory) => subCategory.slug === subCategorySlug,
  );
}

export interface Hg19GeneSummary {
  total: number;
  [key: string]: number;
}

export type Hg19Summary = Hg19GeneSummary;

export const summaryHG19columns: SummaryColumnsType[] = [
  {
    name: "Allele Distribution",
    slug: "allele-distribution",
    items: [
      {
        key: 1,
        header: "Total",
        accessor: "total",
        tooltip: "Total number of variants",
      },
      {
        key: 2,
        header: "Common (MAF > 0.01)",
        accessor: "common",
        tooltip: "Minor allele frequency (MAF) > 0.01",
      },
    ],
  },
  {
    name: "Genecode Comprehensive Category",
    slug: "genecode-comprehensive-category",
    items: [
      {
        key: 1,
        header: "Exonic",
        accessor: "exonic",
        tooltip: "Variants that are in the exonic region",
      },
      {
        key: 2,
        header: "UTR",
        accessor: "utr",
        tooltip: "Variants that are in the UTR region",
      },
      {
        key: 3,
        header: "ncRNA",
        accessor: "ncrna",
        tooltip: "Variants that are ncRNA",
      },
      {
        key: 4,
        header: "Intronic",
        accessor: "intronic",
        tooltip: "Variants that are in the intronic region",
      },
      {
        key: 5,
        header: "Downstream",
        accessor: "downstream",
        tooltip: "Variants that are in the downstream region",
      },
      {
        key: 6,
        header: "Intergenic",
        accessor: "intergenic",
        tooltip: "Variants that are in the intergenic region",
      },
      {
        key: 7,
        header: "Upstream",
        accessor: "upstream",
        tooltip: "Variants that are in the upstream region",
      },
      {
        key: 8,
        header: "Splicing",
        accessor: "splicing",
        tooltip: "Variants that are in the splicing region",
      },
    ],
  },
  {
    name: "Clinvar",
    slug: "clinvar",
    items: [
      {
        key: 0,
        header: "Drug Response",
        accessor: "drugresponse",
        tooltip: "Variants that are associated with drug response",
      },
      {
        key: 1,
        header: "Pathogenic",
        accessor: "pathogenic",
        tooltip: "Variants that are pathogenic",
      },
      {
        key: 2,
        header: "Likely Pathogenic",
        accessor: "likelypathogenic",
        tooltip: "Variants that are likely pathogenic",
      },
      {
        key: 3,
        header: "Benign",
        accessor: "benign",
        tooltip: "Variants that are benign",
      },
      {
        key: 4,
        header: "Likely Benign",
        accessor: "likelybenign",
        tooltip: "Variants that are likely benign",
      },
      {
        key: 5,
        header: "Uncertain Significance",
        accessor: "unknown",
        tooltip: "Variants that have uncertain significance",
      },
      {
        key: 6,
        header: "Conflicting Interpretations",
        accessor: "conflicting",
        tooltip: "Variants that have conflicting interpretations",
      },
    ],
  },
  {
    name: "Functional Consequences",
    slug: "functional-consequences",
    items: [
      {
        key: 1,
        header: "Protein LoF",
        accessor: "plof",
        tooltip: "Variants that are protein loss of function",
      },
      {
        key: 2,
        header: "Non-Synonymous",
        accessor: "nonsynonymous",
        tooltip: "Variants that are non-synonymous",
      },
      {
        key: 3,
        header: "Synonymous",
        accessor: "synonymous",
        tooltip: "Variants that are synonymous",
      },
      {
        key: 4,
        header: "SIFT Deleterious",
        accessor: "deleterious",
        tooltip: "Variants that are deleterious",
      },
      {
        key: 5,
        header: "PolyPhen Probably Damaging",
        accessor: "damaging",
        tooltip: "Variants that are damaging",
      },
    ],
  },
  {
    name: "High Integrative Functional Score",
    slug: "high-integrative-score",
    items: [
      {
        key: 1,
        header: "APC Protein Function",
        accessor: "apcProteinFunction",
        tooltip: "APC protein function score",
      },
      {
        key: 2,
        header: "APC Conservation",
        accessor: "apcConservation",
        tooltip: "APC conservation score",
      },
      {
        key: 3,
        header: "APC Epigenetics",
        accessor: "apcEpigeneticsActive",
        tooltip: "APC epigenetics active score",
      },
      {
        key: 4,
        header: "APC Proximity To TSS/TES",
        accessor: "apcProximityToTssTes",
        tooltip: "APC proximity to TSS/TES score",
      },
      {
        key: 5,
        header: "APC Mutation Density",
        accessor: "apcMutationDensity",
        tooltip: "APC mutation density score",
      },
      {
        key: 6,
        header: "APC Transcription Factor",
        accessor: "apcTranscriptionFactor",
        tooltip: "APC transcription factor score",
      },
      {
        key: 7,
        header: "CADD PHRED",
        accessor: "caddPhred",
        tooltip: "CADD PHRED score",
      },
    ],
  },
];
