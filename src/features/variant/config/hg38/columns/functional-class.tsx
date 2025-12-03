import { Variant } from "@/features/variant/types/types";
import { createColumnHelper } from "@/lib/data-display/builder";
import {
  cageEnhancerCCode,
  cagePromoterCCode,
  genecodeCompExonicCategoryCCode,
  genecodeComprehensiveCategoryCCode,
  metasvmPredCCode,
} from "@/lib/utils/colors";

const helper = createColumnHelper<Variant>();

export const functionalClassConfig = helper.group("functional-class", "Functional Class", [
  helper.accessor("genecode_comprehensive_info", {
    header: "Genecode Comprehensive Info",
    description:
      "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)",
  }),
  helper.accessor("genecode_comprehensive_category", {
    header: "Genecode Comprehensive Category",
    description:
      "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)",
    cell: helper.format.custom((val) => (
      <div>{genecodeComprehensiveCategoryCCode(val)} </div>
    )),
  }),
  helper.accessor("genecode_comprehensive_exonic_info", {
    header: "Genecode Comprehensive Exonic Info",
    description:
      "Identify variants cause protein coding changes using Gencode genes definition, and gives out detail annotation information of which exons of the variant has impacts on and how the impacts causes changes in amino acid changes. (Frankish et al., 2018; Harrow et al., 2012)",
    cell: helper.format.list(","),
  }),
  helper.accessor("genecode_comprehensive_exonic_category", {
    header: "Genecode Comprehensive Exonic Category",
    description:
      "Identify variants impact using Gencode exonic definition, and only label exonic categorical information like, synonymous, non-synonymous, frame-shifts indels, etc. (Frankish et al., 2018; Harrow et al., 2012)",
    cell: helper.format.custom((val) => (
      <div>{genecodeCompExonicCategoryCCode(val)} </div>
    )),
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
    cell: helper.format.custom((val) => <span>{cagePromoterCCode(val)} </span>),
  }),
  helper.accessor("cage_enhancer", {
    header: "CAGE Enhancer",
    description:
      "CAGE defined enhancer sites from Fantom 5. (Forrest et al., 2014)",
    cell: helper.format.custom((val) => <span>{cageEnhancerCCode(val)} </span>),
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
]);
