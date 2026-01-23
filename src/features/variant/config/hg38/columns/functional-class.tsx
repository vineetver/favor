import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ExternalLink } from "@shared/components/ui/external-link";
import { GencodeExonicInfo } from "@features/variant/components/gencode-exonic-info";
import type {
  ExonicDetail,
  GeneHancer,
  Transcript,
  UcscTranscript,
  Variant,
} from "@features/variant/types";
import {
  categories,
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Variant>();

// ============================================================================
// Category Definitions
// ============================================================================

const gencodeComprehensive = categories([
  {
    label: "Exonic",
    match: /(exonic)/i,
    color: "stone",
    description: "within protein-coding regions",
  },
  {
    label: "UTR",
    match: /(UTR)/i,
    color: "indigo",
    description: "untranslated regions",
  },
  {
    label: "Intronic",
    match: /(intronic)/i,
    color: "lime",
    description: "within gene introns",
  },
  {
    label: "Downstream",
    match: /(downstream)/i,
    color: "teal",
    description: "downstream of genes",
  },
  {
    label: "Upstream",
    match: /^upstream$/,
    color: "sky",
    description: "upstream of genes",
  },
  {
    label: "Intergenic",
    match: /(intergenic)/i,
    color: "cyan",
    description: "between genes",
  },
  {
    label: "Splicing",
    match: /(splicing)/i,
    color: "yellow",
    description: "affecting splice sites",
  },
]);

const gencodeExonic = categories([
  {
    label: "Stopgain",
    match: /(stopgain)/i,
    color: "stone",
    description: "introduces stop codon",
  },
  {
    label: "Stoploss",
    match: /(stoploss)/i,
    color: "rose",
    description: "removes stop codon",
  },
  {
    label: "Nonsynonymous SNV",
    match: /(nonsynonymous SNV)/i,
    color: "amber",
    description: "changes amino acid",
  },
  {
    label: "Synonymous SNV",
    match: /(synonymous SNV)/i,
    color: "green",
    description: "doesn't change amino acid",
  },
  {
    label: "Frameshift insertion",
    match: /(frameshift insertion)/i,
    color: "orange",
    description: "insertion causing frame shift",
  },
  {
    label: "Frameshift deletion",
    match: /(frameshift deletion)/i,
    color: "sky",
    description: "deletion causing frame shift",
  },
  {
    label: "Frameshift substitution",
    match: /(frameshift substitution)/i,
    color: "yellow",
    description: "substitution causing frame shift",
  },
  {
    label: "Nonframeshift insertion",
    match: /(nonframeshift insertion)/i,
    color: "teal",
    description: "insertion preserving frame",
  },
  {
    label: "Nonframeshift deletion",
    match: /(nonframeshift deletion)/i,
    color: "cyan",
    description: "deletion preserving frame",
  },
  {
    label: "Nonframeshift substitution",
    match: /(nonframeshift substitution)/i,
    color: "lime",
    description: "substitution preserving frame",
  },
  {
    label: "Unknown",
    match: /(unknown)/i,
    color: "indigo",
    description: "unknown impact",
  },
]);

const cagePromoter = categories([
  {
    label: "Yes",
    match: /.+/,
    color: "green",
    description: "variant overlaps with CAGE promoter site",
  },
  {
    label: "No",
    match: "NO",
    color: "red",
    description: "variant does not overlap with CAGE promoter site",
  },
]);

const cageEnhancer = categories([
  {
    label: "Yes",
    match: /.+/,
    color: "green",
    description: "variant overlaps with CAGE enhancer site",
  },
  {
    label: "No",
    match: "NO",
    color: "red",
    description: "variant does not overlap with CAGE enhancer site",
  },
]);

// ============================================================================
// Custom Cell Renderers
// ============================================================================

function GeneHancerCell({ value }: { value: GeneHancer | null | undefined }) {
  const entries =
    value?.targets
      ?.filter((target) => target?.gene)
      .map((target) => ({
        gene: target?.gene ?? "-",
        score: target?.score?.toFixed(3) ?? "-",
      })) ?? [];

  if (!entries.length) return <span>-</span>;

  const limit = 3;
  const visible = entries.slice(0, limit);
  const hidden = entries.slice(limit);

  const Entry = ({ gene, score }: { gene: string; score: string }) => (
    <div className="flex items-center gap-2 py-0.5">
      <span className="font-semibold">{gene}</span>
      <span className="text-muted-foreground">Score: {score}</span>
    </div>
  );

  if (hidden.length === 0) {
    return (
      <div className="space-y-1">
        {visible.map((e, i) => (
          <Entry key={i} {...e} />
        ))}
      </div>
    );
  }

  return (
    <Collapsible>
      <div className="space-y-1">
        {visible.map((e, i) => (
          <Entry key={i} {...e} />
        ))}
      </div>
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {hidden.map((e, i) => (
            <Entry key={i + limit} {...e} />
          ))}
        </div>
      </CollapsibleContent>
      <CollapsibleTrigger className="mt-2 text-blue-600 hover:text-blue-800 underline">
        Show {hidden.length} more
      </CollapsibleTrigger>
    </Collapsible>
  );
}

function TranscriptLinks({
  value,
  urlFn,
}: {
  value: Array<string | null> | null | undefined;
  urlFn: (t: string) => string;
}) {
  const transcripts = (value ?? []).filter(Boolean).map((t) => String(t));
  if (!transcripts.length) return <span>-</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {transcripts.map((t, i) => (
        <ExternalLink key={i} href={urlFn(t)} className="font-mono">
          {t}
        </ExternalLink>
      ))}
    </div>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================

export const functionalClassColumns = [
  col.accessor("genecode_comprehensive_info", {
    accessor: (row) => row.genecode?.genes,
    header: "Gencode Comprehensive Info",
    description: tooltip({
      title: "Gencode Comprehensive Info",
      description:
        "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
      citation: "Frankish et al., 2018; Harrow et al., 2012",
    }),
    cell: ({ row }) => (
      <div className="font-mono">
        {(row.getValue("genecode_comprehensive_info") as Array<string | null>)
          ?.filter(Boolean)
          ?.join(", ") || "-"}
      </div>
    ),
  }),

  col.accessor("genecode_comprehensive_category", {
    accessor: (row) => row.genecode?.region_type,
    header: "Gencode Comprehensive Category",
    description: tooltip({
      title: "Gencode Comprehensive Category",
      description:
        "Identify whether variants cause protein coding changes using Gencode genes definition systems.",
      citation: "Frankish et al., 2018; Harrow et al., 2012",
      categories: gencodeComprehensive,
    }),
    cell: cell.badge(gencodeComprehensive, "amber"),
  }),

  col.accessor("genecode_comprehensive_exonic_info", {
    accessor: (row) => row.genecode?.transcripts,
    header: "Gencode Comprehensive Exonic Info",
    description: tooltip({
      title: "Gencode Comprehensive Exonic Info",
      description:
        "Identify variants cause protein coding changes using Gencode genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      citation: "Frankish et al., 2018; Harrow et al., 2012",
    }),
    cell: ({ getValue }) => (
      <GencodeExonicInfo value={getValue() as Transcript[] | null} />
    ),
  }),

  col.accessor("genecode_comprehensive_exonic_category", {
    accessor: (row) => row.genecode?.consequence,
    header: "Gencode Comprehensive Exonic Category",
    description: tooltip({
      title: "Gencode Comprehensive Exonic Category",
      description:
        "Identify variants cause protein coding changes using Gencode genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      citation: "Frankish et al., 2018; Harrow et al., 2012",
      categories: gencodeExonic,
    }),
    cell: cell.badge(gencodeExonic),
  }),

  col.accessor("cage_promoter", {
    accessor: (row) => row.cage?.cage_promoter,
    header: "CAGE Promoter",
    description: tooltip({
      title: "CAGE Promoter",
      description: "CAGE defined promoter sites from Fantom 5.",
      citation: "Forrest et al., 2014",
      categories: cagePromoter,
    }),
    cell: cell.badgeMap({ NO: "red" }, { NO: "NO" }, "green"),
  }),

  col.accessor("cage_enhancer", {
    accessor: (row) => row.cage?.cage_enhancer,
    header: "CAGE Enhancer",
    description: tooltip({
      title: "CAGE Enhancer",
      description: "CAGE defined enhancer sites from Fantom 5.",
      citation: "Forrest et al., 2014",
      categories: cageEnhancer,
    }),
    cell: cell.badgeMap({ NO: "red" }, { NO: "NO" }, "green"),
  }),

  col.accessor("genehancer", {
    accessor: (row) => row.genehancer,
    header: "GeneHancer",
    description: tooltip({
      title: "GeneHancer",
      description:
        "Predicted human enhancer sites from the GeneHancer database.",
      citation: "Fishilevich et al., 2017",
    }),
    cell: cell.custom((val: Variant["genehancer"]) => (
      <GeneHancerCell value={val} />
    )),
  }),

  col.accessor("super_enhancer", {
    accessor: (row) => row.super_enhancer?.ids,
    header: "Super Enhancer",
    description: tooltip({
      title: "Super Enhancer",
      description:
        "Predicted super-enhancer sites and targets in a range of human cell types.",
      citation: "Hnisz et al., 2013",
    }),
    cell: cell.custom((val: Array<string | null> | null) => (
      <div className="font-mono">
        {val?.filter(Boolean).join(", ") || "-"}
      </div>
    )),
  }),

  col.accessor("ucsc_info", {
    accessor: (row) => row.ucsc?.transcripts,
    header: "UCSC Info",
    description: tooltip({
      title: "UCSC Info",
      description:
        "Identify whether variants cause protein coding changes using UCSC genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
    }),
    cell: cell.custom((val: Array<string | null> | null) => (
      <TranscriptLinks
        value={val}
        urlFn={(t) =>
          `https://www.ensembl.org/Homo_sapiens/Transcript/Summary?t=${t}`
        }
      />
    )),
  }),

  col.accessor("ucsc_exonic_info", {
    accessor: (row) => row.ucsc?.exonic_details,
    header: "UCSC Exonic Info",
    description: tooltip({
      title: "UCSC Exonic Info",
      description:
        "Identify variants cause protein coding changes using UCSC genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
    }),
    cell: cell.custom((val: UcscTranscript[] | null) => (
      <GencodeExonicInfo value={val} />
    )),
  }),

  col.accessor("refseq_info", {
    accessor: (row) => row.refseq?.transcripts,
    header: "RefSeq Info",
    description: tooltip({
      title: "RefSeq Info",
      description:
        "Identify whether variants cause protein coding changes using RefSeq genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
    }),
    cell: cell.custom((val: Array<string | null> | null) => (
      <TranscriptLinks
        value={val}
        urlFn={(t) => `https://www.ncbi.nlm.nih.gov/nuccore/${t}`}
      />
    )),
  }),

  col.accessor("refseq_exonic_info", {
    accessor: (row) => row.refseq?.exonic_details,
    header: "RefSeq Exonic Info",
    description: tooltip({
      title: "RefSeq Exonic Info",
      description:
        "Identify variants cause protein coding changes using RefSeq genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
    }),
    cell: cell.custom((val: ExonicDetail[] | null) => (
      <GencodeExonicInfo value={val} />
    )),
  }),
];

export const functionalClassGroup = col.group(
  "functional-class",
  "Functional Class",
  functionalClassColumns,
);
