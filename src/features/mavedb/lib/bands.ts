import { LABEL_CLASS_FALLBACK_STYLE, LABEL_CLASS_STYLE } from "../constants";
import type { Calibration, LabelClass } from "../types";

/**
 * Map a raw score to the band it falls in, given the active calibration's
 * band list. Returns null when no band claims the score (e.g. the
 * "no call" middle range, which most calibrations leave unbanded).
 *
 * Inclusivity flags from the API are 0/1 ints; we coerce to bool.
 */
export function scoreToBand(
  score: number,
  bands: Calibration[],
): Calibration | null {
  for (const b of bands) {
    if (!hitsBand(score, b)) continue;
    return b;
  }
  return null;
}

function hitsBand(score: number, b: Calibration): boolean {
  const lo = b.range_low;
  const hi = b.range_high;
  const incLo = !!b.inclusive_lower;
  const incHi = !!b.inclusive_upper;
  if (lo !== null) {
    if (incLo ? score < lo : score <= lo) return false;
  }
  if (hi !== null) {
    if (incHi ? score > hi : score >= hi) return false;
  }
  return true;
}

/** Stable color for a band, falling through to the LabelClass token. */
export function bandColor(band: Calibration | null): string {
  if (!band || !band.label_class) return LABEL_CLASS_FALLBACK_STYLE;
  return LABEL_CLASS_STYLE[band.label_class];
}

/**
 * Pick the calibration title to render by default. Priority order:
 *   1. IGVF Coding Variant Focus Group "All Variants" controls — the
 *      community-recognised reference calibration; preferred over
 *      publisher-flagged primaries because investigator-provided
 *      classes are sometimes more permissive.
 *   2. Any other IGVF calibration.
 *   3. A calibration with `is_primary === true`.
 *   4. The first title alphabetically.
 * Returns null when there are no calibrations at all.
 */
export function defaultCalibrationTitle(
  calibrationsByTitle: Record<string, Calibration[]>,
): string | null {
  const titles = Object.keys(calibrationsByTitle);
  if (titles.length === 0) return null;

  const igvfAllVariants = titles.find(
    (t) => /\bigvf\b/i.test(t) && /all\s+variants/i.test(t),
  );
  if (igvfAllVariants) return igvfAllVariants;

  const anyIgvf = titles.find((t) => /\bigvf\b/i.test(t));
  if (anyIgvf) return anyIgvf;

  for (const title of titles) {
    const bands = calibrationsByTitle[title];
    if (bands?.some((b) => b.is_primary)) return title;
  }
  return [...titles].sort()[0] ?? null;
}

export interface BandSummary {
  bandCount: number;
  variantCount: number;
  primaryCriterion: string | null;
  hasPrimary: boolean;
  researchUseOnly: boolean;
  labelClasses: LabelClass[];
}

/** Summarises a calibration's band list for the radio-row display. */
export function summarizeCalibration(bands: Calibration[]): BandSummary {
  const variantCount = bands.reduce((s, b) => s + (b.variant_count ?? 0), 0);
  const primaryCriterion =
    bands.find((b) => b.evidence_criterion)?.evidence_criterion ?? null;
  const hasPrimary = bands.some((b) => b.is_primary);
  const researchUseOnly = bands.some((b) => b.research_use_only);
  const labelClasses = [
    ...new Set(
      bands.map((b) => b.label_class).filter((v): v is LabelClass => v != null),
    ),
  ];
  return {
    bandCount: bands.length,
    variantCount,
    primaryCriterion,
    hasPrimary,
    researchUseOnly,
    labelClasses,
  };
}
