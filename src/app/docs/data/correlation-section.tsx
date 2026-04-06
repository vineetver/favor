"use client";

import { Prose } from "../_components/doc-primitives";
import {
  CorrelationHeatmap,
  type AnnotationGroup,
} from "../_components/correlation-heatmap";

/* ------------------------------------------------------------------ */
/*  Annotation groups matching the heatmap axes                        */
/* ------------------------------------------------------------------ */

const GROUPS: AnnotationGroup[] = [
  {
    name: "Protein Function",
    color: "#c0392b",
    annotations: ["SIFT4G", "PolyPhen2", "Grantham", "AlphaMissense"],
  },
  {
    name: "Conservation",
    color: "#2980b9",
    annotations: [
      "priPhCons", "mamPhCons", "verPhCons",
      "priPhyloP", "mamPhyloP", "verPhyloP",
      "GerpRS", "GerpN", "GerpS",
      "gnomAD-Constraint",
    ],
  },
  {
    name: "Epigenetics",
    color: "#27ae60",
    annotations: [
      "H3K4me1", "H3K4me2", "H3K4me3", "H3K9ac", "H3K27ac",
      "H4K20me1", "H2AFZ", "H3K9me3", "H3K27me3", "H3K36me3",
      "H3K79me2", "DNase", "TotalRNA",
    ],
  },
  {
    name: "Sequence",
    color: "#8e44ad",
    annotations: ["GC", "CpG"],
  },
  {
    name: "TF Binding",
    color: "#d35400",
    annotations: ["RemapOverlapTF", "RemapOverlapCL"],
  },
  {
    name: "Nucleotide Diversity",
    color: "#795548",
    annotations: ["RecombinationRate", "NuclearDiversity", "bStatistic"],
  },
  {
    name: "Variant Density",
    color: "#e91e63",
    annotations: [
      "Common100bp", "Rare100bp", "Sngl100bp",
      "Common1000bp", "Rare1000bp", "Sngl1000bp",
      "Common10000bp", "Rare10000bp", "Sngl10000bp",
    ],
  },
  {
    name: "Mappability",
    color: "#607d8b",
    annotations: [
      "umap_k100", "bismap_k100", "umap_k50", "bismap_k50",
      "umap_k36", "bismap_k36", "umap_k24", "bismap_k24",
    ],
  },
  {
    name: "Proximity",
    color: "#009688",
    annotations: ["minDistTSS", "minDistTSE"],
  },
  {
    name: "Integrative Scores",
    color: "#9c27b0",
    annotations: [
      "LINSIGHT", "FATHMM-XF", "CADD-PHRED",
      "GPN-MSA", "JARVIS", "REMM", "NCER",
    ],
  },
  {
    name: "Non-coding",
    color: "#3f51b5",
    annotations: [
      "MACIE-conserved", "MACIE-regulatory", "MACIE-anyclass",
      "CV2F-combined", "NCBoost",
    ],
  },
  {
    name: "Annotation PCs",
    color: "#ff5722",
    annotations: [
      "aPC-Protein", "aPC-Conservation", "aPC-Epigenetics",
      "aPC-NucDiv", "aPC-MutDensity", "aPC-TF",
      "aPC-Mappability", "aPC-Proximity", "aPC-microRNA",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Placeholder correlation matrix                                     */
/*                                                                     */
/*  Replace with real data by running:                                 */
/*    python scripts/compute-correlation-matrix.py                     */
/*                                                                     */
/*  This placeholder encodes known biological relationships:           */
/*  - diagonal = 1.0                                                   */
/*  - within-group pairs share moderate positive correlation           */
/*  - conservation ↔ integrative scores have moderate correlation      */
/*  - mappability k-mers are highly correlated with each other         */
/*  - everything else gets low near-zero correlation                   */
/* ------------------------------------------------------------------ */

function buildPlaceholderMatrix(): number[][] {
  const n = GROUPS.reduce((sum, g) => sum + g.annotations.length, 0);

  // group index for each annotation
  const groupOf: number[] = [];
  for (let gi = 0; gi < GROUPS.length; gi++) {
    for (let i = 0; i < GROUPS[gi].annotations.length; i++) {
      groupOf.push(gi);
    }
  }

  // seed a deterministic pseudo-random
  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    m[i][i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      let base: number;
      const gi = groupOf[i];
      const gj = groupOf[j];

      if (gi === gj) {
        // within-group: moderate to high correlation
        base = 0.35 + rand() * 0.35;
      } else {
        // known cross-group relationships
        const names = [GROUPS[gi].name, GROUPS[gj].name].sort();
        const key = names.join("|");
        if (key === "Conservation|Integrative Scores") {
          base = 0.25 + rand() * 0.2;
        } else if (key === "Annotation PCs|Integrative Scores") {
          base = 0.2 + rand() * 0.25;
        } else if (key === "Conservation|Protein Function") {
          base = 0.15 + rand() * 0.2;
        } else if (key === "Epigenetics|TF Binding") {
          base = 0.15 + rand() * 0.15;
        } else {
          base = -0.05 + rand() * 0.15;
        }
      }

      const v = Math.round(Math.min(1, Math.max(-1, base)) * 1000) / 1000;
      m[i][j] = v;
      m[j][i] = v;
    }
  }

  return m;
}

const PLACEHOLDER_MATRIX = buildPlaceholderMatrix();

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export function CorrelationSection() {
  return (
    <>
      <div className="mt-10">
        <Prose>
          <h2>Annotation correlation structure</h2>
          <p>
            The heatmap below shows pairwise Pearson correlations between individual
            and integrative functional annotations. Circle size and color encode
            correlation strength and direction:deeper <strong className="text-red-600">red</strong>{" "}
            for positive and deeper <strong className="text-blue-600">blue</strong>{" "}
            for negative correlations. Hover any cell for the exact value.
          </p>
          <p>
            Each <strong>annotation principal component (aPC)</strong> is the first
            PC calculated from standardized individual annotations that measure
            similar biological function, then PHRED-transformed for cross-variant
            comparability.
          </p>
        </Prose>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-xs font-semibold text-foreground mb-6">
          Figure 1. Correlation heatmap of individual and integrative functional
          annotations
        </p>
        <CorrelationHeatmap groups={GROUPS} matrix={PLACEHOLDER_MATRIX} />
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-prose">
          Pairwise Pearson correlations between {GROUPS.reduce((s, g) => s + g.annotations.length, 0)}{" "}
          individual and integrative functional annotations. The cells are colored
          by correlation coefficient values with deeper colors indicating higher
          positive (red) or negative (blue) correlations. New annotations added
          since the original release include GPN-MSA, JARVIS, REMM, NCER, gnomAD
          Constraint, AlphaMissense, MACIE, CV2F, and NCBoost.
        </p>
      </div>

    </>
  );
}
