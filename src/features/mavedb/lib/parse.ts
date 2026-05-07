import type {
  Classification,
  EvidenceCriterion,
  EvidenceStrength,
  LabelClass,
} from "../types";

/**
 * Type predicates at the boundary so the rest of the app consumes branded
 * unions, not raw strings. New API values appear as `null` in the UI rather
 * than crashing. (Commandment I — parse, don't validate.)
 */

const LABEL_CLASSES = ["LOF", "GoF", "Functional", "Intermediate"] as const;
const CLASSIFICATIONS = ["abnormal", "normal"] as const;
const EVIDENCE_STRENGTHS = [
  "SUPPORTING",
  "MODERATE",
  "MODERATE_PLUS",
  "STRONG",
] as const;
const EVIDENCE_CRITERIA = ["PS3", "BS3"] as const;

export function isLabelClass(value: unknown): value is LabelClass {
  return (
    typeof value === "string" &&
    (LABEL_CLASSES as readonly string[]).includes(value)
  );
}

export function isClassification(value: unknown): value is Classification {
  return (
    typeof value === "string" &&
    (CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

export function isEvidenceStrength(value: unknown): value is EvidenceStrength {
  return (
    typeof value === "string" &&
    (EVIDENCE_STRENGTHS as readonly string[]).includes(value)
  );
}

export function isEvidenceCriterion(
  value: unknown,
): value is EvidenceCriterion {
  return (
    typeof value === "string" &&
    (EVIDENCE_CRITERIA as readonly string[]).includes(value)
  );
}

/** SUPPORTING=1, MODERATE=2, MODERATE_PLUS=3, STRONG=4. Used for the strength bar fill. */
export function strengthFill(strength: EvidenceStrength | null): number {
  if (strength === "SUPPORTING") return 1;
  if (strength === "MODERATE") return 2;
  if (strength === "MODERATE_PLUS") return 3;
  if (strength === "STRONG") return 4;
  return 0;
}

export function strengthLabel(strength: EvidenceStrength | null): string {
  if (strength === "SUPPORTING") return "Supporting";
  if (strength === "MODERATE") return "Moderate";
  if (strength === "MODERATE_PLUS") return "Moderate+";
  if (strength === "STRONG") return "Strong";
  return "—";
}
