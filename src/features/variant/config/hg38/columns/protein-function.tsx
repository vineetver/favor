import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { alphamissenseCCODE, polyphenCCode, metasvmPredCCode } from "@/lib/utils/colors";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export const proteinFunctionConfig = helper.group(
  "protein-function",
  "Protein Function",
  [
    helper.accessor("apc_protein_function_v3", {
      header: "aPC-Protein Function",
      description:
        "Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("polyphen_cat", {
      header: "PolyPhenCat",
      description: "PolyPhen category of change. (Adzhubei et al., 2010)",
      cell: helper.format.custom((val) => (
        <div>{polyphenCCode(val.split("_").join(" "))} </div>
      )),
    }),
    helper.accessor("polyphen_val", {
      header: "PolyPhenVal",
      description:
        "PolyPhen score: It predicts the functional significance of an allele replacement from its individual features. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("polyphen2_hdiv_score", {
      header: "PolyPhen2 HDIV",
      description:
        "PolyPhen2 HumDiv: Predicts amino acid substitution impact on protein structure and function. Trained on Mendelian disease variants vs. evolutionarily divergent variants from close mammalian species. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("polyphen2_hvar_score", {
      header: "PolyPhen2 HVAR",
      description:
        "PolyPhen2 HumVar: Predicts amino acid substitution impact on protein structure and function. Trained on human disease variants vs. common polymorphisms (MAF ≥1%) with no known disease association. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("grantham", {
      header: "Grantham",
      description:
        "Grantham Score: Measures evolutionary distance between original and new amino acids based on chemical properties (polarity, molecular volume, composition). Higher scores indicate greater chemical difference and potential functional impact. Range: [0, 215] (default: 0). (Grantham, 1974)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("mutation_taster_score", {
      header: "Mutation Taster",
      description:
        "MutationTaster is a free web-based application to evaluate DNA sequence variants for their disease-causing potential. The software performs a battery of in silico tests to estimate the impact of the variant on the gene product/protein. Range: [0, 1] (default: 0). (Schwarz et al., 2014)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("mutation_assessor_score", {
      header: "Mutation Assessor",
      description:
        "Predicts the functional impact of amino-acid substitutions in proteins, such as mutations discovered in cancer or missense polymorphisms. Range: [-5.135, 6.125] (default: -5.545). (Reva et al., 2011)",
      cell: helper.format.custom((num) => <span>{roundNumber(num)} </span>),
    }),
    helper.accessor("metasvm_pred", {
      header: "MetaSVM Prediction",
      description: (
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
      cell: helper.format.badge<Variant>(
        [
          [/(D)/i, "red"],
          [/(T)/i, "green"],
        ],
        "gray",
        { D: "Deleterious", T: "Tolerated" },
      ),
    }),
    helper.accessor("sift_cat", {
      header: "SIFTcat",
      description: "SIFT category of change. (Ng and Henikoff, 2003)",
      cell: helper.format.custom((val) => {
        if (val.match(/(deleterious)/i)) {
          return (
            <span className="inline-flex rounded-full bg-red-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-red-900">
              {val}
            </span>
          );
        } else if (val.match(/(tolerated)/i)) {
          return (
            <span className="inline-flex rounded-full bg-green-300 px-2.5 py-1 text-center text-label-md font-medium capitalize leading-5 text-green-900">
              {val}
            </span>
          );
        }
        return val;
      }),
    }),
    helper.accessor("sift_val", {
      header: "SIFTval",
      description:
        "SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated). Range: [0, 1] (default: 1). (Ng and Henikoff, 2003)",
    }),
    helper.accessor("protein_variant", {
      header: "Protein Variant",
      description:
        "Amino acid change induced by the alternative allele, in the format: <Reference amino acid><Position><Alternative amino acid>",
      cell: helper.format.custom((str) => (
        <span className="font-mono text-xs bg-muted/20 px-2 py-1 rounded">
          {str}
        </span>
      )),
    }),
    helper.accessor("am_pathogenicity", {
      header: "AM Pathogenicity",
      description:
        "Calibrated AlphaMissense pathogenicity scores ranging between 0 and 1.",
      cell: helper.format.custom((str) => (
        <span className="font-mono"> {str} </span>
      )),
    }),
    helper.accessor("am_class", {
      header: "AM Class",
      description:
        "Classification of the protein variant into three discrete categories: Likely Benign, Likely Pathogenic, Ambiguous.",
      cell: helper.format.custom((val) => (
        <span className="uppercase">
          {alphamissenseCCODE(val?.split("_").join(" ") ?? "")}
        </span>
      )),
    }),
  ],
);
