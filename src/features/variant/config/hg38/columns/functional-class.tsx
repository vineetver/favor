import { GencodeExonicInfo } from "@/features/variant/components/gencode-exonic-info";
import { ExternalLink } from "@/components/ui/external-link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Variant } from "@/features/variant/types/types";
import { createColumnHelper } from "@/lib/data-display/builder";
import {
  renderCategoryDescription,
  getBadgeColorMap,
  type CategoryItem,
} from "@/lib/data-display/category-helper";

const helper = createColumnHelper<Variant>();

// Category definitions
const GENECODE_COMPREHENSIVE_CATEGORIES: CategoryItem[] = [
  {
    label: "Exonic",
    pattern: /(exonic)/i,
    color: "stone",
    description: "within protein-coding regions",
  },
  {
    label: "UTR",
    pattern: /(UTR)/i,
    color: "indigo",
    description: "untranslated regions",
  },
  {
    label: "Intronic",
    pattern: /(intronic)/i,
    color: "lime",
    description: "within gene introns",
  },
  {
    label: "Downstream",
    pattern: /(downstream)/i,
    color: "teal",
    description: "downstream of genes",
  },
  {
    label: "Upstream",
    pattern: /^upstream$/,
    color: "sky",
    description: "upstream of genes",
  },
  {
    label: "Intergenic",
    pattern: /(intergenic)/i,
    color: "cyan",
    description: "between genes",
  },
  {
    label: "Splicing",
    pattern: /(splicing)/i,
    color: "yellow",
    description: "affecting splice sites",
  },
];

const GENECODE_EXONIC_CATEGORIES: CategoryItem[] = [
  {
    label: "Stopgain",
    pattern: /(stopgain)/i,
    color: "stone",
    description: "introduces stop codon",
  },
  {
    label: "Stoploss",
    pattern: /(stoploss)/i,
    color: "rose",
    description: "removes stop codon",
  },
  {
    label: "Nonsynonymous SNV",
    pattern: /(nonsynonymous SNV)/i,
    color: "amber",
    description: "changes amino acid",
  },
  {
    label: "Synonymous SNV",
    pattern: /(synonymous SNV)/i,
    color: "green",
    description: "doesn't change amino acid",
  },
  {
    label: "Frameshift insertion",
    pattern: /(frameshift insertion)/i,
    color: "orange",
    description: "insertion causing frame shift",
  },
  {
    label: "Frameshift deletion",
    pattern: /(frameshift deletion)/i,
    color: "sky",
    description: "deletion causing frame shift",
  },
  {
    label: "Frameshift substitution",
    pattern: /(frameshift substitution)/i,
    color: "yellow",
    description: "substitution causing frame shift",
  },
  {
    label: "Nonframeshift insertion",
    pattern: /(nonframeshift insertion)/i,
    color: "teal",
    description: "insertion preserving frame",
  },
  {
    label: "Nonframeshift deletion",
    pattern: /(nonframeshift deletion)/i,
    color: "cyan",
    description: "deletion preserving frame",
  },
  {
    label: "Nonframeshift substitution",
    pattern: /(nonframeshift substitution)/i,
    color: "lime",
    description: "substitution preserving frame",
  },
  {
    label: "Unknown",
    pattern: /(unknown)/i,
    color: "indigo",
    description: "unknown impact",
  },
];

const CAGE_PROMOTER_CATEGORIES: CategoryItem[] = [
  {
    label: "Yes",
    pattern: /.+/,
    color: "green",
    description: "variant overlaps with CAGE promoter site",
  },
  {
    label: "No",
    pattern: "NO",
    color: "red",
    description: "variant does not overlap with CAGE promoter site",
  },
];

const CAGE_ENHANCER_CATEGORIES: CategoryItem[] = [
  {
    label: "Yes",
    pattern: /.+/,
    color: "green",
    description: "variant overlaps with CAGE enhancer site",
  },
  {
    label: "No",
    pattern: "NO",
    color: "red",
    description: "variant does not overlap with CAGE enhancer site",
  },
];

