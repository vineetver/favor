import { ExternalLink } from "@/components/ui/external-link";
import {
  isValidNumber,
  isValidString,
  roundNumber,
  safeCellRenderer,
  splitText,
} from "@/lib/annotations/helpers";
import type { VariantColumnsType } from "@/lib/annotations/types";
import {
  alleleOriginCCode,
  alphamissenseCCODE,
  cageEnhancerCCode,
  cagePromoterCCode,
  epigeneticsCCode,
  filterValueCCode,
  genecodeCompExonicCategoryCCode,
  genecodeComprehensiveCategoryCCode,
  metasvmPredCCode,
  polyphenCCode,
} from "@/lib/utils/colors";

export const variantDetailedColumns: VariantColumnsType[] = [
  {
    name: "Basic",
    slug: "basic",
    items: [
      {
        key: 1,
        header: "Variant",
        accessor: "variant_vcf",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => <span>{validValue}</span>,
            isValidString,
          ),
        tooltip:
          "The unique identifier of the given variant, Reported as chr-pos-ref-alt format.",
      },
      {
        key: 2,
        header: "rsID",
        accessor: "rsid",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <ExternalLink
                href={`https://www.ncbi.nlm.nih.gov/snp/${validValue}`}
              >
                {validValue}
              </ExternalLink>
            ),
            isValidString,
          ),
        tooltip: "The rsID of the given variant (if exists).",
      },
      {
        key: 3,
        header: "TOPMed QC Status",
        accessor: "filter_status",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              switch (validValue) {
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
              }
            },
            isValidString,
          ),
        tooltip: "TOPMed QC status of the given variant.",
      },
      {
        key: 4,
        header: "TOPMed Bravo AN",
        accessor: "bravo_an",
        tooltip: `TOPMed Bravo Genome Allele Number. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)`,
      },
      {
        key: 5,
        header: "TOPMed Bravo AF",
        accessor: "bravo_af",
        tooltip: `TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed
      Consortium, 2018; Taliun et al., 2019)`,
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 6,
        header: "Total GNOMAD AF",
        accessor: "af_total",
        tooltip:
          "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 7,
        header: "All 1000 Genomes AF",
        accessor: "tg_all",
        tooltip:
          "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data).",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
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
        accessor: "gencode_info",
        tooltip:
          "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)",
      },
      {
        key: 2,
        header: "Genecode Comprehensive Category",
        accessor: "gencode_category",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <div>{genecodeComprehensiveCategoryCCode(validValue)}</div>
            ),
            isValidString,
          ),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Identify whether variants cause protein coding changes using
              Gencode genes definition systems, it will label the gene name of
              the variants has impact, if it is intergenic region, the nearby
              gene name will be labeled in the annotation. (Frankish et al.,
              2018; Harrow et al., 2012)
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
        key: 3,
        header: "Genecode Comprehensive Exonic Info",
        accessor: "gencode_exonic_info",
        Cell: (value) => {
          return splitText(value, ",");
        },
        tooltip:
          "Identify variants cause protein coding changes using Gencode genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes. (Frankish et al., 2018; Harrow et al., 2012)",
      },
      {
        key: 4,
        header: "Genecode Comprehensive Exonic Category",
        accessor: "gencode_exonic_category",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <div>{genecodeCompExonicCategoryCCode(validValue)}</div>
            ),
            isValidString,
          ),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Identify variants impact using Gencode exonic definition, and only
              label exonic categorical information like, synonymous,
              non-synonymous, frame-shifts indels, etc. (Frankish et al., 2018;
              Harrow et al., 2012)
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
                <strong>Frameshift insertion:</strong> insertion causing frame
                shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-300 rounded"></span>
                <strong>Frameshift deletion:</strong> deletion causing frame
                shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-300 rounded"></span>
                <strong>Frameshift substitution:</strong> substitution causing
                frame shift
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-300 rounded"></span>
                <strong>Nonframeshift insertion:</strong> insertion preserving
                frame
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-cyan-300 rounded"></span>
                <strong>Nonframeshift deletion:</strong> deletion preserving
                frame
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-lime-300 rounded"></span>
                <strong>Nonframeshift substitution:</strong> substitution
                preserving frame
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
              Identify whether the variant is a disruptive missense variant,
              defined as "disruptive" by the ensemble MetaSVM annotation. (Dong
              et al., 2014)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>D (Deleterious):</strong> likely to affect protein
                function
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>T (Tolerated):</strong> unlikely to affect protein
                function
              </div>
            </div>
          </div>
        ),
        Cell: (value) => {
          if (typeof value === "string") {
            return metasvmPredCCode(value);
          }
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
                <strong>No:</strong> variant does not overlap with CAGE promoter
                site
              </div>
            </div>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => <span>{cagePromoterCCode(validValue)}</span>,
            isValidString,
          ),
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
                <strong>No:</strong> variant does not overlap with CAGE enhancer
                site
              </div>
            </div>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => <span>{cageEnhancerCCode(validValue)}</span>,
            isValidString,
          ),
      },
      {
        key: 8,
        header: "GeneHancer",
        accessor: "genehancer",
        tooltip:
          "Predicted human enhancer sites from the GeneHancer database. (Fishilevich et al., 2017)",
        Cell: (value) => {
          if (typeof value === "string") {
            return <div>{value.split(";").slice(0, 4).join(", ")}</div>;
          }
        },
      },
      {
        key: 9,
        header: "Super Enhancer",
        accessor: "super_enhancer",
        tooltip:
          "Predicted super-enhancer sites and targets in a range of human cell types. (Hnisz et al., 2013)",
      },
      {
        key: 10,
        header: "UCSC Info",
        accessor: "ucsc_info",
        tooltip:
          "Identify whether variants cause protein coding changes using UCSC genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
        Cell: (value) => {
          if (typeof value === "string") {
            return splitText(value, ",");
          }
        },
      },
      {
        key: 11,
        header: "UCSC Exonic Info",
        accessor: "ucsc_exonic_info",
        tooltip:
          "Identify variants cause protein coding changes using UCSC genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
        Cell: (value) => {
          return splitText(value, ",");
        },
      },
      {
        key: 12,
        header: "RefSeq Info",
        accessor: "refseq_info",
        tooltip:
          "Identify whether variants cause protein coding changes using RefSeq genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
        Cell: (value) => {
          return splitText(value, ",");
        },
      },
      {
        key: 13,
        header: "RefSeq Exonic Info",
        accessor: "refseq_exonic_info",
        tooltip:
          "Identify variants cause protein coding changes using RefSeq genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
        Cell: (value) => {
          return splitText(value, ",");
        },
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
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          ),
      },
      {
        key: 2,
        header: "Clinical Significance (genotype includes)",
        accessor: "clnsigincl",
        tooltip:
          "Clinical significance for a haplotype or genotype that includes this variant. Reported as pairs of VariationID:clinical significance. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          ),
      },
      {
        key: 3,
        header: "Disease Name",
        accessor: "clndn",
        tooltip:
          "ClinVar’s preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          ),
      },
      {
        key: 4,
        header: "Disease Name (Variant Includes)",
        accessor: "clndnincl",
        tooltip:
          "For included variant: ClinVar’s preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/_/g, " ");
              return splitText(cleanValue, "|");
            },
            isValidString,
          ),
      },
      {
        key: 5,
        header: "Review Status",
        accessor: "clnrevstat",
        tooltip:
          "ClinVar review status for the Variation ID. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <span className="capitalize">
                {validValue.split("_").join(" ")}
              </span>
            ),
            isValidString,
          ),
      },
      {
        key: 6,
        header: "Allele Origin",
        accessor: "origin",
        tooltip:
          "Allele origin. One or more of the following values may be added: 0 - unknown; 1 - germline; 2 - somatic; 4 - inherited; 8 - paternal; 16 - maternal; 32 - de-novo; 64 - biparental; 128 - uniparental; 256 - not-tested; 512 - tested-inconclusive. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => {
              const origin: {
                [key: number]: string;
              } = {
                0: "unknown",
                1: "germline",
                2: "somatic",
                4: "inherited",
                8: "paternal",
                16: "maternal",
                32: "de-novo",
                64: "biparental",
                128: "uniparental",
                256: "not-tested",
                512: "tested-inconclusive",
              };

              const originText = origin[num];
              if (!originText) return undefined;

              return (
                <span className="capitalize">
                  {alleleOriginCCode(originText)}
                </span>
              );
            },
            isValidNumber,
          ),
      },
      {
        key: 7,
        header: "Disease Database ID",
        accessor: "clndisdb",
        tooltip:
          "Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/[|_]/g, " ");
              return splitText(cleanValue, ",");
            },
            isValidString,
          ),
      },
      {
        key: 8,
        header: "Disease Database ID (included variant)",
        accessor: "clndisdbincl",
        tooltip:
          "For included variant: Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const cleanValue = validValue.replace(/[.|_]/g, " ");
              return splitText(cleanValue, ",");
            },
            isValidString,
          ),
      },
      {
        key: 9,
        header: "Gene Reported",
        accessor: "geneinfo",
        tooltip:
          "Gene(s) for the variant reported as gene symbol:gene id. The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|). (Landrum et al., 2017, 2013)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              const gene = validValue.split(":")[0];
              return (
                <ExternalLink
                  href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${gene}%5Bgene%5D&redir=gene`}
                >
                  {validValue}
                </ExternalLink>
              );
            },
            isValidString,
          ),
      },
    ],
  },
  {
    name: "Overall AF",
    slug: "overall-af",
    items: [
      {
        key: 1,
        header: "TOPMed Bravo AF",
        accessor: "bravo_af",
        tooltip:
          "TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 2,
        header: "ALL 1000G AF",
        accessor: "tg_all",
        tooltip:
          "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data).",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 3,
        header: "Total gnomAD v3.1 AF",
        accessor: "af_total",
        tooltip:
          "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "Total gnomAD v4.1 (Exome) AF",
        accessor: "gnomad41_exome",
        tooltip:
          "gnomAD v4.1 Exome Allele Frequency using all the samples. (gnomAD Consortium, 2021)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
      {
        key: 5,
        header: "Total gnomAD v4.1 (Genome) AF",
        accessor: "gnomad41_genome",
        tooltip:
          "gnomAD v4.1 Genome Allele Frequency using all the samples. (gnomAD Consortium, 2021)",
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (
              <span>
                {num
                  .toFixed(6)
                  .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
              </span>
            ),
            isValidNumber,
          ),
      },
    ],
  },
  {
    name: "Ancestry AF",
    slug: "ancestry-af",
    items: [
      {
        key: 1,
        header: "AFR 1000G AF",
        accessor: "tg_afr",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>AFR 1000G AF:</strong> 1000 Genomes African population
              allele frequency.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population context:</strong> Represents allele frequency
                in African ancestry samples
              </li>
              <li>
                <strong>Clinical relevance:</strong> Important for
                ancestry-specific variant interpretation
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "AFR GNOMAD AF",
        accessor: "af_afr",
        tooltip:
          "GNOMAD v3 Genome African population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 3,
        header: "AMR 1000G AF",
        accessor: "tg_amr",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>AMR 1000G AF:</strong> 1000 Genomes Admixed American
              population allele frequency.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population context:</strong> Represents allele frequency
                in Admixed American ancestry samples
              </li>
              <li>
                <strong>Clinical relevance:</strong> Important for
                ancestry-specific variant interpretation
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 4,
        header: "AMR GNOMAD AF",
        accessor: "af_amr",
        tooltip:
          "GNOMAD v3 Genome Ad Mixed American population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 5,
        header: "EAS 1000G AF",
        accessor: "tg_eas",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EAS 1000G AF:</strong> 1000 Genomes East Asian population
              allele frequency.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population context:</strong> Represents allele frequency
                in East Asian ancestry samples
              </li>
              <li>
                <strong>Clinical relevance:</strong> Important for
                ancestry-specific variant interpretation
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 6,
        header: "EAS GNOMAD AF",
        accessor: "af_eas",
        tooltip:
          "GNOMAD v3 Genome East Asian population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 7,
        header: "EUR 1000G AF",
        accessor: "tg_eur",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EUR 1000G AF:</strong> 1000 Genomes European population
              allele frequency.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population context:</strong> Represents allele frequency
                in European ancestry samples
              </li>
              <li>
                <strong>Clinical relevance:</strong> Important for
                ancestry-specific variant interpretation
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 8,
        header: "NFE GNOMAD AF",
        accessor: "af_nfe",
        tooltip:
          "GNOMAD v3 Genome Non-Finnish European population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 9,
        header: "FIN GNOMAD AF",
        accessor: "af_fin",
        tooltip:
          "GNOMAD v3 Genome Finnish European population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 10,
        header: "SAS 1000G AF",
        accessor: "tg_sas",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>SAS 1000G AF:</strong> 1000 Genomes South Asian population
              allele frequency.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population context:</strong> Represents allele frequency
                in South Asian ancestry samples
              </li>
              <li>
                <strong>Clinical relevance:</strong> Important for
                ancestry-specific variant interpretation
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 11,
        header: "SAS GNOMAD AF",
        accessor: "af_sas",
        tooltip:
          "GNOMAD v3 Genome South Asian population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 12,
        header: "AMI GNOMAD AF",
        accessor: "af_ami",
        tooltip:
          "GNOMAD v3 Genome Amish population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 13,
        header: "ASJ GNOMAD AF",
        accessor: "af_asj",
        tooltip:
          "GNOMAD v3 Genome Ashkenazi Jewish population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 14,
        header: "OTH GNOMAD AF",
        accessor: "af_oth",
        tooltip:
          "GNOMAD v3 Genome Other (population not assigned) frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
    ],
  },
  {
    name: "Gender AF Male",
    slug: "gender-af-male",
    items: [
      {
        key: 1,
        header: "Male GNOMAD AF",
        accessor: "af_male",
        tooltip:
          "GNOMAD v3 Genome Male Allele Frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 2,
        header: "AFR Male GNOMAD AF",
        accessor: "af_afr_male",
        tooltip:
          "GNOMAD v3 Genome African Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 3,
        header: "AMI Male GNOMAD AF",
        accessor: "af_ami_male",
        tooltip:
          "GNOMAD v3 Genome Amish Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 4,
        header: "AMR Male GNOMAD AF",
        accessor: "af_amr_male",
        tooltip:
          "GNOMAD v3 Genome Ad Mixed American Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 5,
        header: "ASJ Male GNOMAD AF",
        accessor: "af_asj_male",
        tooltip:
          "GNOMAD v3 Genome Ashkenazi Jewish Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 6,
        header: "EAS Male GNOMAD AF",
        accessor: "af_eas_male",
        tooltip:
          "GNOMAD v3 Genome East Asian Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 7,
        header: "FIN Male GNOMAD AF",
        accessor: "af_fin_male",
        tooltip:
          "GNOMAD v3 Genome Finnish European Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 8,
        header: "NFE Male GNOMAD AF",
        accessor: "af_nfe_male",
        tooltip:
          "GNOMAD v3 Genome Non-Finnish European Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 9,
        header: "OTH Male GNOMAD AF",
        accessor: "af_oth_male",
        tooltip:
          "GNOMAD v3 Genome Other (population not assigned) Male frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 10,
        header: "SAS Male GNOMAD AF",
        accessor: "af_sas_male",
        tooltip:
          "GNOMAD v3 Genome South Asian Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
    ],
  },
  {
    name: "Gender AF Female",
    slug: "gender-af-female",
    items: [
      {
        key: 1,
        header: "Female GNOMAD AF",
        accessor: "af_female",
        tooltip:
          "GNOMAD v3 Genome Female Allele Frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 2,
        header: "AFR Female GNOMAD AF",
        accessor: "af_afr_female",
        tooltip:
          "GNOMAD v3 Genome African Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 3,
        header: "AMI Female GNOMAD AF",
        accessor: "af_ami_female",
        tooltip:
          "GNOMAD v3 Genome Amish Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 4,
        header: "AMR Female GNOMAD AF",
        accessor: "af_amr_female",
        tooltip:
          "GNOMAD v3 Genome Ad Mixed American Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 5,
        header: "ASJ Female GNOMAD AF",
        accessor: "af_asj_female",
        tooltip:
          "GNOMAD v3 Genome Ashkenazi Jewish Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 6,
        header: "EAS Female GNOMAD AF",
        accessor: "af_eas_female",
        tooltip:
          "GNOMAD v3 Genome East Asian Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 7,
        header: "FIN Female GNOMAD AF",
        accessor: "af_fin_female",
        tooltip:
          "GNOMAD v3 Genome Finnish European Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 8,
        header: "NFE Female GNOMAD AF",
        accessor: "af_nfe_female",
        tooltip:
          "GNOMAD v3 Genome Non-Finnish European Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 9,
        header: "OTH Female GNOMAD AF",
        accessor: "af_oth_female",
        tooltip:
          "GNOMAD v3 Genome Other (population not assigned) Female frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
      },
      {
        key: 10,
        header: "SAS Female GNOMAD AF",
        accessor: "af_sas_female",
        tooltip:
          "GNOMAD v3 Genome South Asian Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
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
              <strong>aPC-Protein Function:</strong> Integrative score combining
              multiple protein function predictions (SIFT, PolyPhen, Grantham,
              PolyPhen2, MutationTaster, MutationAssessor) into a single
              PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More likely to affect
                protein function
              </li>
              <li>
                <strong>Lower scores:</strong> Less likely to affect protein
                function
              </li>
              <li>
                <strong>PHRED scale:</strong> Higher values indicate stronger
                evidence
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 2,
        header: "aPC-Conservation",
        accessor: "apc_conservation_v2",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Conservation annotation PC: the first PC of the standardized
              scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons,
              priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0,
              75.824]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More evolutionarily
                conserved
              </li>
              <li>
                <strong>Lower scores:</strong> Less evolutionarily conserved
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 3,
        header: "aPC-Epigenetics Active",
        accessor: "apc_epigenetics_active",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Active:</strong> Integrative score
              combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3,
              H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled
              score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with gene expression and regulatory activity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More active chromatin
                state
              </li>
              <li>
                <strong>Lower scores:</strong> Less active chromatin state
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "aPC-Epigenetics Repressed",
        accessor: "apc_epigenetics_repressed",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Repressed:</strong> Integrative score
              combining repressive chromatin marks (H3K9me3, H3K27me3) into a
              single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">
                Repressed
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with gene silencing and heterochromatin
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More repressed
                chromatin state
              </li>
              <li>
                <strong>Lower scores:</strong> Less repressed chromatin state
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 5,
        header: "aPC-Epigenetics Transcription",
        accessor: "apc_epigenetics_transcription",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Transcription:</strong> Integrative score
              combining transcription-associated chromatin marks (H3K36me3,
              H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238].
              (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Transcription
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with active gene transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More transcriptionally
                active chromatin
              </li>
              <li>
                <strong>Lower scores:</strong> Less transcriptionally active
                chromatin
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 6,
        header: "aPC-Local Nucleotide Diversity",
        accessor: "apc_local_nucleotide_diversity_v3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Local Nucleotide Diversity:</strong> Integrative score
              combining local genetic diversity measures (background selection
              statistic, recombination rate, nucleotide diversity) into a single
              PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Higher local genetic
                diversity
              </li>
              <li>
                <strong>Lower scores:</strong> Lower local genetic diversity
              </li>
              <li>
                <strong>Diversity context:</strong> Reflects evolutionary and
                recombination patterns
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 7,
        header: "aPC-Mutation Density",
        accessor: "apc_mutation_density",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mutation Density:</strong> Integrative score combining
              mutation densities at different scales (100bp, 1kb, 10kb windows)
              for common, rare, and singleton variants into a single
              PHRED-scaled score. Range: [0, 84.477]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Higher local mutation
                density
              </li>
              <li>
                <strong>Lower scores:</strong> Lower local mutation density
              </li>
              <li>
                <strong>Density context:</strong> Reflects mutational burden in
                genomic region
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 8,
        header: "aPC-Transcription Factor",
        accessor: "apc_transcription_factor",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Transcription Factor:</strong> Integrative score
              combining transcription factor binding evidence (ReMap TF overlap,
              ReMap cell line overlap) into a single PHRED-scaled score. Range:
              [1.185, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More transcription
                factor binding evidence
              </li>
              <li>
                <strong>Lower scores:</strong> Less transcription factor binding
                evidence
              </li>
              <li>
                <strong>TF binding:</strong> Indicates regulatory potential
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 9,
        header: "aPC-Mappability",
        accessor: "apc_mappability",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mappability:</strong> Integrative score combining
              sequence mappability measures at different read lengths (k=24, 36,
              50, 100) for unique and multi-mapping reads into a single
              PHRED-scaled score. Range: [0.007, 22.966]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Better sequence
                mappability
              </li>
              <li>
                <strong>Lower scores:</strong> Poorer sequence mappability
              </li>
              <li>
                <strong>Mappability:</strong> Affects sequencing read alignment
                quality
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 10,
        header: "CADD phred",
        accessor: "cadd_phred",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The CADD score in PHRED scale (integrative score). A higher CADD
              score indicates more deleterious. Range: [0.001, 84]. (Kircher et
              al., 2014; Rentzsch et al., 2018)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More likely deleterious
              </li>
              <li>
                <strong>Lower scores:</strong> More likely benign
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 11,
        header: "LINSIGHT",
        accessor: "linsight",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The LINSIGHT score (integrative score). A higher LINSIGHT score
              indicates more functionality. Range: [0.033, 0.995]. (Huang et
              al., 2017)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.5):</strong> More likely functional
              </li>
              <li>
                <strong>Lower scores:</strong> Less likely functional
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
      },
      {
        key: 12,
        header: "Fathmm XF",
        accessor: "fathmm_xf",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              The FATHMM-XF score for coding variants (integrative score). A
              higher FATHMM-XF score indicates more functionality. Range:
              [0.001, 0.999]. (Rogers et al., 2017)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.5):</strong> More likely functional
              </li>
              <li>
                <strong>Lower scores:</strong> Less likely functional
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => (num >= 0 ? <span>{roundNumber(num)}</span> : undefined),
            isValidNumber,
          ),
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
              <strong>aPC-Protein Function:</strong> Integrative score combining
              multiple protein function predictions (SIFT, PolyPhen, Grantham,
              PolyPhen2, MutationTaster, MutationAssessor) into a single
              PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More likely to affect
                protein function
              </li>
              <li>
                <strong>Lower scores:</strong> Less likely to affect protein
                function
              </li>
              <li>
                <strong>PHRED scale:</strong> Higher values indicate stronger
                evidence
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
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
                <strong>Probably Damaging:</strong> likely to affect protein
                function
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
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <div>{polyphenCCode(validValue.split("_").join(" "))}</div>
            ),
            isValidString,
          ),
      },
      {
        key: 3,
        header: "PolyPhenVal",
        accessor: "polyphen_val",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              PolyPhen score: It predicts the functional significance of an
              allele replacement from its individual features. Range: [0, 1]
              (default: 0). (Adzhubei et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.8):</strong> More likely damaging
              </li>
              <li>
                <strong>Lower scores:</strong> More likely benign
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "PolyPhen2 HDIV",
        accessor: "polyphen2_hdiv_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PolyPhen2 HumDiv:</strong> Predicts amino acid
              substitution impact on protein structure and function. Trained on
              Mendelian disease variants vs. evolutionarily divergent variants
              from close mammalian species. Range: [0, 1] (default: 0).
              (Adzhubei et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.8):</strong> More likely damaging
              </li>
              <li>
                <strong>Lower scores:</strong> More likely benign
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 5,
        header: "PolyPhen2 HVAR",
        accessor: "polyphen2_hvar_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PolyPhen2 HumVar:</strong> Predicts amino acid
              substitution impact on protein structure and function. Trained on
              human disease variants vs. common polymorphisms (MAF ≥1%) with no
              known disease association. Range: [0, 1] (default: 0). (Adzhubei
              et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.8):</strong> More likely damaging
              </li>
              <li>
                <strong>Lower scores:</strong> More likely benign
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 6,
        header: "Grantham",
        accessor: "grantham",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Grantham Score:</strong> Measures evolutionary distance
              between original and new amino acids based on chemical properties
              (polarity, molecular volume, composition). Higher scores indicate
              greater chemical difference and potential functional impact.
              Range: [0, 215] (default: 0). (Grantham, 1974)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;100):</strong> Greater chemical
                difference, more deleterious
              </li>
              <li>
                <strong>Lower scores:</strong> Less chemical difference, more
                tolerated
              </li>
              <li>
                <strong>Thresholds:</strong> Conservative (0-50), moderate
                (51-100), radical (&gt;100)
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 7,
        header: "Mutation Taster",
        accessor: "mutation_taster_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              MutationTaster is a free web-based application to evaluate DNA
              sequence variants for their disease-causing potential. The
              software performs a battery of in silico tests to estimate the
              impact of the variant on the gene product/protein. Range: [0, 1]
              (default: 0). (Schwarz et al., 2014)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.8):</strong> More likely
                disease-causing
              </li>
              <li>
                <strong>Lower scores:</strong> More likely benign
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 8,
        header: "Mutation Assessor",
        accessor: "mutation_assessor_score",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Predicts the functional impact of amino-acid substitutions in
              proteins, such as mutations discovered in cancer or missense
              polymorphisms. Range: [-5.135, 6.125] (default: -5.545). (Reva et
              al., 2011)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;3):</strong> More likely functional
                impact
              </li>
              <li>
                <strong>Lower scores:</strong> Less likely functional impact
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
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
                  <strong>Deleterious:</strong> likely to affect protein
                  function
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-red-200 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Deleterious (Low Confidence):</strong> may affect
                  protein function
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-green-300 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Tolerated:</strong> likely to have no functional
                  impact
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-green-200 rounded mt-0.5 flex-shrink-0"></span>
                <div>
                  <strong>Tolerated (Low Confidence):</strong> may have no
                  functional impact
                </div>
              </div>
            </div>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => {
              if (validValue.match(/(deleterious)/i)) {
                return (
                  <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-red-900">
                    {validValue}
                  </span>
                );
              } else if (validValue.match(/(tolerated)/i)) {
                return (
                  <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-green-900">
                    {validValue}
                  </span>
                );
              }
            },
            isValidString,
          ),
      },
      {
        key: 9,
        header: "SIFTval",
        accessor: "sift_val",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated).
              Range: [0, 1] (default: 1). (Ng and Henikoff, 2003)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Lower scores (0.0-0.05):</strong> More likely
                deleterious
              </li>
              <li>
                <strong>Higher scores (&gt;0.05):</strong> More likely tolerated
              </li>
            </ul>
          </div>
        ),
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
              Conservation annotation PC: the first PC of the standardized
              scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons,
              priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0,
              75.824]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More evolutionarily
                conserved
              </li>
              <li>
                <strong>Lower scores:</strong> Less evolutionarily conserved
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "mamPhCons",
        accessor: "mamphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Mammalian phastCons conservation score (excl. human). A higher
              score means the region is more conserved. PhastCons considers n
              species rather than two. It considers the phylogeny by which these
              species are related, and instead of measuring
              similarity/divergence simply in terms of percent identity. It uses
              statistical models of nucleotide substitution that allow for
              multiple substitutions per site and for unequal rates of
              substitution between different pairs of bases. Range: [0, 1]
              (default: 0.0). (Siepel et al., 2005)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;0.8):</strong> More evolutionarily
                conserved
              </li>
              <li>
                <strong>Lower scores:</strong> Less evolutionarily conserved
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "priPhCons",
        accessor: "priphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Primate phastCons:</strong> Conservation score comparing
              primate species (excluding humans). Uses evolutionary models to
              identify conserved regions across multiple species. Range:
              [-10.761, 0.595] (default: -0.029). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;0.3):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Faster evolution than expected
              </li>
              <li>
                <strong>phastCons:</strong> Models evolutionary pressure across
                species
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 4,
        header: "verPhCons",
        accessor: "verphcons",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Vertebrate phastCons:</strong> Conservation score
              comparing vertebrate species (excluding humans). Uses evolutionary
              models to identify conserved regions across vertebrates. Range:
              [-20, 11.295] (default: 0.042). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;2):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Faster evolution than expected
              </li>
              <li>
                <strong>phastCons:</strong> Models evolutionary pressure across
                species
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 5,
        header: "priPhyloP",
        accessor: "priphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Primate phyloP:</strong> Site-by-site conservation score
              comparing primate species (excluding humans). Measures
              evolutionary constraint at individual positions. Range: [-10.761,
              0.595] (default: -0.029). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;0.3):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Faster evolution than expected
              </li>
              <li>
                <strong>phyloP:</strong> Per-site evolutionary constraint
                analysis
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 6,
        header: "mamPhyloP",
        accessor: "mamphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Mammalian phyloP:</strong> Site-by-site conservation score
              comparing mammalian species (excluding humans). Measures
              evolutionary constraint at individual positions. Range: [-20,
              4.494] (default: -0.005). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;3):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Faster evolution than expected
              </li>
              <li>
                <strong>phyloP:</strong> Per-site evolutionary constraint
                analysis
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 7,
        header: "verPhyloP",
        accessor: "verphylop",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Vertebrate phyloP:</strong> Site-by-site conservation
              score comparing vertebrate species (excluding humans). Measures
              evolutionary constraint at individual positions. Range: [-20,
              11.295] (default: 0.042). (Pollard et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;8):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Faster evolution than expected
              </li>
              <li>
                <strong>phyloP:</strong> Per-site evolutionary constraint
                analysis
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 8,
        header: "GerpN",
        accessor: "gerp_n",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Neutral evolution score defined by GERP++. A higher score means
              the region is more conserved. Range: [0, 19.8] (default: 3.0).
              (Davydov et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More evolutionarily
                conserved
              </li>
              <li>
                <strong>Lower scores:</strong> Less evolutionarily conserved
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 9,
        header: "GerpS",
        accessor: "gerp_s",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              Rejected Substitution score defined by GERP++. A higher score
              means the region is more conserved. GERP (Genomic Evolutionary
              Rate Profiling) identifies constrained elements in multiple
              alignments by quantifying substitution deficits. These deficits
              represent substitutions that would have occurred if the element
              were neutral DNA, but did not occur because the element has been
              under functional constraint. These deficits are referred to as
              "Rejected Substitutions". Rejected substitutions are a natural
              measure of constraint that reflects the strength of past purifying
              selection on the element. GERP estimates constraint for each
              alignment column; elements are identified as excess aggregations
              of constrained columns. Positive scores (fewer than expected)
              indicate that a site is under evolutionary constraint. Negative
              scores may be weak evidence of accelerated rates of evolution.
              Range: [-39.5, 19.8] (default: -0.2). (Davydov et al., 2010)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher positive scores (&gt;10):</strong> More
                evolutionarily conserved
              </li>
              <li>
                <strong>Negative scores:</strong> Accelerated evolution
              </li>
            </ul>
          </div>
        ),
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
              <strong>aPC-Epigenetics Active:</strong> Integrative score
              combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3,
              H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled
              score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with gene expression and regulatory activity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More active chromatin
                state
              </li>
              <li>
                <strong>Lower scores:</strong> Less active chromatin state
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 2,
        header: "aPC Epigenetics Repressed",
        accessor: "apc_epigenetics_repressed",
        activity: epigeneticsCCode("Repressed"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Repressed:</strong> Integrative score
              combining repressive chromatin marks (H3K9me3, H3K27me3) into a
              single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">
                Repressed
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with gene silencing and heterochromatin
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More repressed
                chromatin state
              </li>
              <li>
                <strong>Lower scores:</strong> Less repressed chromatin state
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 3,
        header: "aPC Epigenetics Transcription",
        accessor: "apc_epigenetics_transcription",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Epigenetics Transcription:</strong> Integrative score
              combining transcription-associated chromatin marks (H3K36me3,
              H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238].
              (Li et al., 2020)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Transcription
              </span>
              <span className="text-xs text-muted-foreground">
                Associated with active gene transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More transcriptionally
                active chromatin
              </li>
              <li>
                <strong>Lower scores:</strong> Less transcriptionally active
                chromatin
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "DNase",
        accessor: "encode_dnase_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>DNase:</strong> DNase-seq measures chromatin accessibility
              by identifying regions where DNA is accessible to DNase I enzyme.
              Range: [0.001, 118672] (default: 0.0). (ENCODE Project Consortium,
              2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Open chromatin regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥0.437):</strong> More accessible
                chromatin, likely regulatory regions
              </li>
              <li>
                <strong>Lower levels:</strong> Less accessible chromatin,
                compact chromatin structure
              </li>
              <li>
                <strong>Biological significance:</strong> DNase hypersensitivity
                indicates active regulatory elements
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 5,
        header: "H3K27ac",
        accessor: "encodeh3k27ac_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K27ac:</strong> Histone H3 lysine 27 acetylation mark, a
              key indicator of active enhancers and promoters. Range: [0.013,
              288.608] (default: 0.36). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active enhancers and promoters
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥7.82):</strong> Strong enhancer
                activity, active gene regulation
              </li>
              <li>
                <strong>Lower levels:</strong> Weaker enhancer activity or
                inactive regulatory regions
              </li>
              <li>
                <strong>Biological role:</strong> Distinguishes active enhancers
                from poised/inactive ones
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 6,
        header: "H3K4me1",
        accessor: "encodeh3k4me1_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me1:</strong> Histone H3 lysine 4 monomethylation
              mark, commonly found at enhancer regions and regulatory elements.
              Range: [0.015, 91.954] (default: 0.37). (ENCODE Project
              Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Enhancer regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥5):</strong> Strong enhancer signature,
                active regulatory regions
              </li>
              <li>
                <strong>Lower levels:</strong> Weaker enhancer activity or
                non-regulatory regions
              </li>
              <li>
                <strong>Biological role:</strong> Marks both active and poised
                enhancers
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 7,
        header: "H3K4me2",
        accessor: "encodeh3k4me2_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me2:</strong> Histone H3 lysine 4 dimethylation mark,
              associated with active promoters and transcriptional start sites.
              Range: [0.024, 148.887] (default: 0.37). (ENCODE Project
              Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active promoters
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥3.543):</strong> Active promoter
                regions, ongoing transcription
              </li>
              <li>
                <strong>Lower levels:</strong> Inactive or weakly active
                promoters
              </li>
              <li>
                <strong>Biological role:</strong> Marks active transcriptional
                start sites
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 8,
        header: "H3K4me3",
        accessor: "encodeh3k4me3_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K4me3:</strong> Histone H3 lysine 4 trimethylation mark,
              the classical marker of active promoters and transcriptional start
              sites. Range: [0.012, 239.512] (default: 0.38). (ENCODE Project
              Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active promoters
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥3.77):</strong> Highly active promoters,
                strong transcriptional activity
              </li>
              <li>
                <strong>Lower levels:</strong> Inactive or weakly active
                promoters
              </li>
              <li>
                <strong>Biological role:</strong> Most reliable marker of active
                gene promoters
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 9,
        header: "H3K9ac",
        accessor: "encodeh3k9ac_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K9ac:</strong> Histone H3 lysine 9 acetylation mark,
              associated with transcriptionally active chromatin and gene
              expression. Range: [0.019, 281.187] (default: 0.41). (ENCODE
              Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥3.13):</strong> Active transcriptional
                regions, open chromatin
              </li>
              <li>
                <strong>Lower levels:</strong> Transcriptionally inactive
                regions
              </li>
              <li>
                <strong>Biological role:</strong> Generally associated with
                active gene expression
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 10,
        header: "H4k20me1",
        accessor: "encodeh4k20me1_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H4K20me1:</strong> Histone H4 lysine 20 monomethylation
              mark, associated with active chromatin and transcriptional
              elongation. Range: [0.054, 73.230] (default: 0.47). (ENCODE
              Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active chromatin
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥2.6):</strong> Active chromatin regions,
                ongoing transcription
              </li>
              <li>
                <strong>Lower levels:</strong> Less active chromatin regions
              </li>
              <li>
                <strong>Biological role:</strong> Associated with gene bodies
                and active transcription
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 11,
        header: "H2AFZ",
        accessor: "encodeh2afz_sum",
        activity: epigeneticsCCode("Active"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H2AFZ:</strong> Histone variant H2A.Z associated with
              transcriptional regulation, nucleosome positioning, and active
              chromatin regions. Range: [0.031, 96.072] (default: 0.42). (ENCODE
              Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">
                Active
              </span>
              <span className="text-xs text-muted-foreground">
                Active regulatory regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥2.1):</strong> Active regulatory
                elements, promoters and enhancers
              </li>
              <li>
                <strong>Lower levels:</strong> Less active or inactive
                regulatory regions
              </li>
              <li>
                <strong>Biological role:</strong> Facilitates transcription
                factor binding and gene regulation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 12,
        header: "H3K9me3",
        accessor: "encodeh3k9me3_sum",
        activity: epigeneticsCCode("Repressed"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K9me3:</strong> Histone H3 lysine 9 trimethylation mark,
              a key marker of constitutive heterochromatin and gene silencing.
              Range: [0.011, 58.712] (default: 0.38). (ENCODE Project
              Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">
                Repressed
              </span>
              <span className="text-xs text-muted-foreground">
                Heterochromatin and gene silencing
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥3.61):</strong> Strongly repressed
                regions, heterochromatin
              </li>
              <li>
                <strong>Lower levels:</strong> Less repressed or euchromatic
                regions
              </li>
              <li>
                <strong>Biological role:</strong> Maintains long-term gene
                silencing and chromosome structure
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 13,
        header: "H3K27me3",
        accessor: "encodeh3k27me3_sum",
        activity: epigeneticsCCode("Repressed"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K27me3:</strong> Histone H3 lysine 27 trimethylation
              mark, associated with facultative heterochromatin and
              Polycomb-mediated gene repression. Range: [0.014, 87.122]
              (default: 0.47). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">
                Repressed
              </span>
              <span className="text-xs text-muted-foreground">
                Polycomb repression
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥3.69):</strong> Polycomb-repressed
                regions, poised developmental genes
              </li>
              <li>
                <strong>Lower levels:</strong> Less repressed or active regions
              </li>
              <li>
                <strong>Biological role:</strong> Maintains developmental gene
                silencing, can be reversed
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 14,
        header: "H3K36me3",
        accessor: "encodeh3k36me3_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K36me3:</strong> Histone H3 lysine 36 trimethylation
              mark, associated with actively transcribed gene bodies and
              transcriptional elongation. Range: [0.009, 56.176] (default:
              0.39). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Transcription
              </span>
              <span className="text-xs text-muted-foreground">
                Active gene bodies
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥2.79):</strong> Actively transcribed
                gene bodies, ongoing elongation
              </li>
              <li>
                <strong>Lower levels:</strong> Less transcriptionally active
                regions
              </li>
              <li>
                <strong>Biological role:</strong> Marks regions of active
                transcriptional elongation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 15,
        header: "H3K79me2",
        accessor: "encodeh3k79me2_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>H3K79me2:</strong> Histone H3 lysine 79 dimethylation
              mark, associated with active transcription and transcriptional
              elongation. Range: [0.015, 118.706] (default: 0.34). (ENCODE
              Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Transcription
              </span>
              <span className="text-xs text-muted-foreground">
                Active transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥2.32):</strong> Actively transcribing
                regions, elongating RNA polymerase
              </li>
              <li>
                <strong>Lower levels:</strong> Less transcriptionally active
                regions
              </li>
              <li>
                <strong>Biological role:</strong> Marks active transcriptional
                elongation and chromatin dynamics
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 16,
        header: "totalRNA",
        accessor: "encodetotal_rna_sum",
        activity: epigeneticsCCode("Transcription"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Total RNA:</strong> RNA sequencing signal measuring total
              RNA expression levels across multiple cell lines. Range: [0,
              92282.7] (default: 0.0). (ENCODE Project Consortium, 2012)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Transcription
              </span>
              <span className="text-xs text-muted-foreground">
                RNA expression levels
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher levels (≥27.38):</strong> Highly transcribed
                regions, active gene expression
              </li>
              <li>
                <strong>Lower levels:</strong> Less transcriptionally active or
                silent regions
              </li>
              <li>
                <strong>Biological role:</strong> Direct measure of
                transcriptional activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 17,
        header: "GC",
        accessor: "gc",
        activity: epigeneticsCCode("-"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>GC Content:</strong> Percentage of guanine and cytosine
              nucleotides in a 150bp window around the variant. Range: [0, 1]
              (default: 0.42)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-slate-300 px-2 py-1 text-xs font-medium text-slate-900">
                Sequence Context
              </span>
              <span className="text-xs text-muted-foreground">
                Nucleotide composition
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher GC content (&gt;0.6):</strong> GC-rich regions,
                often gene-dense areas
              </li>
              <li>
                <strong>Lower GC content (&lt;0.3):</strong> AT-rich regions,
                often heterochromatic
              </li>
              <li>
                <strong>Biological significance:</strong> Affects chromatin
                structure and mutation patterns
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 18,
        header: "CpG",
        accessor: "cpg",
        activity: epigeneticsCCode("-"),
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>CpG Content:</strong> Percentage of CpG dinucleotides in a
              150bp window around the variant. Range: [0, 0.6] (default: 0.02)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-slate-300 px-2 py-1 text-xs font-medium text-slate-900">
                Sequence Context
              </span>
              <span className="text-xs text-muted-foreground">
                DNA methylation context
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher CpG content (&gt;0.1):</strong> CpG islands,
                often unmethylated promoters
              </li>
              <li>
                <strong>Lower CpG content (&lt;0.05):</strong> CpG-poor regions,
                potentially methylated
              </li>
              <li>
                <strong>Biological significance:</strong> Relates to DNA
                methylation and gene regulation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
    ],
  },
  {
    name: "Transcription Factor",
    slug: "transcription-factors",
    items: [
      {
        key: 1,
        header: "aPC-Transcription-Factor",
        accessor: "apc_transcription_factor",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Transcription Factor:</strong> Integrative score
              combining transcription factor binding evidence (ReMap TF overlap,
              ReMap cell line overlap) into a single PHRED-scaled score. Range:
              [1.185, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> More transcription
                factor binding evidence
              </li>
              <li>
                <strong>Lower scores:</strong> Less transcription factor binding
                evidence
              </li>
              <li>
                <strong>TF binding:</strong> Indicates regulatory potential
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "RemapOverlapTF",
        accessor: "remap_overlap_tf",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>ReMap TF Overlap:</strong> Number of different
              transcription factors that bind to this genomic region based on
              ChIP-seq data from the ReMap database. Range: [1, 350] (default:
              -0.5).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-blue-300 px-2 py-1 text-xs font-medium text-blue-900">
                TF Binding
              </span>
              <span className="text-xs text-muted-foreground">
                Transcription factor diversity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 TFs):</strong> High regulatory
                complexity, multiple TF binding
              </li>
              <li>
                <strong>Lower counts (1-5 TFs):</strong> Simpler regulatory
                context, fewer TF interactions
              </li>
              <li>
                <strong>Biological significance:</strong> Indicates regulatory
                hotspots and complexity
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "RemapOverlapCL",
        accessor: "remap_overlap_cl",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>ReMap Cell Line Overlap:</strong> Number of different
              transcription factor-cell line combinations that show binding to
              this genomic region. Represents context-specific TF binding across
              diverse cellular conditions. Range: [1, 1068] (default: -0.5).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-blue-300 px-2 py-1 text-xs font-medium text-blue-900">
                TF Binding
              </span>
              <span className="text-xs text-muted-foreground">
                Cell-type specific binding
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;50):</strong> Broad regulatory
                activity across cell types
              </li>
              <li>
                <strong>Lower counts (&lt;20):</strong> More cell-type specific
                or limited binding
              </li>
              <li>
                <strong>Biological significance:</strong> Indicates regulatory
                conservation across contexts
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    name: "Cromatin State",
    slug: "chromatin-states",
    items: [
      {
        key: 1,
        header: "TssA (Active TSS)",
        accessor: "chmm_e1",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TssA (Active TSS):</strong> Number of cell types (out of
              48) where this region is in the Active Transcription Start Site
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-red-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Active promoter regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly
                active promoter
              </li>
              <li>
                <strong>Lower counts:</strong> More cell-type specific
                activation
              </li>
              <li>
                <strong>Biological role:</strong> Active gene transcription
                initiation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg className="h-2 w-2 mr-2 fill-red-500" viewBox="0 0 6 6">
                <title>TssA (Active TSS)</title>
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 2,
        header: "PromU (Promoter Upstream TSS)",
        accessor: "chmm_e2",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PromU (Promoter Upstream TSS):</strong> Number of cell
              types (out of 48) where this region is in the Promoter Upstream
              TSS chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-amber-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Upstream promoter regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                active upstream elements
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific upstream
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Regulatory elements upstream
                of transcription start sites
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-amber-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 3,
        header: "PromD1 (Promoter Downstream TSS with Dnase)",
        accessor: "chmm_e3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PromD1 (Promoter Downstream TSS with DNase):</strong>{" "}
              Number of cell types (out of 48) where this region is in the
              Promoter Downstream TSS with DNase chromatin state. (default:
              1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-amber-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Downstream promoter with accessibility
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                accessible downstream regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific downstream
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Accessible regulatory elements
                downstream of TSS
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-amber-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 4,
        header: "PromD2 (Promoter Downstream TSS)",
        accessor: "chmm_e4",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PromD2 (Promoter Downstream TSS):</strong> Number of cell
              types (out of 48) where this region is in the Promoter Downstream
              TSS chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-amber-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Downstream promoter regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                active downstream elements
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific downstream
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Regulatory elements downstream
                of transcription start sites
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-amber-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 5,
        header: `Tx5' (Transcription 5')`,
        accessor: "chmm_e5",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Tx5' (Transcription 5'):</strong> Number of cell types
              (out of 48) where this region is in the Transcription 5' chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                5' end transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;12 cell types):</strong> Broadly
                transcribed 5' regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific 5'
                transcription
              </li>
              <li>
                <strong>Biological role:</strong> Active transcription at gene
                5' ends
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-green-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 6,
        header: `Tx (Transcription)`,
        accessor: "chmm_e6",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Tx (Transcription):</strong> Number of cell types (out of
              48) where this region is in the Transcription chromatin state.
              (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Active gene body transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;15 cell types):</strong> Broadly
                transcribed gene body
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific transcription
              </li>
              <li>
                <strong>Biological role:</strong> Active transcriptional
                elongation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-green-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 7,
        header: `Tx3' (Transcription 3')`,
        accessor: "chmm_e7",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Tx3' (Transcription 3'):</strong> Number of cell types
              (out of 48) where this region is in the Transcription 3' chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                3' end transcription
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;12 cell types):</strong> Broadly
                transcribed 3' regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific 3'
                transcription
              </li>
              <li>
                <strong>Biological role:</strong> Active transcription at gene
                3' ends
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-green-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 8,
        header: "TxWk (Transcription Weak)",
        accessor: "chmm_e8",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TxWk (Transcription Weak):</strong> Number of cell types
              (out of 48) where this region is in the Transcription Weak
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Weak transcriptional activity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;15 cell types):</strong> Broadly weak
                transcription
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific weak activity
              </li>
              <li>
                <strong>Biological role:</strong> Low-level transcriptional
                activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-green-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 9,
        header: "TxReg (Transcription Regulatory)",
        accessor: "chmm_e9",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TxReg (Transcription Regulatory):</strong> Number of cell
              types (out of 48) where this region is in the Transcription
              Regulatory chromatin state. (default: 1.92). (Ernst and Kellis,
              2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-lime-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Transcriptional regulatory regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly
                regulatory transcription
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific regulatory
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Regulatory elements within
                transcribed regions
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-lime-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 10,
        header: `TxEnh5' (Transcription Enhancer 5')`,
        accessor: "chmm_e10",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TxEnh5' (Transcription Enhancer 5'):</strong> Number of
              cell types (out of 48) where this region is in the Transcription
              Enhancer 5' chromatin state. (default: 1.92). (Ernst and Kellis,
              2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-lime-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                5' transcriptional enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                active 5' enhancers
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific 5' enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Enhancer activity at 5' end of
                transcribed regions
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-lime-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 11,
        header: `TxEnh3' (Transcription Enhancer 3')`,
        accessor: "chmm_e11",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TxEnh3' (Transcription Enhancer 3'):</strong> Number of
              cell types (out of 48) where this region is in the Transcription
              Enhancer 3' chromatin state. (default: 1.92). (Ernst and Kellis,
              2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-lime-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                3' transcriptional enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                active 3' enhancers
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific 3' enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Enhancer activity at 3' end of
                transcribed regions
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-lime-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 12,
        header: "TxEnhW (Transcription Enhancer Weak)",
        accessor: "chmm_e12",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>TxEnhW (Transcription Enhancer Weak):</strong> Number of
              cell types (out of 48) where this region is in the Transcription
              Enhancer Weak chromatin state. (default: 1.92). (Ernst and Kellis,
              2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-lime-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Weak transcriptional enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly weak
                enhancer activity
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific weak enhancers
              </li>
              <li>
                <strong>Biological role:</strong> Low-level enhancer activity in
                transcribed regions
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-lime-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 13,
        header: "EnhA1 (Active Enhancer 1)",
        accessor: "chmm_e13",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhA1 (Active Enhancer 1):</strong> Number of cell types
              (out of 48) where this region is in the Active Enhancer 1
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-orange-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Strong active enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly
                active enhancer
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Strong regulatory element
                activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-orange-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 14,
        header: "EnhA2 (Active Enhancer 2)",
        accessor: "chmm_e14",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhA2 (Active Enhancer 2):</strong> Number of cell types
              (out of 48) where this region is in the Active Enhancer 2
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-orange-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Strong active enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly
                active enhancer
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Strong distal regulatory
                element activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-orange-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 15,
        header: "EnhAF (Active Enhancer Flanking)",
        accessor: "chmm_e15",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhAF (Active Enhancer Flanking):</strong> Number of cell
              types (out of 48) where this region is in the Active Enhancer
              Flanking chromatin state. (default: 1.92). (Ernst and Kellis,
              2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-orange-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Flanking enhancer regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;8 cell types):</strong> Broadly
                active flanking regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific flanking
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Regulatory activity flanking
                strong enhancers
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-orange-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 16,
        header: "EnhW1 (Enhancer Weak 1)",
        accessor: "chmm_e16",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhW1 (Enhancer Weak 1):</strong> Number of cell types
              (out of 48) where this region is in the Enhancer Weak 1 chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Weak enhancer activity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;12 cell types):</strong> Broadly weak
                enhancer
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific weak enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Low-level distal regulatory
                element activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-yellow-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 17,
        header: "EnhW2 (Enhancer Weak 2)",
        accessor: "chmm_e17",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhW2 (Enhancer Weak 2):</strong> Number of cell types
              (out of 48) where this region is in the Enhancer Weak 2 chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Weak enhancer activity
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;12 cell types):</strong> Broadly weak
                enhancer
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific weak enhancer
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Low-level proximal regulatory
                element activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-yellow-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 18,
        header: "EnhAc (Enhancer Acetylation Only)",
        accessor: "chmm_e18",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>EnhAc (Enhancer Acetylation Only):</strong> Number of cell
              types (out of 48) where this region is in the Enhancer Acetylation
              Only chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Acetylation-marked enhancers
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10 cell types):</strong> Broadly
                acetylated enhancer regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific acetylation
              </li>
              <li>
                <strong>Biological role:</strong> Enhancers marked primarily by
                histone acetylation
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-yellow-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 19,
        header: "DNase (DNase Only)",
        accessor: "chmm_e19",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>DNase (DNase Only):</strong> Number of cell types (out of
              48) where this region is in the DNase Only chromatin state.
              (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Accessible chromatin without histone marks
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;15 cell types):</strong> Broadly
                accessible regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific accessibility
              </li>
              <li>
                <strong>Biological role:</strong> Chromatin accessibility
                without strong histone signatures
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-yellow-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 20,
        header: "ZNF/Rpts (ZNF Genes and Repeats)",
        accessor: "chmm_e20",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>ZNF/Rpts (ZNF Genes and Repeats):</strong> Number of cell
              types (out of 48) where this region is in the ZNF Genes and
              Repeats chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-emerald-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Zinc finger genes and repetitive elements
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;20 cell types):</strong> Broadly
                active ZNF/repeat regions
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific ZNF/repeat
                activity
              </li>
              <li>
                <strong>Biological role:</strong> Zinc finger gene clusters and
                repetitive elements
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-emerald-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 21,
        header: "Het (Heterochromatin)",
        accessor: "chmm_e21",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Het (Heterochromatin):</strong> Number of cell types (out
              of 48) where this region is in the Heterochromatin chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-violet-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Constitutive heterochromatin
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;30 cell types):</strong>{" "}
                Constitutively silenced regions
              </li>
              <li>
                <strong>Lower counts:</strong> Facultatively heterochromatic
              </li>
              <li>
                <strong>Biological role:</strong> Long-term gene silencing,
                repetitive elements
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-violet-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 22,
        header: "PromP (Poised Promoter)",
        accessor: "chmm_e22",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PromP (Poised Promoter):</strong> Number of cell types
              (out of 48) where this region is in the Poised Promoter chromatin
              state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-rose-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Poised developmental promoters
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;12 cell types):</strong> Broadly
                poised promoters
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific poised states
              </li>
              <li>
                <strong>Biological role:</strong> Promoters ready for
                activation, often developmental genes
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-rose-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 23,
        header: "PromBiv (Bivalent Promoter)",
        accessor: "chmm_e23",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>PromBiv (Bivalent Promoter):</strong> Number of cell types
              (out of 48) where this region is in the Bivalent Promoter
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-purple-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Poised developmental promoters
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;15 cell types):</strong> Broadly
                poised developmental genes
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific bivalent
                states
              </li>
              <li>
                <strong>Biological role:</strong> H3K4me3 + H3K27me3, ready for
                activation or repression
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="h-2 w-2 mr-2 fill-purple-500"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 24,
        header: "ReprPC (Repressed PolyComb)",
        accessor: "chmm_e24",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>ReprPC (Repressed PolyComb):</strong> Number of cell types
              (out of 48) where this region is in the Repressed PolyComb
              chromatin state. (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-zinc-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Polycomb-repressed regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;20 cell types):</strong> Broadly
                repressed across contexts
              </li>
              <li>
                <strong>Lower counts:</strong> Cell-type specific repression
              </li>
              <li>
                <strong>Biological role:</strong> Facultative heterochromatin,
                developmental gene silencing
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="fill-zinc-500 h-2 w-2 mr-2"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
      {
        key: 25,
        header: "Quies (Quiescent/Low)",
        accessor: "chmm_e25",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Quies (Quiescent/Low):</strong> Number of cell types (out
              of 48) where this region is in the Quiescent/Low chromatin state.
              (default: 1.92). (Ernst and Kellis, 2015)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-zinc-500 rounded"></span>
              <span className="text-xs text-muted-foreground">
                Low activity regions
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;35 cell types):</strong>{" "}
                Constitutively inactive
              </li>
              <li>
                <strong>Lower counts:</strong> Context-dependent activity
              </li>
              <li>
                <strong>Biological role:</strong> Background chromatin with
                minimal regulatory activity
              </li>
            </ul>
          </div>
        ),
        Cell: (value) => {
          return (
            <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
              <svg
                className="fill-zinc-500 h-2 w-2 mr-2"
                viewBox="0 0 6 6"
                aria-hidden="true"
              >
                <circle cx={3} cy={3} r={3} />
              </svg>
              {value}
            </span>
          );
        },
      },
    ],
  },
  {
    name: "Local Nucleotide Diversity",
    slug: "local-nucleotide-diversity",
    items: [
      {
        key: 1,
        header: "aPC Local Nucleotide Diversity",
        accessor: "apc_local_nucleotide_diversity_v3",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Local Nucleotide Diversity:</strong> Integrative score
              combining local genetic diversity measures (background selection
              statistic, recombination rate, nucleotide diversity) into a single
              PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Higher local genetic
                diversity
              </li>
              <li>
                <strong>Lower scores:</strong> Lower local genetic diversity
              </li>
              <li>
                <strong>Diversity context:</strong> Reflects evolutionary and
                recombination patterns
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "Recombination Rate",
        accessor: "recombination_rate",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Recombination Rate:</strong> Local recombination rate per
              base pair, indicating how frequently genetic recombination occurs
              in this genomic region during meiosis.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Genetic Diversity
              </span>
              <span className="text-xs text-muted-foreground">
                Crossover frequency
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher rates (&gt;2 cM/Mb):</strong> Recombination
                hotspots, higher genetic diversity
              </li>
              <li>
                <strong>Lower rates (&lt;0.5 cM/Mb):</strong> Recombination
                coldspots, lower diversity
              </li>
              <li>
                <strong>Biological significance:</strong> Affects linkage
                disequilibrium and population genetics
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "Nucleotide Diversity",
        accessor: "nucdiv",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Nucleotide Diversity:</strong> Average number of
              nucleotide differences per site between randomly chosen DNA
              sequences from a population. A fundamental measure of genetic
              variation.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Genetic Diversity
              </span>
              <span className="text-xs text-muted-foreground">
                Population genetic variation
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher diversity (&gt;0.001):</strong> More genetic
                variation, less selective constraint
              </li>
              <li>
                <strong>Lower diversity (&lt;0.0005):</strong> Less variation,
                stronger purifying selection
              </li>
              <li>
                <strong>Biological significance:</strong> Reflects
                mutation-selection-drift balance
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 4,
        header: "bStatistic",
        accessor: "bstatistic",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Background Selection Statistic (B):</strong> Measures the
              reduction in neutral diversity due to selection against
              deleterious mutations linked to the focal site. Higher values
              indicate stronger background selection effects.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Genetic Diversity
              </span>
              <span className="text-xs text-muted-foreground">
                Selection against linked mutations
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher B values (&gt;0.8):</strong> Strong background
                selection, reduced diversity
              </li>
              <li>
                <strong>Lower B values (&lt;0.5):</strong> Weak background
                selection, higher diversity
              </li>
              <li>
                <strong>Biological significance:</strong> Indicates local
                selective pressure on linked sites
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    name: "Mutation Density",
    slug: "mutation-density",
    items: [
      {
        key: 1,
        header: "aPC Mutation Density",
        accessor: "apc_mutation_density",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mutation Density:</strong> Integrative score combining
              mutation densities at different scales (100bp, 1kb, 10kb windows)
              for common, rare, and singleton variants into a single
              PHRED-scaled score. Range: [0, 84.477]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Higher local mutation
                density
              </li>
              <li>
                <strong>Lower scores:</strong> Lower local mutation density
              </li>
              <li>
                <strong>Density context:</strong> Reflects mutational burden in
                genomic region
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "Common100bp",
        accessor: "freq100bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Common100bp:</strong> Number of common variants (MAF &gt;
              0.05) from BRAVO dataset within a 100bp window around the variant.
              Range: [0, 13] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Common variants (MAF &gt; 5%)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;3):</strong> Mutation-prone region
                for common variants
              </li>
              <li>
                <strong>Lower counts (0-1):</strong> Less mutated or more
                constrained region
              </li>
              <li>
                <strong>Biological significance:</strong> Indicates local
                mutational burden and tolerance
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "Rare100bp",
        accessor: "rare100bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Rare100bp:</strong> Number of rare variants (MAF &lt;
              0.05) from BRAVO dataset within a 100bp window around the variant.
              Range: [0, 31] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Rare variants (MAF &lt; 5%)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;5):</strong> High rare variant
                density, potential mutation hotspot
              </li>
              <li>
                <strong>Lower counts (0-2):</strong> Lower mutation rate or
                stronger selection against variants
              </li>
              <li>
                <strong>Biological significance:</strong> Reflects recent
                mutations and selective constraints
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 4,
        header: "Sngl100bp",
        accessor: "sngl100bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Sngl100bp:</strong> Number of singleton variants (observed
              only once) from BRAVO dataset within a 100bp window around the
              variant. Range: [0, 99] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Singleton variants (AC=1)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;10):</strong> Very high recent
                mutation activity
              </li>
              <li>
                <strong>Lower counts (0-3):</strong> Lower mutation rate,
                potentially more constrained
              </li>
              <li>
                <strong>Biological significance:</strong> Indicates very recent
                mutational events
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 5,
        header: "Common1000bp",
        accessor: "freq1000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Common1000bp:</strong> Number of common variants (MAF &gt;
              0.05) from BRAVO dataset within a 1000bp window around the
              variant. Range: [0, 73] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Common variants (1kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;20):</strong> High mutation density
                in local region
              </li>
              <li>
                <strong>Lower counts (0-5):</strong> Lower regional mutation
                rate
              </li>
              <li>
                <strong>Biological significance:</strong> Regional mutational
                patterns and tolerance
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 6,
        header: "Rare1000bp",
        accessor: "rare1000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Rare1000bp:</strong> Number of rare variants (MAF &lt;
              0.05) from BRAVO dataset within a 1000bp window around the
              variant. Range: [0, 74] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Rare variants (1kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;20):</strong> High rare variant
                density in region
              </li>
              <li>
                <strong>Lower counts (0-5):</strong> Lower regional rare variant
                burden
              </li>
              <li>
                <strong>Biological significance:</strong> Regional constraint
                against rare variants
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 7,
        header: "Sngl1000bp",
        accessor: "sngl1000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Sngl1000bp:</strong> Number of singleton variants
              (observed only once) from BRAVO dataset within a 1000bp window
              around the variant. Range: [0, 658] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Singleton variants (1kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;50):</strong> Very high regional
                mutation activity
              </li>
              <li>
                <strong>Lower counts (0-10):</strong> Lower regional mutation
                rate
              </li>
              <li>
                <strong>Biological significance:</strong> Regional patterns of
                recent mutations
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 8,
        header: "Common10000bp",
        accessor: "freq10000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Common10000bp:</strong> Number of common variants (MAF
              &gt; 0.05) from BRAVO dataset within a 10kb window around the
              variant. Range: [0, 443] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Common variants (10kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;100):</strong> Very high regional
                mutation density
              </li>
              <li>
                <strong>Lower counts (0-20):</strong> Lower broad regional
                mutation rate
              </li>
              <li>
                <strong>Biological significance:</strong> Broad regional
                mutational landscape
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 9,
        header: "Rare10000bp",
        accessor: "rare10000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Rare10000bp:</strong> Number of rare variants (MAF &lt;
              0.05) from BRAVO dataset within a 10kb window around the variant.
              Range: [0, 355] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Rare variants (10kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;80):</strong> Very high regional rare
                variant density
              </li>
              <li>
                <strong>Lower counts (0-20):</strong> Lower broad regional rare
                variant burden
              </li>
              <li>
                <strong>Biological significance:</strong> Broad regional
                constraint patterns
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 10,
        header: "Sngl10000bp",
        accessor: "sngl10000bp",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Sngl10000bp:</strong> Number of singleton variants
              (observed only once) from BRAVO dataset within a 10kb window
              around the variant. Range: [0, 4749] (default: 0).
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-teal-300 px-2 py-1 text-xs font-medium text-teal-900">
                Mutation Density
              </span>
              <span className="text-xs text-muted-foreground">
                Singleton variants (10kb window)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts (&gt;500):</strong> Extremely high broad
                regional mutation activity
              </li>
              <li>
                <strong>Lower counts (0-50):</strong> Lower broad regional
                mutation rate
              </li>
              <li>
                <strong>Biological significance:</strong> Regional patterns of
                very recent mutations
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    name: "Mappability",
    slug: "mappability",
    items: [
      {
        key: 1,
        header: "aPC Mappability",
        accessor: "apc_mappability",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>aPC-Mappability:</strong> Integrative score combining
              sequence mappability measures at different read lengths (k=24, 36,
              50, 100) for unique and multi-mapping reads into a single
              PHRED-scaled score. Range: [0.007, 22.966]. (Li et al., 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (&gt;10):</strong> Better sequence
                mappability
              </li>
              <li>
                <strong>Lower scores:</strong> Poorer sequence mappability
              </li>
              <li>
                <strong>Mappability:</strong> Affects sequencing read alignment
                quality
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 2,
        header: "Umap k100",
        accessor: "k100_umap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Umap k100:</strong> Mappability of unconverted genome
              using 100bp reads. Measures the extent to which a position can be
              uniquely mapped by sequence reads. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Unconverted genome (100bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Unique, reliable
                mapping region
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Repetitive regions,
                unreliable estimates
              </li>
              <li>
                <strong>Technical impact:</strong> Lower values increase
                susceptibility to spurious mapping
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 3,
        header: "Bismap k100",
        accessor: "k100_bismap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Bismap k100:</strong> Mappability of the
              bisulfite-converted genome using 100bp reads. Identifies unique
              mapping regions for bisulfite sequencing, which introduces
              complexity due to C-to-T conversion. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Bisulfite-converted genome (100bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Reliable for
                methylation analysis
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Ambiguous
                methylation calls, multi-mapping reads
              </li>
              <li>
                <strong>Bisulfite context:</strong> C-to-T conversion reduces
                sequence complexity
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 4,
        header: "Umap k50",
        accessor: "k50_umap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Umap k50:</strong> Mappability of unconverted genome using
              50bp reads. Measures the extent to which a position can be
              uniquely mapped by sequence reads. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Unconverted genome (50bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Unique, reliable
                mapping region
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Repetitive regions,
                unreliable estimates
              </li>
              <li>
                <strong>Read length impact:</strong> Shorter reads (50bp) have
                lower mappability than longer reads
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 5,
        header: "Bismap k50",
        accessor: "k50_bismap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Bismap k50:</strong> Mappability of the
              bisulfite-converted genome using 50bp reads. Identifies unique
              mapping regions for bisulfite sequencing, which introduces
              complexity due to C-to-T conversion. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Bisulfite-converted genome (50bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Reliable for
                methylation analysis
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Ambiguous
                methylation calls, multi-mapping reads
              </li>
              <li>
                <strong>Combined effects:</strong> Both shorter reads and
                bisulfite conversion reduce mappability
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 6,
        header: "Umap k36",
        accessor: "k36_umap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Umap k36:</strong> Mappability of unconverted genome using
              36bp reads. Measures the extent to which a position can be
              uniquely mapped by sequence reads. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Unconverted genome (36bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Unique, reliable
                mapping region
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Repetitive regions,
                unreliable estimates
              </li>
              <li>
                <strong>Short reads:</strong> 36bp reads have more mapping
                ambiguity than longer reads
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 7,
        header: "Bismap k36",
        accessor: "k36_bismap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Bismap k36:</strong> Mappability of the
              bisulfite-converted genome using 36bp reads. Identifies unique
              mapping regions for bisulfite sequencing, which introduces
              complexity due to C-to-T conversion. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Bisulfite-converted genome (36bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Reliable for
                methylation analysis
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Ambiguous
                methylation calls, multi-mapping reads
              </li>
              <li>
                <strong>High complexity:</strong> Shortest read length with
                bisulfite conversion challenges
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 8,
        header: "Umap k24",
        accessor: "k24_umap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Umap k24:</strong> Mappability of unconverted genome using
              24bp reads. Measures the extent to which a position can be
              uniquely mapped by sequence reads. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Unconverted genome (24bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Unique, reliable
                mapping region
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Repetitive regions,
                unreliable estimates
              </li>
              <li>
                <strong>Shortest reads:</strong> 24bp reads have highest mapping
                ambiguity
              </li>
            </ul>
          </div>
        ),
      },
      {
        key: 9,
        header: "Bismap k24",
        accessor: "k24_bismap",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Bismap k24:</strong> Mappability of the
              bisulfite-converted genome using 24bp reads. Identifies unique
              mapping regions for bisulfite sequencing, which introduces
              complexity due to C-to-T conversion. Range: [0, 1] (default: 0).
              (Karimzadeh et al., 2018)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-purple-300 px-2 py-1 text-xs font-medium text-purple-900">
                Mappability
              </span>
              <span className="text-xs text-muted-foreground">
                Bisulfite-converted genome (24bp reads)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>High mappability (≥0.8):</strong> Reliable for
                methylation analysis
              </li>
              <li>
                <strong>Low mappability (&lt;0.5):</strong> Ambiguous
                methylation calls, multi-mapping reads
              </li>
              <li>
                <strong>Maximum complexity:</strong> Shortest reads with maximum
                bisulfite mapping challenges
              </li>
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
              <strong>Filter Value:</strong> Quality assessment categories for
              genomic regions based on various sequencing and genomic metrics.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 bg-red-300 rounded flex-shrink-0 mt-0.5"></span>
                <div>
                  <strong>Low:</strong>
                  <div className="mt-1">
                    Low quality regions determined by gnomAD sequencing metrics:
                  </div>
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
                  <div className="mt-1">
                    Pentamer context with abnormal site frequency spectrum
                    (SFS). High-frequency SNVs [0.0005 &lt; MAF ≤ 0.2] exceed
                    1.5× mutation rate controlled average. Often repetitive
                    contexts.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 bg-blue-300 rounded flex-shrink-0 mt-0.5"></span>
                <div>
                  <strong>TFBS:</strong>
                  <div className="mt-1">
                    Transcription factor binding site determined by overlap with
                    ChIP-seq peaks
                  </div>
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
              <strong>PN (Pentanucleotide):</strong> The 5-nucleotide sequence
              context surrounding the variant position, important for
              understanding mutation patterns and rates.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Context dependency:</strong> Mutation rates vary
                significantly based on surrounding nucleotide sequence
              </li>
              <li>
                <strong>Format:</strong> 5-base sequence with variant position
                in center
              </li>
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
              <strong>MR (Mutation Rate):</strong> Roulette mutation rate
              estimate based on sequence context and evolutionary patterns.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher rates:</strong> More mutagenic sequence contexts
              </li>
              <li>
                <strong>Lower rates:</strong> More stable sequence contexts
              </li>
              <li>
                <strong>Application:</strong> Helps distinguish pathogenic
                variants from benign polymorphisms
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "AR",
        accessor: "ar",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>AR (Adjusted Rate):</strong> Adjusted Roulette mutation
              rate estimate that accounts for additional genomic factors beyond
              basic sequence context.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher rates:</strong> Contexts prone to higher mutation
                frequency
              </li>
              <li>
                <strong>Lower rates:</strong> More evolutionarily stable regions
              </li>
              <li>
                <strong>Adjustment factors:</strong> Incorporates chromatin
                structure and replication timing
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 5,
        header: "MG",
        accessor: "mg",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>MG (gnomAD Rate):</strong> Mutation rate estimate from the
              gnomAD consortium based on large-scale population genomic data.
              (Karczewski et al. 2020)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Population-based:</strong> Derived from analysis of
                &gt;140,000 genomes and exomes
              </li>
              <li>
                <strong>Higher rates:</strong> Regions with elevated mutation
                burden
              </li>
              <li>
                <strong>Clinical relevance:</strong> Helps calibrate variant
                interpretation frameworks
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
      },
      {
        key: 6,
        header: "MC",
        accessor: "mc",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>MC (Carlson Rate):</strong> Mutation rate estimate from
              Carlson et al. based on de novo mutation patterns in families.
              (Carlson et al. 2018)
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>De novo focus:</strong> Based on analysis of new
                mutations in parent-offspring trios
              </li>
              <li>
                <strong>Higher rates:</strong> Sequence contexts with increased
                de novo mutation frequency
              </li>
              <li>
                <strong>Complementary approach:</strong> Provides independent
                validation of mutation rate patterns
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          ),
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
              Amino acid change induced by the alternative allele, in the
              format:
            </p>
            <p className="font-mono bg-muted/30 px-2 py-1 rounded">
              {"<Reference amino acid><Position><Alternative amino acid>"}
            </p>
            <p>
              <strong>Example:</strong> V2L means Valine at position 2 changed
              to Leucine
            </p>
            <p>Position is 1-based within the protein amino acid sequence.</p>
          </div>
        ),
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => (
              <span className="font-mono text-xs bg-muted/20 px-2 py-1 rounded">
                {str}
              </span>
            ),
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
              Calibrated AlphaMissense pathogenicity scores ranging between 0
              and 1.
            </p>
            <p>
              <strong>Interpretation:</strong> Can be interpreted as the
              predicted probability of a variant being clinically pathogenic.
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
              Classification of the protein variant into three discrete
              categories:
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
        Cell: (value) =>
          safeCellRenderer(
            value,
            (validValue) => (
              <span className="uppercase">
                {alphamissenseCCODE(validValue.split("_").join(" "))}
              </span>
            ),
            isValidString,
          ),
      },
    ],
  },
  {
    name: "Proximity Table",
    slug: "proximity-table",
    items: [
      {
        key: 1,
        header: "Min Dist TSS",
        accessor: "min_dist_tss",
        tooltip:
          "Distance to closest Transcribed Sequence Start (TSS). Range: [1, 3604058] (default: 1e7).",
      },
      {
        key: 2,
        header: "Min Dist TSE",
        accessor: "min_dist_tse",
        tooltip:
          "Distance to closest Transcribed Sequence End (TSE). Range: [1, 3610636] (default: 1e7).",
      },
    ],
  },
  {
    name: "Cosmic",
    slug: "cosmic",
    items: [
      {
        key: 1,
        header: "Mutation (Amino Acid)",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Mutation (Amino Acid):</strong> The change that has
              occurred in the peptide sequence as a result of the mutation.
              Syntax follows Human Genome Variation Society recommendations.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-orange-300 px-2 py-1 text-xs font-medium text-orange-900">
                COSMIC
              </span>
              <span className="text-xs text-muted-foreground">
                Cancer somatic mutations
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Format:</strong> HGVS protein notation (e.g., p.V600E)
              </li>
              <li>
                <strong>Mutation type:</strong> Shown in brackets after mutation
                string
              </li>
              <li>
                <strong>Clinical relevance:</strong> Links to cancer phenotypes
                and drug responses
              </li>
            </ul>
          </div>
        ),
        accessor: "aa",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (str) => (
              <span className="font-mono text-xs bg-muted/20 px-2 py-1 rounded">
                {str}
              </span>
            ),
            isValidString,
          );
        },
      },
      {
        key: 2,
        header: "Mutation (CDS)",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Mutation (CDS):</strong> The change that has occurred in
              the nucleotide sequence as a result of the mutation. Syntax
              follows HGVS recommendations for coding sequence notation.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-orange-300 px-2 py-1 text-xs font-medium text-orange-900">
                COSMIC
              </span>
              <span className="text-xs text-muted-foreground">
                Coding sequence changes
              </span>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-xs">Mutation Types:</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Nonsense:</strong> Substitution creating stop codon,
                    truncating protein
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Missense:</strong> Substitution changing amino acid
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Coding silent:</strong> Synonymous substitution,
                    same amino acid
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Intronic:</strong> Non-coding region mutation
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Complex:</strong> Multiple insertions, deletions,
                    substitutions
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-1.5"></span>
                  <div>
                    <strong>Unknown:</strong> Insufficient mutation details
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        accessor: "cds",
      },
      {
        key: 3,
        header: "Genome Screen Sample Count",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Genome Screen Sample Count:</strong> The number of samples
              in which this variant has been observed across COSMIC's cancer
              genome screens.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-orange-300 px-2 py-1 text-xs font-medium text-orange-900">
                COSMIC
              </span>
              <span className="text-xs text-muted-foreground">
                Sample frequency
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher counts:</strong> More frequently observed in
                cancer samples
              </li>
              <li>
                <strong>Lower counts:</strong> Rare or novel cancer mutations
              </li>
              <li>
                <strong>Clinical utility:</strong> Frequency informs therapeutic
                targeting strategies
              </li>
            </ul>
          </div>
        ),
        accessor: "genome_screen_sample_count",
      },
      {
        key: 5,
        header: "Is Canonical",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Is Canonical:</strong> Indicates whether this mutation
              affects the Ensembl canonical transcript for the gene.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-orange-300 px-2 py-1 text-xs font-medium text-orange-900">
                COSMIC
              </span>
              <span className="text-xs text-muted-foreground">
                Transcript annotation
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-300 rounded"></span>
                <strong>Yes:</strong> Affects canonical transcript (most
                biologically relevant)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-300 rounded"></span>
                <strong>No:</strong> Affects alternative transcript
              </div>
            </div>
            <p className="text-xs mt-2">
              Canonical transcripts are most conserved, highly expressed, and
              longest coding sequences.
            </p>
          </div>
        ),
        accessor: "is_canonical",
        Cell: (value) => {
          const formatted = value;
          switch (formatted) {
            case "y":
              return (
                <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-label-md font-medium leading-5 text-green-900">
                  Yes
                </span>
              );
            case "n":
              return (
                <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-label-md font-medium leading-5 text-red-900">
                  No
                </span>
              );
          }
        },
      },
    ],
  },
  {
    name: "Splice AI",
    slug: "spliceai",
    items: [
      {
        key: 1,
        header: "Pangolin (Exome)",
        accessor: "pangolin_largest_ds_exome",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Pangolin (Exome):</strong> Pangolin's largest delta score
              across splicing consequences using exome training data. Reflects
              probability of variant affecting splicing.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Splicing
              </span>
              <span className="text-xs text-muted-foreground">
                Exome-trained model
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (≥0.2):</strong> More likely
                splice-altering
              </li>
              <li>
                <strong>Lower scores (&lt;0.1):</strong> Less likely
                splice-altering
              </li>
              <li>
                <strong>Model type:</strong> Deep learning on exome sequencing
                data
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => {
              const percentage = num * 100;
              const label = getPercentageLabel(percentage);
              return (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span>{percentage.toFixed(1)}%</span>
                    <span>({label})</span>
                  </div>
                </div>
              );
            },
            isValidNumber,
          ),
      },
      {
        key: 2,
        header: "Pangolin (Genome)",
        accessor: "pangolin_largest_ds_genome",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>Pangolin (Genome):</strong> Pangolin's largest delta score
              across splicing consequences using genome-wide training data.
              Reflects probability of variant affecting splicing.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Splicing
              </span>
              <span className="text-xs text-muted-foreground">
                Genome-trained model
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (≥0.2):</strong> More likely
                splice-altering
              </li>
              <li>
                <strong>Lower scores (&lt;0.1):</strong> Less likely
                splice-altering
              </li>
              <li>
                <strong>Model type:</strong> Deep learning on whole genome data
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => {
              const percentage = num * 100;
              const label = getPercentageLabel(percentage);
              return (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span>{percentage.toFixed(1)}%</span>
                    <span>({label})</span>
                  </div>
                </div>
              );
            },
            isValidNumber,
          ),
      },
      {
        key: 3,
        header: "Splice AI (Exome)",
        accessor: "spliceai_ds_max_exome",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>SpliceAI (Exome):</strong> Illumina's SpliceAI maximum
              delta score using exome training data. Interpreted as probability
              of splice-altering effects.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Splicing
              </span>
              <span className="text-xs text-muted-foreground">
                SpliceAI exome model
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (≥0.5):</strong> High confidence
                splice-altering
              </li>
              <li>
                <strong>Medium scores (0.2-0.5):</strong> Moderate
                splice-altering potential
              </li>
              <li>
                <strong>Lower scores (&lt;0.2):</strong> Unlikely to affect
                splicing
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => {
              const percentage = num * 100;
              const label = getPercentageLabel(percentage);
              return (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span>{percentage.toFixed(1)}%</span>
                    <span>({label})</span>
                  </div>
                </div>
              );
            },
            isValidNumber,
          ),
      },
      {
        key: 4,
        header: "Splice AI (Genome)",
        accessor: "spliceai_ds_max_exome",
        tooltip: (
          <div className="space-y-2 text-left">
            <p>
              <strong>SpliceAI (Genome):</strong> Illumina's SpliceAI maximum
              delta score using genome-wide training data. Interpreted as
              probability of splice-altering effects.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">
                Splicing
              </span>
              <span className="text-xs text-muted-foreground">
                SpliceAI genome model
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Higher scores (≥0.5):</strong> High confidence
                splice-altering
              </li>
              <li>
                <strong>Medium scores (0.2-0.5):</strong> Moderate
                splice-altering potential
              </li>
              <li>
                <strong>Lower scores (&lt;0.2):</strong> Unlikely to affect
                splicing
              </li>
            </ul>
          </div>
        ),
        Cell: (value) =>
          safeCellRenderer(
            value,
            (num) => {
              const percentage = num * 100;
              const label = getPercentageLabel(percentage);
              return (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span>{percentage.toFixed(1)}%</span>
                    <span>({label})</span>
                  </div>
                </div>
              );
            },
            isValidNumber,
          ),
      },
    ],
  },
];

const getPercentageLabel = (percentage: number) => {
  if (percentage < 20) return "Very Low";
  if (percentage < 40) return "Low";
  if (percentage < 60) return "Medium";
  if (percentage < 80) return "High";
  return "Very High";
};
