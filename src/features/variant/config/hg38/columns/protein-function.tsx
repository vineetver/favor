import { ArrowRight } from "lucide-react";
import type { Variant } from "../../../types/types";
import { createColumns, cell, categories, tooltip } from "@/lib/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

// ============================================================================
// Category Definitions
// ============================================================================

const polyphen = categories([
  { label: "Probably Damaging", match: /probably[_\s]damaging/i, color: "red", description: "likely to affect protein function" },
  { label: "Possibly Damaging", match: /possibly[_\s]damaging/i, color: "orange", description: "may affect protein function" },
  { label: "Benign", match: /benign/i, color: "green", description: "likely to have no functional impact" },
  { label: "Unknown", match: /unknown/i, color: "gray", description: "insufficient data for prediction" },
]);

const sift = categories([
  { label: "Deleterious", match: /^deleterious$/i, color: "red", description: "likely to affect protein function" },
  { label: "Deleterious (Low Confidence)", match: /deleterious.*low/i, color: "orange", description: "may affect protein function" },
  { label: "Tolerated", match: /^tolerated$/i, color: "green", description: "likely to have no functional impact" },
  { label: "Tolerated (Low Confidence)", match: /tolerated.*low/i, color: "lime", description: "may have no functional impact" },
]);

const metasvm = categories([
  { label: "Deleterious", match: /(D)/i, color: "red", description: "likely to affect protein function" },
  { label: "Tolerated", match: /(T)/i, color: "green", description: "unlikely to affect protein function" },
]);

const alphaMissense = categories([
  { label: "Likely Pathogenic", match: /likely[_\s]pathogenic/i, color: "red", description: "pathogenicity > 0.564" },
  { label: "Ambiguous", match: /ambiguous/i, color: "yellow", description: "pathogenicity between 0.34-0.564" },
  { label: "Likely Benign", match: /likely[_\s]benign/i, color: "green", description: "pathogenicity < 0.34" },
]);

// ============================================================================
// Custom Cell Renderers
// ============================================================================

function ProteinVariant({ value }: { value: string }) {
  const match = value.match(/^([A-Z])(\d+)([A-Z])$/);
  if (match) {
    const [, ref, pos, alt] = match;
    return (
      <div className="flex items-center gap-1.5 font-mono text-sm">
        <span className="text-muted-foreground">{ref}</span>
        <span className="text-sm bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{pos}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-foreground">{alt}</span>
      </div>
    );
  }
  return <span className="font-mono bg-muted/20 px-2 py-1 rounded">{value}</span>;
}

// ============================================================================
// Column Definitions
// ============================================================================

