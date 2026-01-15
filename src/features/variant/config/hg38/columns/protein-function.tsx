import { ArrowRight } from "lucide-react";
import type { Variant } from "@/features/variant/types";
import { createColumns, cell, categories, tooltip } from "@/lib/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

// ============================================================================
// Category Definitions
// ============================================================================

const alphaMissense = categories([
  { label: "Likely Pathogenic", match: /likely[_\s]pathogenic/i, color: "red", description: "pathogenicity > 0.564" },
  { label: "Ambiguous", match: /ambiguous/i, color: "yellow", description: "pathogenicity between 0.34-0.564" },
  { label: "Likely Benign", match: /likely[_\s]benign/i, color: "green", description: "pathogenicity < 0.34" },
]);

const sift = categories([
  { label: "Deleterious", match: /^deleterious$/i, color: "red", description: "likely to affect protein function" },
  { label: "Deleterious (Low Confidence)", match: /deleterious.*low/i, color: "orange", description: "may affect protein function" },
  { label: "Tolerated", match: /^tolerated$/i, color: "green", description: "likely to have no functional impact" },
  { label: "Tolerated (Low Confidence)", match: /tolerated.*low/i, color: "lime", description: "may have no functional impact" },
]);

const polyphen = categories([
  { label: "Probably Damaging", match: /probably[_\s]damaging/i, color: "red", description: "likely to affect protein function" },
  { label: "Possibly Damaging", match: /possibly[_\s]damaging/i, color: "orange", description: "may affect protein function" },
  { label: "Benign", match: /benign/i, color: "green", description: "likely to have no functional impact" },
  { label: "Unknown", match: /unknown/i, color: "gray", description: "insufficient data for prediction" },
]);

