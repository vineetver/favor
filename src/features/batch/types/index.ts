/**
 * Batch Processing API Types
 * Based on the backend API specification
 *
 * Key design principles:
 * - Parse, don't validate: Parse API responses at boundary into discriminated unions
 * - Make invalid states unrepresentable: Job is a union of state-specific types
 * - Single source of truth: Derive UI state from job.state, don't store redundantly
 */

// ============================================================================
// Core Enums & Literals
// ============================================================================

export type JobState =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED";

export type InputFormat = "AUTO" | "CSV" | "TSV" | "TXT";

// Note: Backend uses RSID (no underscore)
export type KeyType = "AUTO" | "VID" | "RSID" | "VCF";

export type OutputRowStatus = "FOUND" | "NOT_FOUND" | "INVALID" | "ERROR";

// Processing stages - shows pipeline progress
export type ProcessingStage =
  | "QUEUED"    // Waiting for worker pickup
  | "RESOLVING" // Phase 1: Converting keys to VIDs
  | "SORTING"   // Phase 2: Sorting VIDs for efficient lookup
  | "FETCHING"  // Phase 3: Fetching variant data
  | "WRITING"   // Writing output to S3
  | "DONE";     // Complete

// Structured error codes for actionable UX
export type ErrorCode =
  | "CANCELLED"              // User cancelled
  | "MAX_ATTEMPTS_EXCEEDED"  // Transient failures exhausted retries
  | "EMPTY_FILE"             // Input file has no data
  | "INVALID_FORMAT"         // Can't parse input
  | "NO_KEY_COLUMN"          // No variant IDs found
  | "FILE_TOO_LARGE"         // Exceeds size limit
  | "INPUT_NOT_FOUND"        // S3 object missing
  | "ROCKSDB_UNAVAILABLE"    // Database down
  | "S3_UNAVAILABLE"         // Storage down
  | "TIMEOUT"                // Exceeded max_runtime_sec
  | "LEASE_LOST"             // Worker interrupted
  | "INTERNAL_ERROR";        // Unknown error

// ============================================================================
// Presign Upload
// ============================================================================

export interface PresignRequest {
  tenant_id: string;
  filename: string;
  content_type?: string;
}

export interface PresignResponse {
  upload_url: string;
  input_uri: string;
}

// ============================================================================
// Validation
// ============================================================================

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

// ============================================================================
// Job Creation
// ============================================================================

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
  message: string;
  created_at: string;
}

// ============================================================================
// Job Status - Shared Types
// ============================================================================

export interface JobProgress {
  stage: ProcessingStage;
  stage_description: string;
  processed: number;
  found: number;
  not_found: number;
  errors: number;
  total_rows: number;
  unique_vids: number;
  duplicates: number;
  percent: number;
  found_rate: number;
  error_rate: number;
}

export interface JobInput {
  bytes: number;
  bytes_human: string;
  filename: string;
}

// Output is only present on COMPLETED jobs - no more parquet field
export interface JobOutput {
  url: string;
  manifest_url: string;
  bytes: number;
  bytes_human: string;
  sha256: string;
  expires_at: string;
  expires_in_seconds: number;
}

export interface JobTiming {
  total_ms: number;
  total_human: string;
  processing_ms?: number;
  queued_ms?: number;
  rows_per_sec?: number;
}

export interface JobEta {
  seconds: number;
  human: string;
}

export interface JobPollHint {
  after_ms: number;
  message: string;
}

// ============================================================================
// Job Status - Discriminated Union (Make Invalid States Unrepresentable)
// ============================================================================

// Base fields present in all job states
interface JobBase {
  job_id: string;
  attempt: number;
  created_at: string;
  input: JobInput;
  timing: JobTiming;
  db_version?: string;
}

// PENDING: Waiting in queue
export interface JobPending extends JobBase {
  state: "PENDING";
  is_terminal: false;
  can_cancel: true;
  poll: JobPollHint;
}

// RUNNING: Actively processing
export interface JobRunning extends JobBase {
  state: "RUNNING";
  is_terminal: false;
  can_cancel: true;
  poll: JobPollHint;
  started_at: string;
  progress: JobProgress;
  eta?: JobEta;
}

// CANCEL_REQUESTED: Cancellation in progress
export interface JobCancelRequested extends JobBase {
  state: "CANCEL_REQUESTED";
  is_terminal: false;
  can_cancel: false;
  started_at: string;
  progress: JobProgress;
}

// COMPLETED: Success with output
export interface JobCompleted extends JobBase {
  state: "COMPLETED";
  is_terminal: true;
  can_cancel: false;
  started_at: string;
  completed_at: string;
  progress: JobProgress;
  output: JobOutput;
}

// FAILED: Error with details
export interface JobFailed extends JobBase {
  state: "FAILED";
  is_terminal: true;
  can_cancel: false;
  started_at?: string;
  completed_at: string;
  progress?: JobProgress;
  error_code: ErrorCode;
  error_message: string;
  retryable: boolean;
}

// CANCELLED: User cancelled
export interface JobCancelled extends JobBase {
  state: "CANCELLED";
  is_terminal: true;
  can_cancel: false;
  started_at?: string;
  completed_at: string;
  progress?: JobProgress;
}

// The discriminated union - TypeScript will narrow based on `state`
export type Job =
  | JobPending
  | JobRunning
  | JobCancelRequested
  | JobCompleted
  | JobFailed
  | JobCancelled;

// ============================================================================
// Job Cancellation
// ============================================================================

export interface CancelResponse {
  job_id: string;
  state: JobState;
  message: string;
}

// ============================================================================
// Output Row (JSONL)
// ============================================================================

export interface OutputRow {
  row_id: number;
  raw_ref: string;
  ref_type: KeyType;
  vid?: string;
  status: OutputRowStatus;
  variant?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Local Storage Types
// ============================================================================

export interface StoredJob {
  job_id: string;
  tenant_id: string;
  filename: string;
  created_at: string;
  state: JobState;
  progress?: JobProgress;
  estimated_rows?: number;
}

// ============================================================================
// UI State Types
// ============================================================================

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