export const proteinFunctionColumns = [
  apcColumns.proteinFunction,

  col.accessor("polyphen_cat", {
    accessor: "polyphen_cat",
    header: "PolyPhenCat",
    description: tooltip({
      title: "PolyPhen Category",
      description: "PolyPhen category of change.",
      citation: "Adzhubei et al., 2010",
      categories: polyphen,
    }),
    cell: cell.badge(polyphen),
  }),

  col.accessor("polyphen_val", {
    accessor: "polyphen_val",
    header: "PolyPhenVal",
    description: tooltip({
      title: "PolyPhen Score",
      description: "PolyPhen score: It predicts the functional significance of an allele replacement from its individual features.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.8)", meaning: "More likely damaging" },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("polyphen2_hdiv_score", {
    accessor: "polyphen2_hdiv_score",
    header: "PolyPhen2 HDIV",
    description: tooltip({
      title: "PolyPhen2 HumDiv",
      description: "Predicts amino acid substitution impact on protein structure and function. Trained on Mendelian disease variants vs. evolutionarily divergent variants from close mammalian species.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.8)", meaning: "More likely damaging" },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("polyphen2_hvar_score", {
    accessor: "polyphen2_hvar_score",
    header: "PolyPhen2 HVAR",
    description: tooltip({
      title: "PolyPhen2 HumVar",
      description: "Predicts amino acid substitution impact on protein structure and function. Trained on human disease variants vs. common polymorphisms (MAF ≥1%) with no known disease association.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.8)", meaning: "More likely damaging" },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("grantham", {
    accessor: "grantham",
    header: "Grantham",
    description: tooltip({
      title: "Grantham Score",
      description: "Measures evolutionary distance between original and new amino acids based on chemical properties (polarity, molecular volume, composition). Higher scores indicate greater chemical difference and potential functional impact.",
      range: "[0, 215]",
      defaultValue: "0",
      citation: "Grantham, 1974",
      guides: [
        { threshold: "Higher scores (>100)", meaning: "Greater chemical difference, more deleterious" },
        { threshold: "Lower scores", meaning: "Less chemical difference, more tolerated" },
        { threshold: "Thresholds", meaning: "Conservative (0-50), moderate (51-100), radical (>100)" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("mutation_taster_score", {
    accessor: "mutation_taster_score",
    header: "Mutation Taster",
    description: tooltip({
      title: "MutationTaster",
      description: "MutationTaster is a free web-based application to evaluate DNA sequence variants for their disease-causing potential. The software performs a battery of in silico tests to estimate the impact of the variant on the gene product/protein.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Schwarz et al., 2014",
      guides: [
        { threshold: "Higher scores (>0.8)", meaning: "More likely disease-causing" },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("mutation_assessor_score", {
    accessor: "mutation_assessor_score",
    header: "Mutation Assessor",
    description: tooltip({
      title: "MutationAssessor",
      description: "Predicts the functional impact of amino-acid substitutions in proteins, such as mutations discovered in cancer or missense polymorphisms.",
      range: "[-5.135, 6.125]",
      defaultValue: "-5.545",
      citation: "Reva et al., 2011",
      guides: [
        { threshold: "Higher scores (>3)", meaning: "More likely functional impact" },
        { threshold: "Lower scores", meaning: "Less likely functional impact" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("metasvm_pred", {
    accessor: "metasvm_pred",
    header: "MetaSVM Prediction",
    description: tooltip({
      title: "MetaSVM Prediction",
      description: "Identifies disruptive missense variants using ensemble MetaSVM annotation.",
      citation: "Dong et al., 2014",
      categories: metasvm,
    }),
    cell: cell.badgeMap({ D: "red", T: "green" }, { D: "Deleterious", T: "Tolerated" }),
  }),

  col.accessor("sift_cat", {
    accessor: "sift_cat",
    header: "SIFTcat",
    description: tooltip({
      title: "SIFT Category",
      description: "SIFT category of change.",
      citation: "Ng and Henikoff, 2003",
      categories: sift,
    }),
    cell: cell.badge(sift),
  }),

  col.accessor("sift_val", {
    accessor: "sift_val",
    header: "SIFTval",
    description: tooltip({
      title: "SIFT Score",
      description: "SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated).",
      range: "[0, 1]",
      defaultValue: "1",
      citation: "Ng and Henikoff, 2003",
      guides: [
        { threshold: "Lower scores (0.0-0.05)", meaning: "More likely deleterious" },
        { threshold: "Higher scores (>0.05)", meaning: "More likely tolerated" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("protein_variant", {
    accessor: "protein_variant",
    header: "Protein Variant",
    description: tooltip({
      title: "Protein Variant",
      description: "Amino acid change induced by the alternative allele, in the format: AlphaMissense Protein variant notation. Example: V2L means Valine at position 2 changed to Leucine. Position is 1-based within the protein amino acid sequence.",
    }),
    cell: cell.custom((val: string) => <ProteinVariant value={val} />),
  }),

  col.accessor("am_pathogenicity", {
    accessor: "am_pathogenicity",
    header: "AM Pathogenicity",
    description: tooltip({
      title: "AlphaMissense Pathogenicity",
      description: "Calibrated AlphaMissense pathogenicity scores ranging between 0 and 1. Can be interpreted as the predicted probability of a variant being clinically pathogenic.",
      guides: [
        { threshold: "Higher scores", meaning: "More likely pathogenic" },
        { threshold: "Lower scores", meaning: "More likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("am_class", {
    accessor: "am_class",
    header: "AM Class",
    description: tooltip({
      title: "AlphaMissense Classification",
      description: "Classification of the protein variant into three discrete categories based on pathogenicity score.",
      categories: alphaMissense,
    }),
    cell: cell.badge(alphaMissense),
  }),
];

export const proteinFunctionGroup = col.group("protein-function", "Protein Function", proteinFunctionColumns);
