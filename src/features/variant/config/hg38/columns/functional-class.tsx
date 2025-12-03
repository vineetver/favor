import { GencodeExonicInfo } from "@/features/variant/components/gencode-exonic-info";
import { Variant } from "@/features/variant/types/types";
import { createColumnHelper } from "@/lib/data-display/builder";
import {
  cageEnhancerCCode,
  cagePromoterCCode,
  genecodeCompExonicCategoryCCode,
  metasvmPredCCode,
} from "@/lib/utils/colors";

const helper = createColumnHelper<Variant>();

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
      description: (
        <div className="space-y-2 text-left">
          <p>
            Identify whether variants cause protein coding changes using Gencode
            genes definition systems, it will label the gene name of the
            variants has impact, if it is intergenic region, the nearby gene
            name will be labeled in the annotation. (Frankish et al., 2018;
            Harrow et al., 2012)
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
      cell: helper.format.badge<Variant>(
        [
          [/(exonic)/i, "stone"],
          [/(UTR)/i, "indigo"],
          [/(intronic)/i, "lime"],
          [/(downstream)/i, "teal"],
          [/(intergenic)/i, "cyan"],
          [/^upstream$/, "sky"],
          [/(splicing)/i, "yellow"],
        ],
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
      description:
        "Identify variants impact using Gencode exonic definition, and only label exonic categorical information like, synonymous, non-synonymous, frame-shifts indels, etc. (Frankish et al., 2018; Harrow et al., 2012)",
      cell: helper.format.badge<Variant>([
        [/(stopgain)/i, "stone"],
        [/(stoploss)/i, "rose"],
        [/(unknown)/i, "indigo"],
        [/(nonframeshift substitution)/i, "lime"],
        [/(synonymous SNV)/i, "emerald"],
        [/(nonframeshift insertion)/i, "teal"],
        [/(frameshift substitution)/i, "yellow"],
        [/(frameshift deletion)/i, "sky"],
        [/(frameshift insertion)/i, "orange"],
        [/(nonframeshift deletion)/i, "cyan"],
      ]),
    }),
    helper.accessor("metasvm_pred", {
      header: "MetaSVM Prediction",
      description:
        'Identify whether the variant is a disruptive missense variant, defined as "disruptive" by the ensemble MetaSVM annotation. (Dong et al., 2014)',
      cell: helper.format.custom((val) => metasvmPredCCode(val)),
    }),
    helper.accessor("cage_promoter", {
      header: "CAGE Promoter",
      description:
        "CAGE defined promoter sites from Fantom 5. (Forrest et al., 2014)",
      cell: helper.format.custom((val) => (
        <span>{cagePromoterCCode(val)} </span>
      )),
    }),
    helper.accessor("cage_enhancer", {
      header: "CAGE Enhancer",
      description:
        "CAGE defined enhancer sites from Fantom 5. (Forrest et al., 2014)",
      cell: helper.format.custom((val) => (
        <span>{cageEnhancerCCode(val)} </span>
      )),
    }),
    helper.accessor("genehancer", {
      header: "GeneHancer",
      description:
        "Predicted human enhancer sites from the GeneHancer database. (Fishilevich et al., 2017)",
      cell: helper.format.custom((val) => (
        <div>{val?.split(";").slice(0, 4).join(", ")} </div>
      )),
    }),
    helper.accessor("super_enhancer", {
      header: "Super Enhancer",
      description:
        "Predicted super-enhancer sites and targets in a range of human cell types. (Hnisz et al., 2013)",
    }),
    helper.accessor("ucsc_info", {
      header: "UCSC Info",
      description:
        "Identify whether variants cause protein coding changes using UCSC genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
      cell: helper.format.list(","),
    }),
    helper.accessor("ucsc_exonic_info", {
      header: "UCSC Exonic Info",
      description:
        "Identify variants cause protein coding changes using UCSC genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      cell: helper.format.list(","),
    }),
    helper.accessor("refseq_info", {
      header: "RefSeq Info",
      description:
        "Identify whether variants cause protein coding changes using RefSeq genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation.",
      cell: helper.format.list(","),
    }),
    helper.accessor("refseq_exonic_info", {
      header: "RefSeq Exonic Info",
      description:
        "Identify variants cause protein coding changes using RefSeq genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes.",
      cell: helper.format.list(","),
    }),
  ],
);
