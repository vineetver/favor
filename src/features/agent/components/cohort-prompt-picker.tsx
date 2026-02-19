"use client";

import { useCallback, useState } from "react";
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
} from "lucide-react";
import type { AgentCohort } from "../lib/cohort-store";

// ---------------------------------------------------------------------------
// Curated cohort prompts
// ---------------------------------------------------------------------------

const COHORT_PROMPTS = [
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
// Component
// ---------------------------------------------------------------------------

interface CohortPromptPickerProps {
  cohort: AgentCohort | null;
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

  const buildMessage = useCallback(
    (prompt: string) => {
      if (!cohort) return prompt;
      return `Analyze cohort ${cohort.cohortId}. ${prompt}`;
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
                {cohort.label}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cohort.variantCount.toLocaleString()} variants &middot; Choose
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
            {COHORT_PROMPTS.map((p) => (
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
