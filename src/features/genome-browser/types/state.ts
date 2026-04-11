// src/features/genome-browser/types/state.ts
//
// Domain types for the genome browser state machine.
//
// The browser has exactly two valid states:
//   - 'idle'  — no region has been chosen yet (mounted before SSR data arrives)
//   - 'ready' — a region is set and tracks can be toggled / rendered
//
// We deliberately do NOT carry 'loading' or 'error' variants. Tile-fetch
// loading is owned by Gosling itself (it streams its own placeholders); fatal
// errors are caught by Next.js's route-level error boundary. Folding those
// pseudo-states into the reducer earlier was speculative — it added a
// `region: state.region : state.region` typo, an unreachable branch, and
// silent no-op behavior in dispatch. Gone.

import type { ActiveTrack } from "./tracks";

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type PositiveInt = Brand<number, "PositiveInt">;
export type Chromosome = Brand<string, "Chromosome">;

// ─────────────────────────────────────────────────────────────────────────────
// CHROMOSOME VALIDATION (parse, don't validate)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CHROMOSOMES = [
  "chr1",
  "chr2",
  "chr3",
  "chr4",
  "chr5",
  "chr6",
  "chr7",
  "chr8",
  "chr9",
  "chr10",
  "chr11",
  "chr12",
  "chr13",
  "chr14",
  "chr15",
  "chr16",
  "chr17",
  "chr18",
  "chr19",
  "chr20",
  "chr21",
  "chr22",
  "chrX",
  "chrY",
  "chrM",
] as const;

export type ValidChromosome = (typeof VALID_CHROMOSOMES)[number];

export function isValidChromosome(value: string): value is ValidChromosome {
  return VALID_CHROMOSOMES.includes(value as ValidChromosome);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOMIC REGION — always valid by construction
// ─────────────────────────────────────────────────────────────────────────────

export type GenomicRegion = {
  readonly chromosome: Chromosome;
  readonly start: PositiveInt;
  readonly end: PositiveInt;
  readonly size: number; // derived: end - start
};

export function createGenomicRegion(
  chromosome: string,
  start: number,
  end: number,
): GenomicRegion | null {
  if (!isValidChromosome(chromosome)) return null;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end < 0 || start >= end) return null;
  return {
    chromosome: chromosome as Chromosome,
    start: start as PositiveInt,
    end: end as PositiveInt,
    size: end - start,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER STATE — discriminated union, two variants only
// ─────────────────────────────────────────────────────────────────────────────

export type BrowserState =
  | { readonly status: "idle" }
  | {
      readonly status: "ready";
      readonly region: GenomicRegion;
      readonly tracks: readonly ActiveTrack[];
    };

export const initialBrowserState: BrowserState = { status: "idle" };

export function isReady(
  state: BrowserState,
): state is Extract<BrowserState, { status: "ready" }> {
  return state.status === "ready";
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const ZOOM_FACTOR = 2;
export const MIN_REGION_SIZE = 100; // bp
export const MAX_REGION_SIZE = 10_000_000; // 10 Mb
