"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import {
  BarChart3Icon,
  ShieldAlertIcon,
  Share2Icon,
  GlobeIcon,
  SendIcon,
  FlaskConicalIcon,
  TrendingUpIcon,
  TargetIcon,
  ScatterChartIcon,
  BrainCircuitIcon,
} from "lucide-react";
import type { CohortListItem } from "@features/batch/types";
import type { DataType } from "@features/batch/types";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Prompt type
// ---------------------------------------------------------------------------

interface CuratedPrompt {
  label: string;
  description: string;
  prompt: string;
  icon: ReactNode;
}

// ---------------------------------------------------------------------------
// Variant list prompts (original)
// ---------------------------------------------------------------------------

const VARIANT_LIST_PROMPTS: CuratedPrompt[] = [
  {
    label: "Overview & clinical significance",
    description:
      "Gene distribution, ClinVar significance (clnsig), consequence types, and region breakdown",
    prompt:
      "Give me an overview — gene distribution, gencode consequence and region types, ClinVar clinical significance (clnsig/clndn), and review status.",
    icon: <BarChart3Icon className="size-4" />,
  },
  {
    label: "Rank by protein function",
    description:
      "Rank by APC protein function score (PHRED-scale), cross-ref SIFT, PolyPhen, AlphaMissense",
    prompt:
      "Rank the variants by apc_protein_function score and cross-reference with sift_cat, polyphen_cat, and alphamissense predictions. Highlight the most damaging ones.",
    icon: <ShieldAlertIcon className="size-4" />,
  },
  {
    label: "Population frequencies",
    description:
      "gnomAD, BRAVO, and 1000 Genomes frequencies across populations (EUR, AFR, AMR, EAS, SAS)",
    prompt:
      "Analyze population frequency patterns across gnomAD (genome & exome), BRAVO, and 1000 Genomes (EUR, AFR, AMR, EAS, SAS). Flag any rare or ultra-rare variants.",
    icon: <GlobeIcon className="size-4" />,
  },
  {
    label: "Regulatory & conservation",
    description:
      "APC conservation & epigenetics, CAGE promoter/enhancer, GeneHancer, LINSIGHT, FATHMM-XF",
    prompt:
      "Assess the regulatory and conservation landscape — apc_conservation, apc_epigenetics, CAGE promoter/enhancer activity, GeneHancer overlap, LINSIGHT, and FATHMM-XF scores.",
    icon: <Share2Icon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// GWAS summary stats prompts
// ---------------------------------------------------------------------------

const GWAS_PROMPTS: CuratedPrompt[] = [
  {
    label: "Top associations",
    description:
      "Most significant associations ranked by p-value with effect sizes and chromosomal locations",
    prompt:
      "Show the top 20 most significant associations ranked by p-value. Include effect sizes (beta/OR), standard errors, and chromosomal locations.",
    icon: <TrendingUpIcon className="size-4" />,
  },
  {
    label: "Multiple testing correction",
    description:
      "Apply FDR/Bonferroni correction and identify genome-wide significant hits",
    prompt:
      "Run multiple testing correction (Bonferroni and FDR) on the p-values. How many associations survive genome-wide significance (5e-8)? Show a QQ plot.",
    icon: <ScatterChartIcon className="size-4" />,
  },
  {
    label: "Effect size analysis",
    description:
      "Distribution of effect sizes, direction of effects, and largest effect variants",
    prompt:
      "Analyze the distribution of effect sizes (beta values). What are the largest positive and negative effects? Group by chromosome.",
    icon: <BarChart3Icon className="size-4" />,
  },
  {
    label: "Regional overview",
    description:
      "Chromosome-level summary of association counts and peak signals",
    prompt:
      "Give a regional overview — group associations by chromosome, show the count and minimum p-value per chromosome. Which regions have the strongest signals?",
    icon: <GlobeIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Credible set prompts
// ---------------------------------------------------------------------------

const CREDIBLE_SET_PROMPTS: CuratedPrompt[] = [
  {
    label: "Top PIPs",
    description:
      "Variants with highest posterior inclusion probabilities across credible sets",
    prompt:
      "Show the top 20 variants ranked by posterior inclusion probability (PIP). Include their credible set membership and gene annotations.",
    icon: <TargetIcon className="size-4" />,
  },
  {
    label: "Credible set sizes",
    description:
      "Size distribution of credible sets and how many variants are needed for 95% coverage",
    prompt:
      "Analyze the credible set sizes — group by credible set ID, show the variant count per set. How many sets have fewer than 5 variants?",
    icon: <BarChart3Icon className="size-4" />,
  },
  {
    label: "Lead variants",
    description:
      "Identify lead variants per credible set with highest PIPs",
    prompt:
      "Identify the lead variant (highest PIP) in each credible set. Show their gene, consequence, and PIP values.",
    icon: <ShieldAlertIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Fine mapping prompts
// ---------------------------------------------------------------------------

const FINE_MAPPING_PROMPTS: CuratedPrompt[] = [
  {
    label: "Posterior probabilities",
    description:
      "Top variants ranked by posterior probability of being causal",
    prompt:
      "Show the top 20 variants ranked by posterior probability. Include gene annotations, consequence types, and Bayes factors.",
    icon: <TargetIcon className="size-4" />,
  },
  {
    label: "Causal candidates",
    description:
      "Filter for high-confidence causal variants and annotate with functional impact",
    prompt:
      "Filter for variants with posterior probability > 0.5 or Bayes factor > 10. What are the most likely causal candidates? Show their functional annotations.",
    icon: <ShieldAlertIcon className="size-4" />,
  },
  {
    label: "Bayes factor ranking",
    description:
      "Rank variants by Bayes factor evidence strength",
    prompt:
      "Rank variants by Bayes factor. Group by strength of evidence (decisive >100, strong 10-100, substantial 3-10, weak <3).",
    icon: <TrendingUpIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Analytics prompts (shown for all data types)
// ---------------------------------------------------------------------------

const ANALYTICS_PROMPTS: CuratedPrompt[] = [
  {
    label: "PCA analysis",
    description:
      "Principal component analysis on numeric columns to identify structure",
    prompt:
      "Run PCA on the numeric columns to identify any underlying structure or clustering in the data.",
    icon: <BrainCircuitIcon className="size-4" />,
  },
  {
    label: "Clustering",
    description:
      "Cluster variants/rows by numeric features to identify groups",
    prompt:
      "Run clustering analysis on the numeric columns to identify natural groupings in the data.",
    icon: <ScatterChartIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Select prompts based on data type
// ---------------------------------------------------------------------------

function getPromptsForDataType(dataType?: DataType): CuratedPrompt[] {
  switch (dataType) {
    case "gwas_sumstats":
      return [...GWAS_PROMPTS, ...ANALYTICS_PROMPTS];
    case "credible_set":
      return [...CREDIBLE_SET_PROMPTS, ...ANALYTICS_PROMPTS];
    case "fine_mapping":
      return [...FINE_MAPPING_PROMPTS, ...ANALYTICS_PROMPTS];
    case "variant_list":
    default:
      return [...VARIANT_LIST_PROMPTS, ...ANALYTICS_PROMPTS];
  }
}

function getRowLabel(dataType?: DataType): string {
  switch (dataType) {
    case "gwas_sumstats":
      return "associations";
    case "credible_set":
      return "variants in credible sets";
    case "fine_mapping":
      return "fine-mapped variants";
    default:
      return "variants";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CohortPromptPickerProps {
  cohort: CohortListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (message: string) => void;
}

export function CohortPromptPicker({
  cohort,
  open,
  onOpenChange,
  onSend,
}: CohortPromptPickerProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  const prompts = useMemo(
    () => getPromptsForDataType(cohort?.data_type),
    [cohort?.data_type],
  );

  const buildMessage = useCallback(
    (prompt: string) => {
      if (!cohort) return prompt;
      return `Analyze cohort ${cohort.id}. ${prompt}`;
    },
    [cohort],
  );

  const handleSelect = useCallback(
    (prompt: string) => {
      onSend(buildMessage(prompt));
      onOpenChange(false);
      setCustomPrompt("");
    },
    [onSend, buildMessage, onOpenChange],
  );

  const handleCustomSubmit = useCallback(() => {
    const text = customPrompt.trim();
    if (!text) return;
    onSend(buildMessage(text));
    onOpenChange(false);
    setCustomPrompt("");
  }, [customPrompt, onSend, buildMessage, onOpenChange]);

  if (!cohort) return null;

  const rowLabel = getRowLabel(cohort.data_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              <FlaskConicalIcon className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-semibold text-foreground truncate">
                {cohort.label ?? "Untitled cohort"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(cohort.variant_count ?? 0).toLocaleString()} {rowLabel} &middot; Choose
                a question or write your own
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="h-px bg-border" />

        {/* Curated prompts */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
            Suggested questions
          </p>
          <div className="grid grid-cols-1 gap-2">
            {prompts.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSelect(p.prompt)}
                className="group/prompt flex items-start gap-3 rounded-xl border border-border/60 px-3.5 py-3 text-left transition-all hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm"
              >
                <span className="mt-0.5 shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground/60 transition-colors group-hover/prompt:bg-primary/10 group-hover/prompt:text-primary">
                  {p.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {p.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    {p.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Custom prompt input */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
            Or ask your own question
          </p>
          <div className="flex gap-2">
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="What would you like to know about this cohort?"
              className="min-h-[72px] resize-none text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
            />
          </div>
          <div className="flex justify-end mt-2.5">
            <Button
              size="sm"
              disabled={!customPrompt.trim()}
              onClick={handleCustomSubmit}
              className="gap-1.5"
            >
              <SendIcon className="size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
