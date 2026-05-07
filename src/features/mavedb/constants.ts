import type { LabelClass } from "./types";

/**
 * Visual tokens for ACMG label classes. Keys exhaustive over LabelClass —
 * adding a new class to the union forces an update here.
 */
export const LABEL_CLASS_STYLE: Record<LabelClass, string> = {
  LOF: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  GoF: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  Functional: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  Intermediate:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

export const LABEL_CLASS_FALLBACK_STYLE =
  "bg-muted text-muted-foreground border-border";

export const LABEL_CLASS_DESCRIPTIONS: Record<LabelClass, string> = {
  LOF: "Loss of function",
  GoF: "Gain of function",
  Functional: "Normal / functional",
  Intermediate: "Intermediate effect",
};

/** Display order for the count pills row. */
export const LABEL_CLASS_ORDER: LabelClass[] = [
  "LOF",
  "Functional",
  "Intermediate",
  "GoF",
];

export const MAVE_VARIANTS_PAGE_LIMIT = 50;
export const MAVE_SCORESETS_PAGE_LIMIT = 50;
