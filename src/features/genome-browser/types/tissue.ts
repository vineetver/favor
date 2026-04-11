// src/features/genome-browser/types/tissue.ts
//
// Tissue source types — drives off the production TissueConfig
// (see src/features/genome-browser/config/tissue-config.ts).
//
// Public surface:
//   • TissueSource         — fully qualified, bigwig-backed selection
//   • createTissueSource() — boundary parser; returns null on miss
//   • assayColor / assayLabel — display helpers
//   • listTissues          — top-level tissue names
//   • formatSubtissue / sanitizeSubtissue — display & ID helpers used by
//     the dynamic track factory
//
// Anything else (subtissue listing, renderable-assay listing, etc.) is
// handled by the picker via the static TissueConfig import directly.

import type { AssayInfo } from "../config/tissue-config";
import { getSubtissueByName, TissueConfig } from "../config/tissue-config";

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED TYPES
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type TissueId = Brand<string, "TissueId">;
export type SubtissueId = Brand<string, "SubtissueId">;
export type AssayName = Brand<string, "AssayName">;

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE SOURCE — fully qualifies a dynamic tissue track
// ─────────────────────────────────────────────────────────────────────────────

export type TissueSource = {
  readonly tissue: TissueId;
  readonly subtissue: SubtissueId;
  readonly assay: AssayName;
  readonly bigwigUrl: string;
};

/**
 * Construct a tissue source by looking the assay up in TissueConfig.
 * Returns null if the tissue/subtissue/assay combo is missing or has no
 * bigwig URL — the dynamic track factory only emits tracks for renderable
 * (bigwig-backed) signals.
 */
export function createTissueSource(
  tissue: string,
  subtissue: string,
  assay: string,
): TissueSource | null {
  const assayInfo = findAssay(tissue, subtissue, assay);
  if (!assayInfo?.bigwig) return null;
  return {
    tissue: tissue as TissueId,
    subtissue: subtissue as SubtissueId,
    assay: assay as AssayName,
    bigwigUrl: assayInfo.bigwig,
  };
}

function findAssay(
  tissue: string,
  subtissue: string,
  assay: string,
): AssayInfo | undefined {
  const sub = getSubtissueByName(tissue, subtissue);
  return sub?.assays.find((a) => a.name === assay);
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY METADATA
// ─────────────────────────────────────────────────────────────────────────────

const ASSAY_COLORS: Readonly<Record<string, string>> = {
  dnase: "#2563eb",
  ctcf: "#dc2626",
  h3k4me3: "#16a34a",
  h3k27ac: "#ca8a04",
  atac: "#7c3aed",
  h3k4me1: "#ea580c",
  h3k27me3: "#0891b2",
};

const ASSAY_LABELS: Readonly<Record<string, string>> = {
  dnase: "DNase",
  ctcf: "CTCF",
  h3k4me3: "H3K4me3",
  h3k27ac: "H3K27ac",
  atac: "ATAC",
  h3k4me1: "H3K4me1",
  h3k27me3: "H3K27me3",
  ccres: "cCREs",
};

export function assayColor(assay: string): string {
  return ASSAY_COLORS[assay.toLowerCase()] ?? "#6b7280";
}

export function assayLabel(assay: string): string {
  return ASSAY_LABELS[assay.toLowerCase()] ?? assay.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level tissues in TissueConfig order. */
export function listTissues(): string[] {
  return Object.keys(TissueConfig);
}

/**
 * Capitalize the first letter of a long subtissue name. Used by the dynamic
 * track factory for the on-canvas track title; the picker has its own
 * splitter for typographic hierarchy.
 */
export function formatSubtissue(name: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatTissue(tissue: string): string {
  return tissue;
}

/**
 * Sanitize a subtissue name into a stable, URL-safe slug used in track IDs.
 * Identical to master's `assayTrackId` slug logic so saved query-string
 * track lists keep working across deploys.
 */
export function sanitizeSubtissue(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
