import type { OpenTargetsVariantEffectRow } from "@/features/variant/types/opentargets";
import { createColumns, categories, tooltip, Badge } from "@/lib/table/column-builder";
import { ExternalLink } from "@/components/ui/external-link";

const col = createColumns<OpenTargetsVariantEffectRow>();

// Assessment categories for pathogenicity predictions
const assessmentCategories = categories([
  { label: "Pathogenic", match: /pathogenic|deleterious|damaging/i, color: "red", description: "Predicted to be pathogenic or functionally damaging" },
  { label: "Benign", match: /benign|tolerated|neutral/i, color: "green", description: "Predicted to be benign or tolerated" },
  { label: "Uncertain", match: /uncertain|possibly|vus/i, color: "amber", description: "Uncertain significance or possibly damaging" },
]);

// Method categories for prediction tools
const methodCategories = categories([
  { label: "CADD", match: "CADD", color: "blue", description: "Combined Annotation Dependent Depletion" },
  { label: "AlphaMissense", match: "AlphaMissense", color: "violet", description: "AlphaFold-based missense pathogenicity predictor" },
  { label: "SIFT", match: "SIFT", color: "teal", description: "Sorting Intolerant From Tolerant" },
  { label: "PolyPhen", match: /PolyPhen/i, color: "cyan", description: "Polymorphism Phenotyping" },
  { label: "REVEL", match: "REVEL", color: "purple", description: "Rare Exome Variant Ensemble Learner" },
  { label: "EVE", match: "EVE", color: "fuchsia", description: "Evolutionary model of Variant Effect" },
]);

export const openTargetsVariantEffectsColumns = [
  col.display("method", {
    header: "Method",
    description: tooltip({
      title: "Prediction Method",
      description: "Computational method used for pathogenicity prediction.",
      categories: methodCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.method;
      const color = methodCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("assessment", {
    header: "Assessment",
    description: tooltip({
      title: "Pathogenicity Assessment",
      description: "Predicted functional impact classification.",
      categories: assessmentCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.assessment;
      if (!val) return "-";
      const color = assessmentCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("score", {
    header: "Raw Score",
    description: tooltip({
      title: "Raw Prediction Score",
      description: "Original score from the prediction method. Interpretation varies by method.",
    }),
    cell: ({ row }) => {
      const val = row.original.score;
      if (val === null) return "-";
      return <span className="font-mono text-sm">{val.toFixed(4)}</span>;
    },
  }),

  col.display("normalisedScore", {
    header: "Normalised",
    description: tooltip({
      title: "Normalised Score",
      description: "Score normalized to a 0-1 scale for cross-method comparison. Higher values indicate greater predicted pathogenicity.",
      range: "[0, 1]",
      guides: [
        { threshold: "> 0.8", meaning: "Likely pathogenic" },
        { threshold: "0.5 - 0.8", meaning: "Possibly pathogenic" },
        { threshold: "0.2 - 0.5", meaning: "Uncertain" },
        { threshold: "< 0.2", meaning: "Likely benign" },
      ],
    }),
    cell: ({ row }) => {
      const score = row.original.normalisedScore;
      if (score === null) return "-";
      const color = score > 0.8 ? "red" : score > 0.5 ? "orange" : score > 0.2 ? "amber" : "green";
      return (
        <Badge color={color}>
          {score.toFixed(4)}
        </Badge>
      );
    },
  }),

  col.display("assessmentFlag", {
    header: "Flag",
    description: tooltip({
      title: "Assessment Flag",
      description: "Additional flags or warnings from the prediction method.",
    }),
    cell: ({ row }) => {
      const val = row.original.assessmentFlag;
      if (!val) return "-";
      return <Badge color="amber">{val}</Badge>;
    },
  }),

  col.display("targetSymbol", {
    header: "Target",
    description: tooltip({
      title: "Target Gene",
      description: "Gene affected by this variant, if protein-coding.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.targetSymbol;
      const targetId = row.original.targetId;
      if (!symbol) return "-";
      if (targetId) {
        return (
          <ExternalLink href={`https://platform.opentargets.org/target/${targetId}`}>
            {symbol}
          </ExternalLink>
        );
      }
      return <span>{symbol}</span>;
    },
  }),
];
