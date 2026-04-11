// src/features/genome-browser/tracks/static/alphamissense.ts
// AlphaMissense pathogenicity, split by alternate allele.
// Bigwig data is hosted at hgdownload.soe.ucsc.edu/gbdb/hg38/alphaMissense.
//
// Color thresholds match production: ≤0.34 benign (green), 0.34–0.564
// ambiguous (amber), >0.564 likely pathogenic (red).

import { Sparkles } from "lucide-react";
import type { GoslingTrackSpec, StaticTrack } from "../../types/tracks";
import { LINKING_ID } from "../constants";

const ALPHA_MISSENSE_BASE =
  "https://hgdownload.soe.ucsc.edu/gbdb/hg38/alphaMissense";

const COLOR_DOMAIN = [0, 0.34, 0.34, 0.564, 0.564, 1] as const;
const COLOR_RANGE = [
  "#10b981",
  "#10b981",
  "#f59e0b",
  "#f59e0b",
  "#dc2626",
  "#dc2626",
] as const;

function alphaMissenseSpec(allele: "a" | "c" | "g" | "t"): GoslingTrackSpec {
  return {
    title: `AlphaMissense (Mutation ${allele.toUpperCase()})`,
    data: {
      url: `${ALPHA_MISSENSE_BASE}/${allele}.bw`,
      type: "bigwig",
      column: "position",
      value: "value",
      aggregation: "sum",
      binSize: 4,
    },
    mark: "bar",
    x: { field: "start", type: "genomic", linkingId: LINKING_ID },
    xe: { field: "end", type: "genomic" },
    y: { field: "value", type: "quantitative", axis: "right" },
    color: {
      field: "value",
      type: "quantitative",
      domain: COLOR_DOMAIN,
      range: COLOR_RANGE,
      legend: true,
    },
    stroke: {
      field: "value",
      type: "quantitative",
      domain: COLOR_DOMAIN,
      range: COLOR_RANGE,
    },
    strokeWidth: { value: 0.8 },
    opacity: { value: 0.7 },
    tooltip: [
      { field: "value", type: "quantitative", alt: "Score", format: ".3f" },
      { field: "start", type: "genomic", alt: "Region Start" },
      { field: "end", type: "genomic", alt: "Region End" },
    ],
    width: 800,
    height: 80,
  };
}

const ALLELES = ["a", "c", "g", "t"] as const;

export const alphaMissenseTracks: StaticTrack[] = ALLELES.map((allele) => ({
  kind: "static",
  id: `alphamissense-${allele}`,
  name: `AlphaMissense (Mutation ${allele.toUpperCase()})`,
  description: `DeepMind AlphaMissense pathogenicity for ${allele.toUpperCase()}>X missense mutations.`,
  category: "clinical",
  defaultHeight: 80,
  icon: Sparkles,
  curated: false,
  specs: [alphaMissenseSpec(allele)],
}));
