import { ExternalLink } from "@/components/ui/external-link";
import {
  annotationMap,
  isValidNumber,
  isValidString,
  roundNumber,
  safeCellRenderer,
  splitText,
} from "@/lib/annotations/helpers";
import type { VariantColumnsType } from "@/lib/annotations/types";
import {
  alphamissenseCCODE,
  cageEnhancerCCode,
  cagePromoterCCode,
  ccreAnnotationCCode,
  epigeneticsCCode,
  filterValueCCode,
  genecodeCompExonicCategoryCCode,
  genecodeComprehensiveCategoryCCode,
  metasvmPredCCode,
  polyphenCCode,
} from "@/lib/utils/colors";
// import type { CV2FTissueScore } from "@/lib/variant/tissue/helpers";
// import { ccreAnnotationMap } from "@/components/features/ccre/lib/annotations";

export const variantSummaryColumns: VariantColumnsType[] = [
  {
    name: "Basic",
    slug: "basic",
    items: [
      {
        key: 1,
        header: "Variant",
        accessor: "variant_vcf",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span>{str}</span>,
            isValidString,
          );
        },
        tooltip:
          "The unique identifier of the given variant, Reported as chr-pos-ref-alt format.",
      },
      {
        key: 2,
        header: "rsID",
        accessor: "rsid",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => (
              <ExternalLink href={`https://www.ncbi.nlm.nih.gov/snp/${str}`}>
                {str}
              </ExternalLink>
            ),
            isValidString,
          );
        },
        tooltip: "The rsID of the given variant (if exists).",
      },
      {
        key: 3,
        header: "TOPMed QC Status",
        accessor: "filter_status",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              switch (str) {
                case "PASS":
                  return (
                    <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-label-md font-medium leading-5 text-green-900">
                      Pass
                    </span>
                  );
                case "FAIL":
                  return (
                    <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-label-md font-medium leading-5 text-red-900">
                      Fail
                    </span>
                  );
                default:
                  return undefined;
              }
            },
            isValidString,
          );
        },
        tooltip: "TOPMed QC status of the given variant.",
      },
      {
        key: 4,
        header: "TOPMed Bravo AF",
        accessor: "bravo_af",
        tooltip: `TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed
      Consortium, 2018; Taliun et al., 2019)`,
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{num}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "Total GNOMAD AF",
        accessor: "af_total",
        tooltip:
          "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "All 1000 Genomes AF",
        accessor: "tg_all",
        tooltip:
          "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data).",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
    ],
  },
  {
    name: "Category",
    slug: "category",
    items: [
      {
        key: 1,
        header: "Genecode Comprehensive Info",
        accessor: "genecode_comprehensive_info",
        tooltip:
          "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)",
      },
      {
        key: 2,
        header: "Genecode Comprehensive Category",
        accessor: "genecode_comprehensive_category",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <div>{genecodeComprehensiveCategoryCCode(str)}</div>,
            isValidString,
          );
        },
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-stone-300 rounded"></span>
                <strong>Exonic:</strong> within protein-coding regions
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-300 rounded"></span>
                <strong>UTR:</strong> untranslated regions
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-lime-300 rounded"></span>
                <strong>Intronic:</strong> within gene introns
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-300 rounded"></span>
                <strong>Downstream:</strong> downstream of genes
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-300 rounded"></span>
                <strong>Upstream:</strong> upstream of genes
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-cyan-300 rounded"></span>
                <strong>Intergenic:</strong> between genes
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-300 rounded"></span>
                <strong>Splicing:</strong> affecting splice sites
              </div>
            </div>
          </div>
        ),
      },

      {
        key: 4,
        header: "Genecode Comprehensive Exonic Category",
        accessor: "genecode_comprehensive_exonic_category",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <div>{genecodeCompExonicCategoryCCode(str)}</div>,
            isValidString,
          );
        },
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Identify variants impact using Gencode exonic definition, and only label exonic categorical information like, synonymous, non-synonymous, frame-shifts indels, etc. (Frankish et al., 2018; Harrow et al., 2012)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-stone-300 rounded"></span>
                <strong>Stopgain:</strong> introduces stop codon
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-300 rounded"></span>
                <strong>Stoploss:</strong> removes stop codon
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-300 rounded"></span>
                <strong>Nonsynonymous SNV:</strong> changes amino acid
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-300 rounded"></span>
                <strong>Synonymous SNV:</strong> doesn't change amino acid
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-300 rounded"></span>
                <strong>Frameshift insertion:</strong> insertion causing frame shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-300 rounded"></span>
                <strong>Frameshift deletion:</strong> deletion causing frame shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-300 rounded"></span>
                <strong>Frameshift substitution:</strong> substitution causing frame shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-300 rounded"></span>
                <strong>Nonframeshift insertion:</strong> insertion preserving frame
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-cyan-300 rounded"></span>
                <strong>Nonframeshift deletion:</strong> deletion preserving frame
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-lime-300 rounded"></span>
                <strong>Nonframeshift substitution:</strong> substitution preserving frame
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 5,
        header: "MetaSVM Prediction",
        accessor: "metasvm_pred",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Identify whether the variant is a disruptive missense variant, defined as "disruptive" by the ensemble MetaSVM annotation. (Dong et al., 2014)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>D (Deleterious):</strong> likely to affect protein function
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>T (Tolerated):</strong> unlikely to affect protein function
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => metasvmPredCCode(str),
            isValidString,
          );
        },
      },
      {
        key: 6,
        header: "CAGE Promoter",
        accessor: "cage_promoter",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              CAGE defined promoter sites from Fantom 5. (Forrest et al., 2014)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>Yes:</strong> variant overlaps with CAGE promoter site
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>No:</strong> variant does not overlap with CAGE promoter site
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span>{cagePromoterCCode(str)}</span>,
            isValidString,
          );
        },
      },
      {
        key: 7,
        header: "CAGE Enhancer",
        accessor: "cage_enhancer",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              CAGE defined enhancer sites from Fantom 5. (Forrest et al., 2014)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>Yes:</strong> variant overlaps with CAGE enhancer site
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>No:</strong> variant does not overlap with CAGE enhancer site
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span>{cageEnhancerCCode(str)}</span>,
            isValidString,
          );
        },
      },
      {
        key: 8,
        header: "GeneHancer",
        accessor: "genehancer",
        tooltip:
          "Predicted human enhancer sites from the GeneHancer database. (Fishilevich et al., 2017)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              const parts = str.split(";").slice(0, 4).join(", ");
              return <span>{parts}</span>;
            },
            isValidString,
          );
        },
      },
      {
        key: 9,
        header: "Super Enhancer",
        accessor: "super_enhancer",
        tooltip:
          "Predicted super-enhancer sites and targets in a range of human cell types. (Hnisz et al., 2013)",
      },
    ],
  },
  {
    name: "Clinvar",
    slug: "clinvar",
    items: [
      {
        key: 1,
        header: "Clinical Significance",
        accessor: "clnsig",
        tooltip:
          "Clinical significance for this single variant. (Landrum et al., 2017, 2013)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              const cleanValue = str.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          );
        },
      },
      {
        key: 2,
        header: "Clinical Significance (genotype includes)",
        accessor: "clnsigincl",
        tooltip:
          "Clinical significance for a haplotype or genotype that includes this variant. Reported as pairs of VariationID:clinical significance. (Landrum et al., 2017, 2013)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              const cleanValue = str.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          );
        },
      },
      {
        key: 3,
        header: "Disease Name",
        accessor: "clndn",
        tooltip:
          "ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              const cleanValue = str.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          );
        },
      },
      {
        key: 4,
        header: "Disease Name (Variant Includes)",
        accessor: "clndnincl",
        tooltip:
          "For included variant: ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              const cleanValue = str.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          );
        },
      },
    ],
  },
  {
    name: "Conservation",
    slug: "conservation",
    items: [
      {
        key: 1,
        header: "aPC-Conservation",
        accessor: "apc_conservation_v2",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Conservation annotation PC: the first PC of the standardized scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More evolutionarily conserved</li>
              <li><strong>Lower scores:</strong> Less evolutionarily conserved</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 2,
        header: "mamPhCons",
        accessor: "mamphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Mammalian phastCons conservation score (excl. human). A higher score means the region is more conserved. PhastCons considers n species rather than two. It considers the phylogeny by which these species are related, and instead of measuring similarity/divergence simply in terms of percent identity. It uses statistical models of nucleotide substitution that allow for multiple substitutions per site and for unequal rates of substitution between different pairs of bases. Range: [0, 1] (default: 0.0). (Siepel et al., 2005)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.8):</strong> More evolutionarily conserved</li>
              <li><strong>Lower scores:</strong> Less evolutionarily conserved</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 0.8) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 3,
        header: "priPhCons",
        accessor: "priphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Primate phastCons:</strong> Conservation score comparing primate species (excluding humans). Uses evolutionary models to identify conserved regions across multiple species. Range: [-10.761, 0.595] (default: -0.029). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;0.3):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Faster evolution than expected</li>
              <li><strong>phastCons:</strong> Models evolutionary pressure across species</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 0.3) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 4,
        header: "verPhCons",
        accessor: "verphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Vertebrate phastCons:</strong> Conservation score comparing vertebrate species (excluding humans). Uses evolutionary models to identify conserved regions across vertebrates. Range: [-20, 11.295] (default: 0.042). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;2):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Faster evolution than expected</li>
              <li><strong>phastCons:</strong> Models evolutionary pressure across species</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 2) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "priPhyloP",
        accessor: "priphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Primate phyloP:</strong> Site-by-site conservation score comparing primate species (excluding humans). Measures evolutionary constraint at individual positions. Range: [-10.761, 0.595] (default: -0.029). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;0.3):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Faster evolution than expected</li>
              <li><strong>phyloP:</strong> Per-site evolutionary constraint analysis</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 0.3) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "mamPhyloP",
        accessor: "mamphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Mammalian phyloP:</strong> Site-by-site conservation score comparing mammalian species (excluding humans). Measures evolutionary constraint at individual positions. Range: [-20, 4.494] (default: -0.005). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;3):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Faster evolution than expected</li>
              <li><strong>phyloP:</strong> Per-site evolutionary constraint analysis</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 3) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 7,
        header: "verPhyloP",
        accessor: "verphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Vertebrate phyloP:</strong> Site-by-site conservation score comparing vertebrate species (excluding humans). Measures evolutionary constraint at individual positions. Range: [-20, 11.295] (default: 0.042). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;8):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Faster evolution than expected</li>
              <li><strong>phyloP:</strong> Per-site evolutionary constraint analysis</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 8) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 8,
        header: "GerpN",
        accessor: "gerp_n",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Neutral evolution score defined by GERP++. A higher score means the region is more conserved. Range: [0, 19.8] (default: 3.0). (Davydov et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More evolutionarily conserved</li>
              <li><strong>Lower scores:</strong> Less evolutionarily conserved</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 9,
        header: "GerpS",
        accessor: "gerp_s",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Rejected Substitution score defined by GERP++. A higher score means the region is more conserved. GERP (Genomic Evolutionary Rate Profiling) identifies constrained elements in multiple alignments by quantifying substitution deficits. These deficits represent substitutions that would have occurred if the element were neutral DNA, but did not occur because the element has been under functional constraint. These deficits are referred to as "Rejected Substitutions". Rejected substitutions are a natural measure of constraint that reflects the strength of past purifying selection on the element. GERP estimates constraint for each alignment column; elements are identified as excess aggregations of constrained columns. Positive scores (fewer than expected) indicate that a site is under evolutionary constraint. Negative scores may be weak evidence of accelerated rates of evolution. Range: [-39.5, 19.8] (default: -0.2). (Davydov et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher positive scores (&gt;10):</strong> More evolutionarily conserved</li>
              <li><strong>Negative scores:</strong> Accelerated evolution</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num > 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
    ],
  },
  {
    name: "Epigenetics",
    slug: "epigenetics",
    items: [
      {
        key: 1,
        header: "aPC Epigenetics Active",
        accessor: "apc_epigenetics_active",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Active:</strong> Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Associated with gene expression and regulatory activity</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More active chromatin state</li>
              <li><strong>Lower scores:</strong> Less active chromatin state</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 2,
        header: "aPC Epigenetics Repressed",
        accessor: "apc_epigenetics_repressed",
        activity: epigeneticsCCode("Repressed"),
        tooltip:
          'Repressed Epigenetic annotation PC: the first PC of the standardized scores of "EncodeH3K9me3.max, EncodeH3K27me3.max" in PHRED scale. Range: [0, 86.238]. (Li et al., 2020)',
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 3,
        header: "aPC Epigenetics Transcription",
        accessor: "apc_epigenetics_transcription",
        activity: epigeneticsCCode("Transcription"),
        tooltip:
          'Transcription Epigenetic annotation PC: the first PC of the standardized scores of "EncodeH3K36me3.max, EncodeH3K79me2.max" in PHRED scale. Range: [0, 86.238]. (Li et al., 2020)',
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 4,
        header: "DNase",
        accessor: "encode_dnase_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>DNase:</strong> DNase-seq measures chromatin accessibility by identifying regions where DNA is accessible to DNase I enzyme. Range: [0.001, 118672] (default: 0.0). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Open chromatin regions</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥0.437):</strong> More accessible chromatin, likely regulatory regions</li>
              <li><strong>Lower levels:</strong> Less accessible chromatin, compact chromatin structure</li>
              <li><strong>Biological significance:</strong> DNase hypersensitivity indicates active regulatory elements</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.437) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "H3K27ac",
        accessor: "encodeh3k27ac_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K27ac:</strong> Histone H3 lysine 27 acetylation mark, a key indicator of active enhancers and promoters. Range: [0.013, 288.608] (default: 0.36). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Active enhancers and promoters</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥7.82):</strong> Strong enhancer activity, active gene regulation</li>
              <li><strong>Lower levels:</strong> Weaker enhancer activity or inactive regulatory regions</li>
              <li><strong>Biological role:</strong> Distinguishes active enhancers from poised/inactive ones</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 7.82) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "H3K4me1",
        accessor: "encodeh3k4me1_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me1:</strong> Histone H3 lysine 4 monomethylation mark, commonly found at enhancer regions and regulatory elements. Range: [0.015, 91.954] (default: 0.37). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Enhancer regions</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥5):</strong> Strong enhancer signature, active regulatory regions</li>
              <li><strong>Lower levels:</strong> Weaker enhancer activity or non-regulatory regions</li>
              <li><strong>Biological role:</strong> Marks both active and poised enhancers</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 5) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 7,
        header: "H3K4me2",
        accessor: "encodeh3k4me2_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me2:</strong> Histone H3 lysine 4 dimethylation mark, associated with active promoters and transcriptional start sites. Range: [0.024, 148.887] (default: 0.37). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Active promoters</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.543):</strong> Active promoter regions, ongoing transcription</li>
              <li><strong>Lower levels:</strong> Inactive or weakly active promoters</li>
              <li><strong>Biological role:</strong> Marks active transcriptional start sites</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.543) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 8,
        header: "H3K4me3",
        accessor: "encodeh3k4me3_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me3:</strong> Histone H3 lysine 4 trimethylation mark, the classical marker of active promoters and transcriptional start sites. Range: [0.012, 239.512] (default: 0.38). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Active promoters</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.77):</strong> Highly active promoters, strong transcriptional activity</li>
              <li><strong>Lower levels:</strong> Inactive or weakly active promoters</li>
              <li><strong>Biological role:</strong> Most reliable marker of active gene promoters</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.77) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 9,
        header: "H3K9ac",
        accessor: "encodeh3k9ac_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K9ac:</strong> Histone H3 lysine 9 acetylation mark, associated with transcriptionally active chromatin and gene expression. Range: [0.019, 281.187] (default: 0.41). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Active transcription</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.13):</strong> Active transcriptional regions, open chromatin</li>
              <li><strong>Lower levels:</strong> Transcriptionally inactive regions</li>
              <li><strong>Biological role:</strong> Generally associated with active gene expression</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.13) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 10,
        header: "H4k20me1",
        accessor: "encodeh4k20me1_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H4K20me1:</strong> Histone H4 lysine 20 monomethylation mark, associated with active chromatin and transcriptional activity. Range: [0.054, 73.230] (default: 0.47). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Active chromatin</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.57):</strong> Active chromatin regions, transcriptional competence</li>
              <li><strong>Lower levels:</strong> Less active chromatin states</li>
              <li><strong>Biological role:</strong> Generally marks active, accessible chromatin</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.57) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 11,
        header: "H2AFZ",
        accessor: "encodeh2afz_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H2AFZ:</strong> Histone H2A variant (H2A.Z), associated with nucleosome instability, transcriptional regulation, and active chromatin regions. Range: [0.031, 96.072] (default: 0.42). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
              <span className="text-xs text-muted-foreground">Nucleosome dynamics</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.19):</strong> Dynamic nucleosome regions, regulatory activity</li>
              <li><strong>Lower levels:</strong> More stable nucleosome positioning</li>
              <li><strong>Biological role:</strong> Facilitates transcriptional regulation and chromatin remodeling</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.19) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 12,
        header: "H3K9me3",
        accessor: "encodeh3k9me3_sum",
        activity: epigeneticsCCode("Repressed"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K9me3:</strong> Histone H3 lysine 9 trimethylation mark, a key marker of constitutive heterochromatin and gene silencing. Range: [0.011, 58.712] (default: 0.38). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">Repressed</span>
              <span className="text-xs text-muted-foreground">Constitutive heterochromatin</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.77):</strong> Strong gene silencing, heterochromatin formation</li>
              <li><strong>Lower levels:</strong> Less repressive chromatin state</li>
              <li><strong>Biological role:</strong> Maintains long-term gene silencing and chromosomal stability</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.77) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 13,
        header: "H3K27me3",
        accessor: "encodeh3k27me3_sum",
        activity: epigeneticsCCode("Repressed"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K27me3:</strong> Histone H3 lysine 27 trimethylation mark, associated with Polycomb-mediated gene repression and developmental gene silencing. Range: [0.014, 87.122] (default: 0.47). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">Repressed</span>
              <span className="text-xs text-muted-foreground">Polycomb repression</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥4.1):</strong> Strong Polycomb repression, silenced developmental genes</li>
              <li><strong>Lower levels:</strong> Less repressive or actively transcribed regions</li>
              <li><strong>Biological role:</strong> Maintains cell type-specific gene expression patterns</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 4.1) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 14,
        header: "H3K36me3",
        accessor: "encodeh3k36me3_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K36me3:</strong> Histone H3 lysine 36 trimethylation mark, specifically associated with actively transcribed gene bodies and RNA polymerase II elongation. Range: [0.009, 56.176] (default: 0.39). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">Transcription</span>
              <span className="text-xs text-muted-foreground">Active gene bodies</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.79):</strong> Actively transcribed gene bodies, ongoing RNA synthesis</li>
              <li><strong>Lower levels:</strong> Less active or non-transcribed regions</li>
              <li><strong>Biological role:</strong> Marks regions of active transcriptional elongation</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.79) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 15,
        header: "H3K79me2",
        accessor: "encodeh3k79me2_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K79me2:</strong> Histone H3 lysine 79 dimethylation mark, associated with transcriptionally active chromatin and gene body regions. Range: [0.015, 118.706] (default: 0.34). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">Transcription</span>
              <span className="text-xs text-muted-foreground">Active transcription</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥3.49):</strong> Transcriptionally active regions, ongoing gene expression</li>
              <li><strong>Lower levels:</strong> Less active transcriptional states</li>
              <li><strong>Biological role:</strong> Correlates with active RNA polymerase II transcription</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3.49) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 16,
        header: "totalRNA",
        accessor: "encodetotal_rna_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>totalRNA:</strong> Total RNA-seq signal measuring RNA transcription levels across both DNA strands. Range: [0, 92282.7] (default: 0.0). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">Transcription</span>
              <span className="text-xs text-muted-foreground">RNA synthesis activity</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher levels (≥0.1):</strong> Active RNA synthesis, ongoing transcription</li>
              <li><strong>Lower levels:</strong> Minimal or no transcriptional activity</li>
              <li><strong>Biological role:</strong> Direct measure of transcriptional output</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.1) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
    ],
  },
  {
    name: "Integrative",
    slug: "integrative",
    items: [
      {
        key: 1,
        header: "aPC-Protein Function",
        accessor: "apc_protein_function_v3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Protein Function:</strong> Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More likely to affect protein function</li>
              <li><strong>Lower scores:</strong> Less likely to affect protein function</li>
              <li><strong>PHRED scale:</strong> Higher values indicate stronger evidence</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 2,
        header: "aPC-Conservation",
        accessor: "apc_conservation_v2",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Conservation annotation PC: the first PC of the standardized scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More evolutionarily conserved</li>
              <li><strong>Lower scores:</strong> Less evolutionarily conserved</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 3,
        header: "aPC-Epigenetics Active",
        accessor: "apc_epigenetics_active",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Active:</strong> Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More active chromatin state</li>
              <li><strong>Lower scores:</strong> Less active chromatin state</li>
              <li><strong>Active marks:</strong> Associated with gene expression and regulatory activity</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 4,
        header: "aPC-Epigenetics Repressed",
        accessor: "apc_epigenetics_repressed",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Repressed:</strong> Integrative score combining repressive chromatin marks (H3K9me3, H3K27me3) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More repressed chromatin state</li>
              <li><strong>Lower scores:</strong> Less repressed chromatin state</li>
              <li><strong>Repressive marks:</strong> Associated with gene silencing and heterochromatin</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "aPC-Epigenetics Transcription",
        accessor: "apc_epigenetics_transcription",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Transcription:</strong> Integrative score combining transcription-associated chromatin marks (H3K36me3, H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More transcriptionally active chromatin</li>
              <li><strong>Lower scores:</strong> Less transcriptionally active chromatin</li>
              <li><strong>Transcription marks:</strong> Associated with active gene transcription</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "aPC-Local Nucleotide Diversity",
        accessor: "apc_local_nucleotide_diversity_v3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Local Nucleotide Diversity:</strong> Integrative score combining local genetic diversity measures (background selection statistic, recombination rate, nucleotide diversity) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> Higher local genetic diversity</li>
              <li><strong>Lower scores:</strong> Lower local genetic diversity</li>
              <li><strong>Diversity context:</strong> Reflects evolutionary and recombination patterns</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 7,
        header: "aPC-Mutation Density",
        accessor: "apc_mutation_density",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mutation Density:</strong> Integrative score combining mutation densities at different scales (100bp, 1kb, 10kb windows) for common, rare, and singleton variants into a single PHRED-scaled score. Range: [0, 84.477]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> Higher local mutation density</li>
              <li><strong>Lower scores:</strong> Lower local mutation density</li>
              <li><strong>Density context:</strong> Reflects mutational burden in genomic region</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 8,
        header: "aPC-Transcription Factor",
        accessor: "apc_transcription_factor",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Transcription Factor:</strong> Integrative score combining transcription factor binding evidence (ReMap TF overlap, ReMap cell line overlap) into a single PHRED-scaled score. Range: [1.185, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More transcription factor binding evidence</li>
              <li><strong>Lower scores:</strong> Less transcription factor binding evidence</li>
              <li><strong>TF binding:</strong> Indicates regulatory potential</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 9,
        header: "aPC-Mappability",
        accessor: "apc_mappability",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mappability:</strong> Integrative score combining sequence mappability measures at different read lengths (k=24, 36, 50, 100) for unique and multi-mapping reads into a single PHRED-scaled score. Range: [0.007, 22.966]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> Better sequence mappability</li>
              <li><strong>Lower scores:</strong> Poorer sequence mappability</li>
              <li><strong>Mappability:</strong> Affects sequencing read alignment quality</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 10,
        header: "CADD phred",
        accessor: "cadd_phred",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The CADD score in PHRED scale (integrative score). A higher CADD score indicates more deleterious. Range: [0.001, 84]. (Kircher et al., 2014; Rentzsch et al., 2018)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More likely deleterious</li>
              <li><strong>Lower scores:</strong> More likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 11,
        header: "LINSIGHT",
        accessor: "linsight",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The LINSIGHT score (integrative score). A higher LINSIGHT score indicates more functionality. Range: [0.033, 0.995]. (Huang et al., 2017)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.5):</strong> More likely functional</li>
              <li><strong>Lower scores:</strong> Less likely functional</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.5) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
    ],
  },
  {
    name: "Protein Function",
    slug: "protein-function",
    items: [
      {
        key: 1,
        header: "aPC-Protein Function",
        accessor: "apc_protein_function_v3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Protein Function:</strong> Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;10):</strong> More likely to affect protein function</li>
              <li><strong>Lower scores:</strong> Less likely to affect protein function</li>
              <li><strong>PHRED scale:</strong> Higher values indicate stronger evidence</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 10) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 2,
        header: "PolyPhenCat",
        accessor: "polyphen_cat",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>PolyPhen category of change. (Adzhubei et al., 2010)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>Probably Damaging:</strong> likely to affect protein function
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-300 rounded"></span>
                <strong>Possibly Damaging:</strong> may affect protein function
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>Benign:</strong> likely to have no functional impact
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-stone-300 rounded"></span>
                <strong>Unknown:</strong> insufficient data for prediction
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <div>{polyphenCCode(str.split("_").join(" "))}</div>,
            isValidString,
          );
        },
      },
      {
        key: 3,
        header: "PolyPhenVal",
        accessor: "polyphen_val",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              PolyPhen score: It predicts the functional significance of an allele replacement from its individual features. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.8):</strong> More likely damaging</li>
              <li><strong>Lower scores:</strong> More likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 4,
        header: "PolyPhen2 HDIV",
        accessor: "polyphen2_hdiv_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PolyPhen2 HumDiv:</strong> Predicts amino acid substitution impact on protein structure and function. Trained on Mendelian disease variants vs. evolutionarily divergent variants from close mammalian species. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.8):</strong> More likely damaging</li>
              <li><strong>Lower scores:</strong> More likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.8) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "PolyPhen2 HVAR",
        accessor: "polyphen2_hvar_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PolyPhen2 HumVar:</strong> Predicts amino acid substitution impact on protein structure and function. Trained on human disease variants vs. common polymorphisms (MAF ≥1%) with no known disease association. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.8):</strong> More likely damaging</li>
              <li><strong>Lower scores:</strong> More likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.8) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "Grantham",
        accessor: "grantham",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Grantham Score:</strong> Measures evolutionary distance between original and new amino acids based on chemical properties (polarity, molecular volume, composition). Higher scores indicate greater chemical difference and potential functional impact. Range: [0, 215] (default: 0). (Grantham, 1974)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;100):</strong> Greater chemical difference, more deleterious</li>
              <li><strong>Lower scores:</strong> Less chemical difference, more tolerated</li>
              <li><strong>Thresholds:</strong> Conservative (0-50), moderate (51-100), radical (&gt;100)</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 100) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 7,
        header: "Mutation Taster",
        accessor: "mutation_taster_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              MutationTaster is a free web-based application to evaluate DNA sequence variants for their disease-causing potential. The software performs a battery of in silico tests to estimate the impact of the variant on the gene product/protein. Range: [0, 1] (default: 0). (Schwarz et al., 2014)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;0.8):</strong> More likely disease-causing</li>
              <li><strong>Lower scores:</strong> More likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.8) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 8,
        header: "Mutation Assessor",
        accessor: "mutation_assessor_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Predicts the functional impact of amino-acid substitutions in proteins, such as mutations discovered in cancer or missense polymorphisms. Range: [-5.135, 6.125] (default: -5.545). (Reva et al., 2011)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher scores (&gt;3):</strong> More likely functional impact</li>
              <li><strong>Lower scores:</strong> Less likely functional impact</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 3) return <span>{roundNumber(num)}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
      },
      {
        key: 9,
        header: "SIFTcat",
        accessor: "sift_cat",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>SIFT category of change. (Ng and Henikoff, 2003)</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-red-300 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Deleterious:</strong> likely to affect protein function
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-red-200 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Deleterious (Low Confidence):</strong> may affect protein function
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-green-300 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Tolerated:</strong> likely to have no functional impact
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-green-200 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Tolerated (Low Confidence):</strong> may have no functional impact
                </div>
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => {
              if (str.match(/deleterious.*low.*confidence/i)) {
                return (
                  <span className="inline-flex rounded-full bg-red-200 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-red-800">
                    Deleterious - Low Confidence
                  </span>
                );
              } else if (str.match(/(deleterious)/i)) {
                return (
                  <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-red-900">
                    Deleterious
                  </span>
                );
              } else if (str.match(/tolerated.*low.*confidence/i)) {
                return (
                  <span className="inline-flex rounded-full bg-green-200 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-green-800">
                    Tolerated - Low Confidence
                  </span>
                );
              } else if (str.match(/(tolerated)/i)) {
                return (
                  <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-green-900">
                    Tolerated
                  </span>
                );
              }
              return undefined;
            },
            isValidString,
          );
        },
      },
      {
        key: 10,
        header: "SIFTval",
        accessor: "sift_val",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => {
              if (num >= 0.0 && num <= 0.05) return <span>{num}</span>;
              return undefined;
            },
            isValidNumber,
          );
        },
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated). Range: [0, 1] (default: 1). (Ng and Henikoff, 2003)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Lower scores (0.0-0.05):</strong> More likely deleterious</li>
              <li><strong>Higher scores (&gt;0.05):</strong> More likely tolerated</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    name: "Mutation Rate",
    slug: "mutation-rate",
    items: [
      {
        key: 1,
        header: "Filter value",
        accessor: "filter_value",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => filterValueCCode(str),
            isValidString,
          );
        },
        tooltip: (
          <div className="space-y-3 text-left">
            <p>
              <strong>Filter Value:</strong> Quality assessment categories for genomic regions based on various sequencing and genomic metrics.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 bg-red-300 rounded flex-shrink-0 mt-0.5"></span>
                <div>
                  <strong>Low:</strong>
                  <div className="mt-1">Low quality regions determined by gnomAD sequencing metrics:</div>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                    <li>Mappability &lt; 0.5</li>
                    <li>Overlap with &gt;50nt simple repeat</li>
                    <li>ReadPosRankSum &gt; 1</li>
                    <li>0 SNVs in 100bp window</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 bg-amber-300 rounded flex-shrink-0 mt-0.5"></span>
                <div>
                  <strong>SFS_bump:</strong>
                  <div className="mt-1">Pentamer context with abnormal site frequency spectrum (SFS). High-frequency SNVs [0.0005 &lt; MAF ≤ 0.2] exceed 1.5× mutation rate controlled average. Often repetitive contexts.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 bg-blue-300 rounded flex-shrink-0 mt-0.5"></span>
                <div>
                  <strong>TFBS:</strong>
                  <div className="mt-1">Transcription factor binding site determined by overlap with ChIP-seq peaks</div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 2,
        header: "PN",
        accessor: "pn",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span className="font-mono uppercase">{str}</span>,
            isValidString,
          );
        },
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PN (Pentanucleotide):</strong> The 5-nucleotide sequence context surrounding the variant position, important for understanding mutation patterns and rates.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Context dependency:</strong> Mutation rates vary significantly based on surrounding nucleotide sequence</li>
              <li><strong>Format:</strong> 5-base sequence with variant position in center</li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "MR",
        accessor: "mr",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>MR (Mutation Rate):</strong> Roulette mutation rate estimate based on sequence context and evolutionary patterns.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher rates:</strong> More mutagenic sequence contexts</li>
              <li><strong>Lower rates:</strong> More stable sequence contexts</li>
              <li><strong>Application:</strong> Helps distinguish pathogenic variants from benign polymorphisms</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 4,
        header: "AR",
        accessor: "ar",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>AR (Adjusted Rate):</strong> Adjusted Roulette mutation rate estimate that accounts for additional genomic factors beyond basic sequence context.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Higher rates:</strong> Contexts prone to higher mutation frequency</li>
              <li><strong>Lower rates:</strong> More evolutionarily stable regions</li>
              <li><strong>Adjustment factors:</strong> Incorporates chromatin structure and replication timing</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 5,
        header: "MG",
        accessor: "mg",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>MG (gnomAD Rate):</strong> Mutation rate estimate from the gnomAD consortium based on large-scale population genomic data. (Karczewski et al. 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Population-based:</strong> Derived from analysis of &gt;140,000 genomes and exomes</li>
              <li><strong>Higher rates:</strong> Regions with elevated mutation burden</li>
              <li><strong>Clinical relevance:</strong> Helps calibrate variant interpretation frameworks</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
      {
        key: 6,
        header: "MC",
        accessor: "mc",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>MC (Carlson Rate):</strong> Mutation rate estimate from Carlson et al. based on de novo mutation patterns in families. (Carlson et al. 2018)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>De novo focus:</strong> Based on analysis of new mutations in parent-offspring trios</li>
              <li><strong>Higher rates:</strong> Sequence contexts with increased de novo mutation frequency</li>
              <li><strong>Complementary approach:</strong> Provides independent validation of mutation rate patterns</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
      },
    ],
  },
  {
    name: "cCRE",
    slug: "ccre",
    items: [
      {
        key: 1,
        header: "Annotations",
        accessor: "annotations",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The cell type-specific regulatory elements (cCREs) that overlap with the variant. (Moore et al., 2020)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>PLS:</strong> Promoter-like signatures
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-300 rounded"></span>
                <strong>pELS:</strong> Proximal enhancer-like signatures
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-300 rounded"></span>
                <strong>dELS:</strong> Distal enhancer-like signatures
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-300 rounded"></span>
                <strong>CA-CTCF:</strong> CTCF-bound chromatin accessible
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-300 rounded"></span>
                <strong>CTCF-Bound:</strong> CTCF binding sites
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>CA:</strong> Chromatin accessible
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-300 rounded"></span>
                <strong>CA-TF:</strong> Transcription factor bound chromatin accessible
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-300 rounded"></span>
                <strong>TF:</strong> Transcription factor binding sites
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-300 rounded"></span>
                <strong>DNase-H3K4me3:</strong> DNase accessible with H3K4me3
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-300 rounded"></span>
                <strong>CA-H3K4me3:</strong> Chromatin accessible with H3K4me3
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => (
              <div className="normal-case cursor-pointer">
                {ccreAnnotationCCode(annotationMap[str], str)}
              </div>
            ),
            isValidString,
          );
        },
      },
      {
        key: 2,
        header: "Accession",
        accessor: "accession",
        tooltip:
          "The unique identifier of the cCRE that overlaps with the variant. (Moore et al., 2020)",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span>{str}</span>,
            isValidString,
          );
        },
      },
    ],
  },
  {
    name: "Alphamissense",
    slug: "alphamissense",
    items: [
      {
        key: 1,
        header: "Protein Variant",
        accessor: "protein_variant",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Amino acid change induced by the alternative allele, in the format:
            </p>
            <p className="font-mono bg-muted/30 px-2 py-1 rounded">
              {"<Reference amino acid><Position><Alternative amino acid>"}
            </p>
            <p>
              <strong>Example:</strong> V2L means Valine at position 2 changed to Leucine
            </p>
            <p>
              Position is 1-based within the protein amino acid sequence.
            </p>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span className="font-mono">{str}</span>,
            isValidString,
          );
        },
      },
      {
        key: 2,
        header: "AM Pathogenicity",
        accessor: "am_pathogenicity",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Calibrated AlphaMissense pathogenicity scores ranging between 0 and 1.
            </p>
            <p>
              <strong>Interpretation:</strong> Can be interpreted as the predicted probability of a variant being clinically pathogenic.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Higher scores = more likely pathogenic</li>
              <li>Lower scores = more likely benign</li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => <span className="font-mono">{str}</span>,
            isValidString,
          );
        },
      },
      {
        key: 3,
        header: "AM Class",
        accessor: "am_class",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Classification of the protein variant into three discrete categories:
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>Likely Benign:</strong> pathogenicity &lt; 0.34
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>Likely Pathogenic:</strong> pathogenicity &gt; 0.564
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-300 rounded"></span>
                <strong>Ambiguous:</strong> pathogenicity between 0.34-0.564
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => (
              <span className="uppercase">
                {alphamissenseCCODE(str.split("_").join(" "))}
              </span>
            ),
            isValidString,
          );
        },
      },
    ],
  },
  // {
  //   name: "Tissue-Specific",
  //   slug: "tissue-specific",
  //   items: [
  //     {
  //       key: 1,
  //       header: "cCRE Element Types",
  //       accessor: "ccre_regulatory_types",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (types: string[]) => {
  //             if (!types || types.length === 0) return undefined;
  //             return (
  //               <div className="space-y-1">
  //                 {types.map((type, idx) => (
  //                   <div key={idx} className="flex items-center gap-2">
  //                     {ccreAnnotationCCode(type, type)}
  //                     <span>
  //                       {ccreAnnotationMap[type] || type}
  //                     </span>
  //                   </div>
  //                 ))}
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is string[] => 
  //             Array.isArray(value) && value.every(t => typeof t === 'string'),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>cCRE Regulatory Types:</strong> Types of candidate cis-regulatory elements this variant overlaps with.
  //           </p>
  //           <div className="space-y-1 text-xs">
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-red-400 rounded"></span>
  //               <strong>PLS:</strong> Promoter-like signatures
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-orange-400 rounded"></span>
  //               <strong>pELS:</strong> Proximal enhancer-like signatures
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-yellow-400 rounded"></span>
  //               <strong>dELS:</strong> Distal enhancer-like signatures
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-blue-400 rounded"></span>
  //               <strong>CA-CTCF:</strong> Chromatin accessible with CTCF
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-green-400 rounded"></span>
  //               <strong>CA:</strong> Chromatin accessible only
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-purple-400 rounded"></span>
  //               <strong>CA-TF:</strong> Chromatin accessible with TF binding
  //             </div>
  //             <div className="flex items-center gap-2">
  //               <span className="w-3 h-3 bg-pink-400 rounded"></span>
  //               <strong>TF:</strong> Transcription factor binding only
  //             </div>
  //           </div>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 3,
  //       header: "ABC Target Genes",
  //       accessor: "abc_target_genes",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (genes: string[]) => {
  //             if (!genes || genes.length === 0) return undefined;
  //             const display = genes.slice(0, 3).join(", ");
  //             const extra = genes.length > 3 ? ` (+${genes.length - 3} more)` : "";
  //             return (
  //               <div className="space-y-1">
  //                 <div className="font-mono">
  //                   <span>{display}</span>
  //                   {extra && (
  //                     <span className="text-xs text-muted-foreground ml-1">
  //                       {extra}
  //                     </span>
  //                   )}
  //                 </div>
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is string[] => 
  //             Array.isArray(value) && value.every(g => typeof g === 'string'),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>ABC Gene Targets:</strong> High-confidence enhancer-gene regulatory predictions from the Activity-by-Contact (ABC) model.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>ABC Score ≥ 0.1:</strong> Detectable regulatory interactions</li>
  //             <li><strong>Predictions:</strong> Based on chromatin accessibility, histone marks, and 3D chromatin contacts</li>
  //             <li><strong>Gene targets:</strong> Genes likely regulated by this variant's position</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 4,
  //       header: "Max ABC Score",
  //       accessor: "abc_max_score",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (score: number) => {
  //             if (score < 0.1) return undefined;
  //             let colorClass = "bg-gray-100 text-gray-800";
  //             if (score >= 0.75) colorClass = "bg-red-100 text-red-800";
  //             else if (score >= 0.5) colorClass = "bg-orange-100 text-orange-800";
  //             else if (score >= 0.25) colorClass = "bg-yellow-100 text-yellow-800";
  //             else if (score >= 0.1) colorClass = "bg-blue-100 text-blue-800";
              
  //             return (
  //               <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
  //                 {score.toFixed(3)}
  //               </span>
  //             );
  //           },
  //           isValidNumber,
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>Maximum ABC Score:</strong> Highest Activity-by-Contact regulatory prediction score for this variant.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>≥ 0.75:</strong> Very high confidence regulatory interaction</li>
  //             <li><strong>0.5-0.74:</strong> High confidence regulatory interaction</li>
  //             <li><strong>0.25-0.49:</strong> Moderate confidence regulatory interaction</li>
  //             <li><strong>0.1-0.24:</strong> Low confidence regulatory interaction</li>
  //             <li><strong>&lt; 0.1:</strong> Not shown</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 5,
  //       header: "CV2F Active Tissues",
  //       accessor: "cv2f_significant_tissues",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (tissues: CV2FTissueScore[]) => {
  //             if (!tissues || tissues.length === 0) return undefined;
  //             return (
  //               <div className="space-y-1">
  //                 {tissues.slice(0, 2).map((t, idx) => (
  //                   <div key={idx} className="flex items-center justify-between">
  //                     <span className="font-medium text-green-700">{t.tissue}</span>
  //                     <span className="font-mono text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
  //                       {t.score.toFixed(2)}
  //                     </span>
  //                   </div>
  //                 ))}
  //                 {tissues.length > 2 && (
  //                   <div className="text-xs text-muted-foreground pl-2">
  //                     +{tissues.length - 2} more tissues
  //                   </div>
  //                 )}
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is CV2FTissueScore[] => 
  //             Array.isArray(value) && value.every(t => 
  //               typeof t === 'object' && 
  //               t !== null && 
  //               'tissue' in t && 
  //               'score' in t
  //             ),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>CV2F (ChromVar2 Factor):</strong> Tissue-specific regulatory activity scores measuring chromatin accessibility and transcription factor activity.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>Scores ≥ 0.1:</strong> Detectable tissue-specific regulatory activity</li>
  //             <li><strong>Higher scores:</strong> Stronger regulatory potential in specific tissues</li>
  //             <li><strong>Tissues:</strong> Liver, Brain, Blood, GM12878, K562, HepG2</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 6,
  //       header: "ENTEx Imbalanced Tissues",
  //       accessor: "entex_imbalanced_tissues",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (tissues: string[]) => {
  //             if (!tissues || tissues.length === 0) return undefined;
  //             return (
  //               <div className="space-y-1">
  //                 <div className="flex flex-wrap gap-1">
  //                   {tissues.slice(0, 2).map((tissue, idx) => (
  //                     <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
  //                       {tissue.replace(/_/g, ' ')}
  //                     </span>
  //                   ))}
  //                 </div>
  //                 {tissues.length > 2 && (
  //                   <div className="text-xs text-muted-foreground">
  //                     +{tissues.length - 2} more tissues
  //                   </div>
  //                 )}
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is string[] => 
  //             Array.isArray(value) && value.every(t => typeof t === 'string'),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>ENTEx Allelic Imbalance:</strong> Tissues showing significant allelic expression imbalance for this variant.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>Criteria:</strong> Imbalance significance ≥ 0.5 or p-value ≤ 0.05</li>
  //             <li><strong>Indicates:</strong> Differential allelic expression in specific tissues</li>
  //             <li><strong>Relevance:</strong> May affect gene dosage and tissue-specific function</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 7,
  //       header: "SCENT Tissues",
  //       accessor: "scent_tissue_count",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (count: number) => {
  //             if (count === 0) return undefined;
  //             return (
  //               <div className="flex items-center gap-2">
  //                 <span className="font-mono text-lg font-bold text-blue-700">{count}</span>
  //                 <span className="text-xs text-muted-foreground">
  //                   {count === 1 ? 'tissue' : 'tissues'}
  //                 </span>
  //               </div>
  //             );
  //           },
  //           isValidNumber,
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>SCENT Tissue Count:</strong> Number of tissues where this variant shows single-cell expression neighborhood effects.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>SCENT:</strong> Single-Cell Expression Neighborhoods in Tissues</li>
  //             <li><strong>Higher counts:</strong> Broader tissue-specific regulatory effects</li>
  //             <li><strong>Application:</strong> Cell-type specific gene regulation</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 8,
  //       header: "PGBoost High-Confidence Genes",
  //       accessor: "pgboost_high_confidence_genes",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (genes: string[]) => {
  //             if (!genes || genes.length === 0) return undefined;
  //             const display = genes.slice(0, 3).join(", ");
  //             const extra = genes.length > 3 ? ` (+${genes.length - 3} more)` : "";
  //             return (
  //               <div className="font-medium text-green-700">
  //                 <span>{display}</span>
  //                 {extra && (
  //                   <span className="text-xs text-muted-foreground ml-1">
  //                     {extra}
  //                   </span>
  //                 )}
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is string[] => 
  //             Array.isArray(value) && value.every(g => typeof g === 'string'),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>PGBoost High-Confidence Genes:</strong> Genes with top 10% polygenic boosting scores indicating strong regulatory effects.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>Threshold:</strong> PGBoost percentile ≥ 90th percentile</li>
  //             <li><strong>Methods:</strong> Combines SCENT, Signac, ArchR, and Cicero predictions</li>
  //             <li><strong>Confidence:</strong> High-confidence regulatory gene targets</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //     {
  //       key: 9,
  //       header: "GWAS Disease Traits",
  //       accessor: "gwas_significant_traits",
  //       Cell: (value) => {
  //         return safeCellRenderer(
  //           value,
  //           (traits: string[]) => {
  //             if (!traits || traits.length === 0) return undefined;
  //             return (
  //               <div className="space-y-1">
  //                 {traits.slice(0, 2).map((trait, idx) => (
  //                   <div key={idx} className="text-xs px-2 py-1 rounded">
  //                     {trait.length > 30 ? `${trait.substring(0, 30)}...` : trait}
  //                   </div>
  //                 ))}
  //                 {traits.length > 2 && (
  //                   <div className="text-xs text-muted-foreground">
  //                     +{traits.length - 2} more traits
  //                   </div>
  //                 )}
  //               </div>
  //             );
  //           },
  //           (value: unknown): value is string[] => 
  //             Array.isArray(value) && value.every(t => typeof t === 'string'),
  //         );
  //       },
  //       tooltip: (
  //         <div className="space-y-2 text-left">
  //           <p>
  //             <strong>GWAS Disease Traits:</strong> Genome-wide significant disease/trait associations for this variant.
  //           </p>
  //           <ul className="list-disc list-inside space-y-1 text-xs">
  //             <li><strong>Significance:</strong> p-value ≤ 5×10^-8 (genome-wide significance)</li>
  //             <li><strong>Source:</strong> GWAS Catalog curated associations</li>
  //             <li><strong>Clinical relevance:</strong> Established disease/trait associations</li>
  //           </ul>
  //         </div>
  //       ),
  //     },
  //   ],
  // },
];