const metasvm = categories([
  { label: "Deleterious", match: /(D)/i, color: "red", description: "likely to affect protein function" },
  { label: "Tolerated", match: /(T)/i, color: "green", description: "unlikely to affect protein function" },
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
// Column Definitions - Predictions first, then Scores (mutation rate priority)
// ============================================================================

export const proteinFunctionColumns = [
  // Integrative score
  apcColumns.proteinFunction,

  // ============================================================================
  // CATEGORICAL PREDICTIONS (badges)
  // ============================================================================

  col.accessor("am_class", {
    accessor: "am_class",
    header: "AlphaMissense Class",
    description: tooltip({
      title: "AlphaMissense Classification",
      description: "Classification of the protein variant into three discrete categories based on pathogenicity score.",
      categories: alphaMissense,
    }),
    cell: cell.badge(alphaMissense),
  }),

  col.accessor("sift_cat", {
    accessor: "sift_cat",
    header: "SIFT Prediction",
    description: tooltip({
      title: "SIFT Prediction",
      description: "SIFT predicts whether an amino acid substitution affects protein function based on sequence homology and physical properties.",
      citation: "Ng and Henikoff, 2003",
      categories: sift,
    }),
    cell: cell.badge(sift),
  }),

  col.accessor("polyphen_cat", {
    accessor: "polyphen_cat",
    header: "PolyPhen Prediction",
    description: tooltip({
      title: "PolyPhen Prediction",
      description: "PolyPhen predicts the functional significance of an allele replacement using physical and comparative considerations.",
      citation: "Adzhubei et al., 2010",
      categories: polyphen,
    }),
    cell: cell.badge(polyphen),
  }),

  col.accessor("metasvm_pred", {
    accessor: "metasvm_pred",
    header: "MetaSVM Prediction",
    description: tooltip({
      title: "MetaSVM Prediction",
      description: "Ensemble method combining multiple predictors (SIFT, PolyPhen2, MutationTaster, etc.) using support vector machine to identify disruptive missense variants.",
      citation: "Dong et al., 2014",
      categories: metasvm,
    }),
    cell: cell.badge(metasvm),
  }),

  // ============================================================================
  // NUMERIC SCORES (mutation rate first, then pathogenicity scores)
  // ============================================================================

  col.accessor("mutation_taster_score", {
    accessor: "mutation_taster_score",
    header: "MutationTaster Score",
    description: tooltip({
      title: "MutationTaster Score",
      description: "Evaluates DNA sequence variants for disease-causing potential using multiple in silico tests including evolutionary conservation, splice site changes, and protein features.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Schwarz et al., 2014",
      guides: [
        { threshold: "Higher scores (>0.5)", meaning: "More likely disease-causing" },
        { threshold: "Lower scores (<0.5)", meaning: "More likely polymorphism" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("mutation_assessor_score", {
    accessor: "mutation_assessor_score",
    header: "MutationAssessor Score",
    description: tooltip({
      title: "MutationAssessor Score",
      description: "Predicts functional impact of amino-acid substitutions based on evolutionary conservation patterns in protein families.",
      range: "[-5.135, 6.125]",
      defaultValue: "-5.545",
      citation: "Reva et al., 2011",
      guides: [
        { threshold: "High (>3.5)", meaning: "High functional impact" },
        { threshold: "Medium (1.935-3.5)", meaning: "Medium functional impact" },
        { threshold: "Low (-0.65-1.935)", meaning: "Low functional impact" },
        { threshold: "Neutral (<-0.65)", meaning: "Neutral" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("am_pathogenicity", {
    accessor: "am_pathogenicity",
    header: "AlphaMissense Score",
    description: tooltip({
      title: "AlphaMissense Pathogenicity",
      description: "Calibrated AlphaMissense pathogenicity scores ranging between 0 and 1. Can be interpreted as the predicted probability of a variant being clinically pathogenic.",
      range: "[0, 1]",
      guides: [
        { threshold: "Higher scores (>0.564)", meaning: "Likely pathogenic" },
        { threshold: "Middle scores (0.34-0.564)", meaning: "Ambiguous" },
        { threshold: "Lower scores (<0.34)", meaning: "Likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("sift_val", {
    accessor: "sift_val",
    header: "SIFT Score",
    description: tooltip({
      title: "SIFT Score",
      description: "SIFT score ranges from 0.0 (deleterious) to 1.0 (tolerated). Lower scores indicate higher likelihood of functional impact.",
      range: "[0, 1]",
      defaultValue: "1",
      citation: "Ng and Henikoff, 2003",
      guides: [
        { threshold: "Lower scores (<0.05)", meaning: "Deleterious - affects protein function" },
        { threshold: "Higher scores (≥0.05)", meaning: "Tolerated - likely benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("polyphen_val", {
    accessor: "polyphen_val",
    header: "PolyPhen Score",
    description: tooltip({
      title: "PolyPhen Score",
      description: "PolyPhen score predicting functional significance of an allele replacement from its individual features.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.908)", meaning: "Probably damaging" },
        { threshold: "Medium scores (0.446-0.908)", meaning: "Possibly damaging" },
        { threshold: "Lower scores (<0.446)", meaning: "Benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("polyphen2_hdiv_score", {
    accessor: "polyphen2_hdiv_score",
    header: "PolyPhen2 HumDiv",
    description: tooltip({
      title: "PolyPhen2 HumDiv",
      description: "Predicts amino acid substitution impact. Trained on Mendelian disease variants vs. evolutionarily divergent variants from close mammalian species. Better for evaluating rare alleles and Mendelian disease.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.957)", meaning: "Probably damaging" },
        { threshold: "Medium scores (0.453-0.957)", meaning: "Possibly damaging" },
        { threshold: "Lower scores (<0.453)", meaning: "Benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("polyphen2_hvar_score", {
    accessor: "polyphen2_hvar_score",
    header: "PolyPhen2 HumVar",
    description: tooltip({
      title: "PolyPhen2 HumVar",
      description: "Predicts amino acid substitution impact. Trained on human disease variants vs. common polymorphisms (MAF ≥1%). Better for distinguishing disease mutations from common genetic variation.",
      range: "[0, 1]",
      defaultValue: "0",
      citation: "Adzhubei et al., 2010",
      guides: [
        { threshold: "Higher scores (>0.909)", meaning: "Probably damaging" },
        { threshold: "Medium scores (0.447-0.909)", meaning: "Possibly damaging" },
        { threshold: "Lower scores (<0.447)", meaning: "Benign" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("grantham", {
    accessor: "grantham",
    header: "Grantham Score",
    description: tooltip({
      title: "Grantham Score",
      description: "Measures evolutionary distance between original and new amino acids based on chemical properties (polarity, molecular volume, composition).",
      range: "[0, 215]",
      defaultValue: "0",
      citation: "Grantham, 1974",
      guides: [
        { threshold: "Radical (>100)", meaning: "Large chemical difference, more deleterious" },
        { threshold: "Moderate (51-100)", meaning: "Moderate chemical difference" },
        { threshold: "Conservative (0-50)", meaning: "Small chemical difference, more tolerated" },
      ],
    }),
    cell: cell.decimal(0),
  }),
];

export const proteinFunctionGroup = col.group("protein-function", "Protein Function", proteinFunctionColumns);
