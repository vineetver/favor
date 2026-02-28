/**
 * Batch Processing Configuration
 */

// File size limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_MB = 50;

// Supported file types
export const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "text/plain": [".txt", ".vcf"],
  "application/octet-stream": [".vcf", ".parquet"],
  "application/x-parquet": [".parquet"],
} as const;

export const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt", ".vcf", ".parquet"];

// Default fields to include in output
export const DEFAULT_OUTPUT_FIELDS = [
  "vid",
  "rsids",
  "consequence",
  "gnomad_af",
] as const;

// Polling configuration
export const JOB_POLL_INTERVAL_MS = 10000; // 10 seconds - backend updates every 10s
export const JOB_POLL_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

