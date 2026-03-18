import type { ModalityMeta, Modality, ParsedVcf, ScorerKey, ScorerMeta, SupportedWidth } from "./types";

/** Parse "1-10001-A-T" or "chr1-10001-A-T" → { chromosome, position, ref, alt } */
export function parseVariantVcf(vcf: string): ParsedVcf {
  const parts = vcf.split("-");
  if (parts.length !== 4) throw new Error(`Invalid VCF: ${vcf}`);

  const chrom = parts[0].startsWith("chr") ? parts[0] : `chr${parts[0]}`;
  return {
    chromosome: chrom,
    position: Number(parts[1]),
    ref: parts[2],
    alt: parts[3],
  };
}

// ─── Modality catalog ──────────────────────────────────────────

export const MODALITIES: ModalityMeta[] = [
  { id: "cage", label: "CAGE", resolution: "1bp", description: "Gene expression (TSS signal)" },
  { id: "dnase", label: "DNase", resolution: "1bp", description: "Open chromatin (DNase-seq)" },
  { id: "atac", label: "ATAC", resolution: "1bp", description: "Open chromatin (ATAC-seq)" },
  { id: "rna_seq", label: "RNA-seq", resolution: "1bp", description: "RNA coverage" },
  { id: "chip_histone", label: "Histone ChIP", resolution: "128bp", description: "Histone modifications" },
  { id: "chip_tf", label: "TF ChIP", resolution: "128bp", description: "Transcription factor binding" },
  { id: "splice_sites", label: "Splice Sites", resolution: "1bp", description: "Splice donor/acceptor probability" },
  { id: "splice_site_usage", label: "Splice Usage", resolution: "1bp", description: "Tissue-specific splice usage" },
  { id: "splice_junctions", label: "Splice Junctions", resolution: "per-junction", description: "Junction read counts" },
  { id: "contact_maps", label: "Contact Maps", resolution: "2048bp", description: "3D chromatin contacts" },
];

export const DEFAULT_VARIANT_MODALITIES: Modality[] = ["cage", "dnase"];

// ─── Scorer catalog ────────────────────────────────────────────

export const SCORERS: ScorerMeta[] = [
  { id: "center_mask", label: "Center Mask", description: "General effect at variant position" },
  { id: "contact_map", label: "Contact Map", description: "3D chromatin structure change" },
  { id: "gene_mask_lfc", label: "Gene LFC", description: "Log fold-change in gene expression" },
  { id: "gene_mask_active", label: "Gene Active", description: "Active allele expression effect" },
  { id: "gene_mask_splicing", label: "Gene Splicing", description: "Splicing impact on gene" },
  { id: "polyadenylation", label: "PolyA", description: "Polyadenylation effect" },
  { id: "splice_junction", label: "Splice Junction", description: "Splice junction usage change" },
];

export const DEFAULT_SCORERS: ScorerKey[] = ["center_mask", "gene_mask_lfc", "contact_map"];

/** Extract a short scorer label from the full scorer string (e.g. "CenterMaskScorer(...)") */
export function parseScorerLabel(scorer: string): string {
  const match = SCORERS.find((s) => scorer.toLowerCase().includes(s.id.replace(/_/g, "")));
  if (match) return match.label;
  // Fallback: take the class name before "("
  const name = scorer.split("(")[0];
  return name.replace(/Scorer$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

// ─── Region widths ─────────────────────────────────────────────

export const SUPPORTED_WIDTHS: { value: SupportedWidth; label: string }[] = [
  { value: 16384, label: "16 KB" },
  { value: 131072, label: "128 KB" },
  { value: 524288, label: "512 KB" },
  { value: 1048576, label: "1 MB" },
];

/** Snap a center position to a supported interval width. */
export function snapToInterval(
  center: number,
  width: SupportedWidth,
): { start: number; end: number } {
  const half = Math.floor(width / 2);
  const start = Math.max(0, center - half);
  return { start, end: start + width };
}

/** Find the smallest supported width that covers a gene region. */
export function widthForGene(geneStart: number, geneEnd: number): SupportedWidth {
  const geneLen = geneEnd - geneStart;
  for (const { value } of SUPPORTED_WIDTHS) {
    if (value >= geneLen) return value;
  }
  return 1048576;
}

// ─── Classification display ──────────────────────────────────

/** Map classification string to a semantic color class for badges. */
export function classificationColor(classification: string): string {
  const key = classification.toLowerCase().replace(/[\s-]+/g, "_");
  if (key.includes("high")) return "bg-red-100 text-red-800 border-red-200";
  if (key.includes("moderate")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (key.includes("low")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (key.includes("benign")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-muted text-muted-foreground border-border";
}

/** Human-readable label for classification. */
export function classificationLabel(classification: string): string {
  return classification
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Score display helpers ─────────────────────────────────────

/** Quantile (0-1) → heatmap color. High quantile = strong effect. */
export function quantileColor(q: number): string {
  if (isNaN(q)) return "transparent";
  // Sequential blue-to-red through white
  if (q < 0.5) {
    const t = q / 0.5;
    return `rgba(209, 213, 219, ${0.1 + t * 0.3})`; // gray, low opacity
  }
  const t = (q - 0.5) / 0.5;
  return `rgba(124, 58, 237, ${0.15 + t * 0.65})`; // violet, increasing opacity
}

/** Format raw score for tooltip display — no scientific notation. */
export function formatScore(score: number): string {
  if (isNaN(score)) return "—";
  const sign = score > 0 ? "+" : "";
  if (Math.abs(score) < 0.0001) return `${sign}${score.toFixed(6)}`;
  return `${sign}${score.toFixed(4)}`;
}

/** Format quantile for display. */
export function formatQuantile(q: number): string {
  if (isNaN(q)) return "—";
  return `${(q * 100).toFixed(0)}%`;
}

/** Downsample array to fit a target width. Uses max per bucket for fidelity. */
export function downsample(values: number[], targetWidth: number): number[] {
  if (values.length <= targetWidth) return values;

  const bucketSize = values.length / targetWidth;
  const result: number[] = [];

  for (let i = 0; i < targetWidth; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let max = -Infinity;
    for (let j = start; j < end; j++) {
      if (values[j] > max) max = values[j];
    }
    result.push(max);
  }

  return result;
}
