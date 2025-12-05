import { ArrowRight } from "lucide-react";
import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { roundNumber } from "@/lib/data-display/helpers";
import {
  renderCategoryDescription,
  getBadgeColorMap,
  type CategoryItem,
} from "@/lib/data-display/category-helper";

const helper = createColumnHelper<Variant>();

const POLYPHEN_CATEGORIES: CategoryItem[] = [
  {
    label: "Benign",
    pattern: /benign/i,
    color: "green",
    description: "most likely lacking any phenotypic effect",
  },
  {
    label: "Possibly Damaging",
    pattern: /possibly[_\s]damaging/i,
    color: "orange",
    description: "supposed to affect protein function or structure",
  },
  {
    label: "Probably Damaging",
    pattern: /probably[_\s]damaging/i,
    color: "red",
    description: "high confidence of affecting protein function or structure",
  },
  {
    label: "Unknown",
    pattern: /unknown/i,
    color: "gray",
    description: "prediction unknown",
  },
];

const SIFT_CATEGORIES: CategoryItem[] = [
  {
    label: "Tolerated",
    pattern: /tolerated/i,
    color: "green",
    description: "amino acid change is tolerated",
  },
  {
    label: "Deleterious",
    pattern: /deleterious/i,
    color: "red",
    description: "amino acid change is damaging",
  },
];

const METASVM_CATEGORIES: CategoryItem[] = [
  {
    label: "Deleterious",
    pattern: /(D)/i,
    color: "red",
    description: "likely to affect protein function",
  },
  {
    label: "Tolerated",
    pattern: /(T)/i,
    color: "green",
    description: "unlikely to affect protein function",
  },
];

const AM_CLASS_CATEGORIES: CategoryItem[] = [
  {
    label: "Likely Benign",
    pattern: /likely[_\s]benign/i,
    color: "green",
    description: "variant is likely benign",
  },
  {
    label: "Likely Pathogenic",
    pattern: /likely[_\s]pathogenic/i,
    color: "red",
    description: "variant is likely pathogenic",
  },
  {
    label: "Ambiguous",
    pattern: /ambiguous/i,
    color: "yellow",
    description: "variant classification is ambiguous",
  },
];

export const proteinFunctionConfig = helper.group(
  "protein-function",
  "Protein Function",
  [
    helper.accessor("apc_protein_function_v3", {
      header: "aPC-Protein Function",
      description:
        "Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)",
      cell: helper.format.custom((num) => <span>{roundNumber(num, 6, true)} </span>),
    }),
    helper.accessor("polyphen_cat", {
      header: "PolyPhenCat",
      description: renderCategoryDescription(
        <p>PolyPhen category of change. (Adzhubei et al., 2010)</p>,
        POLYPHEN_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(POLYPHEN_CATEGORIES),
        "gray",
      ),
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
      description: renderCategoryDescription(
        <p>
          Identify whether the variant is a disruptive missense variant, defined
          as "disruptive" by the ensemble MetaSVM annotation. (Dong et al.,
          2014)
        </p>,
        METASVM_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(METASVM_CATEGORIES),
        "gray",
        { D: "Deleterious", T: "Tolerated" },
      ),
    }),
    helper.accessor("sift_cat", {
      header: "SIFTcat",
      description: renderCategoryDescription(
        <p>SIFT category of change. (Ng and Henikoff, 2003)</p>,
        SIFT_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(SIFT_CATEGORIES),
        "gray",
      ),
    }),
    helper.accessor("sift_val", {
      header: "SIFTval",
      description:
        "SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated). Range: [0, 1] (default: 1). (Ng and Henikoff, 2003)",
    }),
    helper.accessor("protein_variant", {
      header: "AlphaMissense Protein Variant",
      description:
        "Amino acid change induced by the alternative allele, in the format: <Reference amino acid><Position><Alternative amino acid>",
      cell: helper.format.custom((str) => {
        if (!str) return "-";
        // Parse format like "R176C" -> Ref: R, Pos: 176, Alt: C
        const match = str.match(/^([A-Z])(\d+)([A-Z])$/);
        if (match) {
          const [, ref, pos, alt] = match;
          return (
            <div className="flex items-center gap-1.5 font-mono text-sm">
              <span className="text-muted-foreground">{ref}</span>
              <span className="text-sm bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {pos}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-foreground">{alt}</span>
            </div>
          );
        }
        return (
          <span className="font-mono bg-muted/20 px-2 py-1 rounded">
            {str}
          </span>
        );
      }),
    }),
    helper.accessor("am_pathogenicity", {
      header: "AlphaMissense Pathogenicity",
      description:
        "Calibrated AlphaMissense pathogenicity scores ranging between 0 and 1.",
      cell: helper.format.custom((str) => (
        <span className="font-mono"> {str} </span>
      )),
    }),
    helper.accessor("am_class", {
      header: "AlphaMissense Class",
      description: renderCategoryDescription(
        <p>
          Classification of the protein variant into three discrete categories:
          Likely Benign, Likely Pathogenic, Ambiguous.
        </p>,
        AM_CLASS_CATEGORIES,
      ),
      cell: helper.format.badge<Variant>(
        getBadgeColorMap(AM_CLASS_CATEGORIES),
        "gray",
      ),
    }),
  ],
);
