/**
 * Batch Processing API Types
 * Based on the backend API specification
 */

// ============ Job States ============

export type JobState =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED";

export type InputFormat = "AUTO" | "CSV" | "TSV" | "TXT";

export type KeyType = "AUTO" | "VID" | "RS_ID" | "VCF";

export type OutputRowStatus = "FOUND" | "NOT_FOUND" | "INVALID" | "ERROR";

// ============ Presign Upload ============

export interface PresignRequest {
  tenant_id: string;
  filename: string;
  content_type?: string;
}

export interface PresignResponse {
  upload_url: string;
  input_uri: string;
}

// ============ Validation ============

export interface ValidateRequest {
  tenant_id: string;
  input_uri: string;
  dry_run_lookups?: boolean;
  hint_format?: InputFormat;
  hint_delimiter?: string;
  hint_has_header?: boolean;
  hint_key_column?: string;
}

export interface KeyTypeStats {
  vid: number;
  rsid: number;
  vcf: number;
  invalid: number;
  empty: number;
  confidence: number;
  examples: {
    vid: string[];
    rsid: string[];
    vcf: string[];
    invalid: string[];
  };
}

export interface SuggestedSpecPatch {
  format?: InputFormat;
  key_type?: KeyType;
  delimiter?: string;
  has_header?: boolean;
  key_column?: string;
}

export interface DryRunResult {
  samples_resolved: number;
  resolved_to_vid: number;
  variants_found: number;
  resolved_vid_rate: number;
  variant_found_rate: number;
}

export type ValidationErrorCode =
  | "PARSE_ERROR"
  | "EMPTY_FILE"
  | "LINE_TOO_LONG"
  | "TOO_MANY_COLUMNS"
  | "INVALID_KEY"
  | "NO_KEY_COLUMN"
  | "INVALID_DELIMITER"
  | "SAMPLE_TOO_SMALL"
  | "FILE_TOO_LARGE";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  line?: number;
  example?: string;
}

export interface ValidateResponse {
  ok: boolean;
  format_detected: InputFormat;
  key_type_detected: KeyType;
  sample_bytes: number;
  file_bytes: number;
  rows_sampled: number;
  estimated_rows: number;
  is_estimate: boolean;
  avg_bytes_per_row?: number;
  stats: KeyTypeStats;
  errors: ValidationError[];
  warnings: string[];
  suggested_patch: SuggestedSpecPatch;
  dry_run?: DryRunResult;
}

// ============ Job Creation ============

export interface CreateJobRequest {
  tenant_id: string;
  input_uri: string;
  idempotency_key?: string;
  format?: InputFormat;
  key_type?: KeyType;
  has_header?: boolean;
  delimiter?: string;
  key_column?: string;
  include_not_found?: boolean;
  max_keys?: number;
  max_runtime_sec?: number;
  result_ttl_hours?: number;
  email?: string | null;
  org_name?: string | null;
}

export interface CreateJobResponse {
  job_id: string;
  state: JobState;
  created_at: string;
}

// ============ Job Status ============

export interface JobProgress {
  processed: number;
  found: number;
  not_found: number;
  errors: number;
  // New fields from updated API
  percent?: number;
  found_rate?: number;
  error_rate?: number;
}

export interface JobInput {
  bytes: number;
  bytes_human: string;
  filename: string;
}

export type ParquetState = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface ParquetOutput {
  state: ParquetState;
  url?: string | null;
  bytes?: number | null;
  bytes_human?: string | null;
  error_message?: string | null;
}

export interface JobOutput {
  bytes: number;
  bytes_human: string;
  sha256: string;
  url?: string | null;
  manifest_url?: string | null;
  expires_at?: string | null;
  expires_in_seconds?: number | null;
  parquet?: ParquetOutput | null;
}

export interface JobTiming {
  total_ms: number;
  total_human: string;
  processing_ms?: number | null;
  queued_ms?: number | null;
  rows_per_sec?: number | null;
}

export interface JobEta {
  seconds: number;
  human: string;
}

export interface JobPollHint {
  after_ms: number;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  state: JobState;
  attempt: number;
  can_cancel: boolean;
  is_terminal: boolean;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  input: JobInput;
  progress: JobProgress;
  timing: JobTiming;
  output?: JobOutput | null;
  eta?: JobEta | null;
  poll?: JobPollHint | null;
  error_message?: string | null;
  db_version?: string | null;
}

// ============ Job Cancellation ============

export interface CancelResponse {
  job_id: string;
  state: JobState;
  message: string;
}

// ============ Output Row (JSONL) ============

export interface OutputRow {
  row_id: number;
  raw_ref: string;
  ref_type: KeyType;
  vid?: string;
  status: OutputRowStatus;
  variant?: Record<string, unknown>;
  error?: string;
}

// ============ Local Storage Types ============

export interface StoredJob {
  job_id: string;
  tenant_id: string;
  filename: string;
  created_at: string;
  state: JobState;
  progress?: JobProgress;
  estimated_rows?: number;
}

// ============ UI State Types ============

export type UploadStep =
  | "select"
  | "uploading"
  | "validating"
  | "configuring"
  | "creating"
  | "submitted";

export interface BatchWorkflowState {
  step: UploadStep;
  file: File | null;
  uploadProgress: number;
  inputUri: string | null;
  validation: ValidateResponse | null;
  jobId: string | null;
  error: string | null;
}