export const functionalClassConfig = helper.group(
  "functional-class",
  "Functional Class",
  [
    helper.accessor("genecode_comprehensive_info", {
      header: "Genecode Comprehensive Info",
      description:
        "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)",
    }),
    helper.accessor("genecode_comprehensive_category", {
      header: "Genecode Comprehensive Category",
      description: renderCategoryDescription(
        <p>
          Identify whether variants cause protein coding changes using Gencode
          genes definition systems, it will label the gene name of the
          variants has impact, if it is intergenic region, the nearby gene
          name will be labeled in the annotation. (Frankish et al., 2018;
          Harrow et al., 2012)
        </p>,
        GENECODE_COMPREHENSIVE_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(GENECODE_COMPREHENSIVE_CATEGORIES),
        "amber",
      ),
    }),
    helper.accessor("genecode_comprehensive_exonic_info", {
      header: "Genecode Comprehensive Exonic Info",
      description:
        "Identify variants cause protein coding changes using Gencode genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes. (Frankish et al., 2018; Harrow et al., 2012)",
      cell: helper.format.custom((val) => <GencodeExonicInfo value={val} />),
    }),
    helper.accessor("genecode_comprehensive_exonic_category", {
      header: "Genecode Comprehensive Exonic Category",
      description: renderCategoryDescription(
        <p>
          Identify variants impact using Gencode exonic definition, and only
          label exonic categorical information like, synonymous,
          non-synonymous, frame-shifts indels, etc. (Frankish et al., 2018;
          Harrow et al., 2012)
        </p>,
        GENECODE_EXONIC_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(GENECODE_EXONIC_CATEGORIES),
      ),
    }),

    helper.accessor("cage_promoter", {
      header: "CAGE Promoter",
      description: renderCategoryDescription(
        <p>
          CAGE defined promoter sites from Fantom 5. (Forrest et al., 2014)
        </p>,
        CAGE_PROMOTER_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(CAGE_PROMOTER_CATEGORIES),
        "gray",
        (val) => (val && val !== "NO" ? "YES" : "NO"),
        "NO",
      ),
    }),
    helper.accessor("cage_enhancer", {
      header: "CAGE Enhancer",
      description: renderCategoryDescription(
        <p>
          CAGE defined enhancer sites from Fantom 5. (Forrest et al., 2014)
        </p>,
        CAGE_ENHANCER_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(CAGE_ENHANCER_CATEGORIES),
        "gray",
        (val) => (val && val !== "NO" ? "YES" : "NO"),
        "NO",
      ),
    }),
    helper.accessor("genehancer", {
      header: "GeneHancer",
      description:
        "Predicted human enhancer sites from the GeneHancer database. (Fishilevich et al., 2017)",
      cell: helper.format.custom((val) => {
        if (!val) return "-";

        // Parse semicolon-separated key=value pairs
        const pairs = val.split(";").map(p => p.trim());
        const entries: Array<{ gene: string; score: string }> = [];

        let currentGene = "";
        pairs.forEach(pair => {
          const [key, value] = pair.split("=").map(s => s.trim());
          if (key === "connected_gene") {
            currentGene = value;
          } else if (key === "score" && currentGene) {
            entries.push({ gene: currentGene, score: value });
            currentGene = "";
          }
        });

        const limit = 3;
        const visibleEntries = entries.slice(0, limit);
        const hiddenEntries = entries.slice(limit);

        const renderEntry = (entry: { gene: string; score: string }, idx: number) => (
          <div key={idx} className="flex items-center gap-2 py-0.5">
            <span className="font-semibold">{entry.gene}</span>
            <span className="text-muted-foreground">Score: {entry.score}</span>
          </div>
        );

        if (hiddenEntries.length === 0) {
          return <div className="space-y-1">{visibleEntries.map(renderEntry)}</div>;
        }

        return (
          <Collapsible>
            <div className="space-y-1">
              {visibleEntries.map(renderEntry)}
            </div>
            <CollapsibleContent>
              <div className="space-y-1 mt-1">
                {hiddenEntries.map((entry, idx) =>
                  renderEntry(entry, idx + limit),
                )}
              </div>
            </CollapsibleContent>
            <CollapsibleTrigger className="mt-2 text-blue-600 hover:text-blue-800 underline underline-offset-2">
              Show {hiddenEntries.length} more
            </CollapsibleTrigger>
          </Collapsible>
        );
      }),
    }),
    helper.accessor("super_enhancer", {
      header: "Super Enhancer",
      description:
        "Predicted super-enhancer sites and targets in a range of human cell types. (Hnisz et al., 2013)",
      cell: helper.format.custom((val) => {
        if (!val) return "-";
        return (
          <div className="font-mono">{val.replace(/,/g, ", ")}</div>
        );
      }),
    }),
    helper.accessor("ucsc_info", {
      header: "UCSC Info",
      description:
        "Identify whether variants cause protein coding changes using UCSC genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
      cell: helper.format.custom((val) => {
        if (!val) return "-";
        const transcripts = val.split(",").map((t) => t.trim());
        return (
          <div className="flex flex-wrap gap-1.5">
            {transcripts.map((transcript, idx) => (
              <ExternalLink
                key={idx}
                href={`https://www.ensembl.org/Homo_sapiens/Transcript/Summary?t=${transcript}`}
                className="font-mono"
              >
                {transcript}
              </ExternalLink>
            ))}
          </div>
        );
      }),
    }),
    helper.accessor("ucsc_exonic_info", {
      header: "UCSC Exonic Info",
      description:
        "Identify variants cause protein coding changes using UCSC genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      cell: helper.format.custom((val) => {
        if (!val) return "-";
        const items = val.split(",").map((item) => item.trim());
        const changes = new Map<string, { protein: string; exons: Set<string> }>();
        items.forEach((item) => {
          const parts = item.split(":");
          const protein = parts.find((p) => p.startsWith("p."));
          const exon = parts.find((p) => p.includes("exon"));
          if (!protein) return;
          if (!changes.has(protein)) changes.set(protein, { protein, exons: new Set() });
          if (exon) changes.get(protein)!.exons.add(exon.replace("exon", ""));
        });
        if (changes.size === 0) return <span className="text-xs text-gray-500">-</span>;
        return (
          <div className="text-xs">
            <div className="text-gray-500 text-[11px] mb-1">Protein changes:</div>
            <div className="space-y-0.5">
              {Array.from(changes.values()).map((item, index) => (
                <div key={index} className="flex items-baseline gap-1.5 text-gray-700">
                  <span className="font-mono font-medium text-gray-900">{item.protein}</span>
                  {item.exons.size > 0 && (
                    <span className="text-gray-500">in exon {Array.from(item.exons).join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }),
    }),
    helper.accessor("refseq_info", {
      header: "RefSeq Info",
      description:
        "Identify whether variants cause protein coding changes using RefSeq genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
      cell: helper.format.custom((val) => {
        if (!val) return "-";
        const transcripts = val.split(",").map((t) => t.trim());
        return (
          <div className="flex flex-wrap gap-1.5">
            {transcripts.map((transcript, idx) => (
              <ExternalLink key={idx} href={`https://www.ncbi.nlm.nih.gov/nuccore/${transcript}`} className="text-xs font-mono">
                {transcript}
              </ExternalLink>
            ))}
          </div>
        );
      }),
    }),
    helper.accessor("refseq_exonic_info", {
      header: "RefSeq Exonic Info",
      description:
        "Identify variants cause protein coding changes using RefSeq genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      cell: helper.format.custom((val) => {
        if (!val) return "-";
        const items = val.split(",").map((item) => item.trim());
        const changes = new Map<string, { protein: string; exons: Set<string> }>();
        items.forEach((item) => {
          const parts = item.split(":");
          const protein = parts.find((p) => p.startsWith("p."));
          const exon = parts.find((p) => p.includes("exon"));
          if (!protein) return;
          if (!changes.has(protein)) changes.set(protein, { protein, exons: new Set() });
          if (exon) changes.get(protein)!.exons.add(exon.replace("exon", ""));
        });
        if (changes.size === 0) return <span className="text-xs text-gray-500">-</span>;
        return (
          <div className="text-xs">
            <div className="text-gray-500 text-[11px] mb-1">Protein changes:</div>
            <div className="space-y-0.5">
              {Array.from(changes.values()).map((item, index) => (
                <div key={index} className="flex items-baseline gap-1.5 text-gray-700">
                  <span className="font-mono font-medium text-gray-900">{item.protein}</span>
                  {item.exons.size > 0 && (
                    <span className="text-gray-500">in exon {Array.from(item.exons).join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }),
    }),
  ],
);
