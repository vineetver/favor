export interface BatchVariantInput {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  rsid?: string;
  sampleId: string;
}

export interface BatchAnnotationRequest {
  sampleId: string;
  variants: BatchVariantInput[];
  email: string;
  organization: string;
  coordinateSystem: "1-base" | "0-base";
  outputFormat: "csv" | "json" | "tsv";
}

export interface BatchProcessingResult {
  sampleId: string;
  totalVariants: number;
  annotatedVariants: number;
  processingTimeMs: number;
  downloadUrl?: string;
}
