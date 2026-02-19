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

// Processing stages - shows pipeline progress (4 stages)
export type ProcessingStage =
  | "QUEUED"     // Waiting for worker pickup
  | "RESOLVING"  // Reading input, resolving keys to VIDs
  | "SORTING"    // Sorting VIDs for cache locality
  | "PROCESSING" // Fetching variants AND writing output (merged FETCHING+WRITING)
  | "DONE";      // Complete

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
  metadata?: Record<string, unknown>;
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

  // RESOLVING stage progress
  rows_resolved: number;  // Rows read/resolved during RESOLVING
  bytes_read: number;     // Bytes read from input file (for progress %)

  // PROCESSING stage progress
  fetched: number;        // VIDs processed during PROCESSING
  found: number;          // Successful lookups
  not_found: number;      // VID not in database
  errors: number;         // Processing errors

  // Stats known after each phase (optional until available)
  total_rows?: number;    // Known after RESOLVING
  unique_vids?: number;   // Known after SORTING
  duplicates?: number;    // total_rows - unique_vids

  // Calculated rates (optional)
  percent?: number;       // Completion % (0-100)
  found_rate?: number;    // % of fetched that were found
  error_rate?: number;    // % of fetched with errors
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
// Cohort Types
// ============================================================================

export type CohortStatus =
  | "validating"
  | "queued"
  | "running"
  | "materializing"
  | "ready"
  | "failed"
  | "cancelled";

export interface CohortListItem {
  id: string;
  status: CohortStatus;
  source: "inline" | "upload" | "derived";
  label: string | null;
  parent_id: string | null;
  variant_count: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CohortDetail {
  id: string;
  status: CohortStatus;
  source: "inline" | "upload" | "derived";
  label: string | null;
  variant_count: number | null;
  progress: CohortProgress | null;
  error_code: string | null;
  error_message: string | null;
  parent_id: string | null;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CohortProgress {
  stage?: string;
  percent: number;
  rows_resolved: number;
  fetched: number;
  found: number;
  not_found: number;
  errors: number;
  total_rows?: number;
  unique_vids?: number;
  duplicates?: number;
}

export interface CohortStatusResponse {
  id: string;
  status: CohortStatus;
  progress: CohortProgress | null;
  is_terminal: boolean;
  poll_hint_ms: number | null;
}

export interface CohortSummary {
  text_summary: string;
  cohort_id: string;
  vid_count: number;
  source?: { type: string; ref_count?: number; job_id?: string; parent_id?: string };
  by_gene?: Array<{ gene_symbol: string; count: number; pathogenic: number; functional_impact: number }>;
  by_consequence?: Array<{ category: string; count: number }>;
  by_clinical_significance?: Array<{ category: string; count: number }>;
  by_frequency?: Array<{ category: string; count: number }>;
  highlights?: Array<{
    vcf: string;
    rsid?: string;
    gene?: string;
    consequence?: string;
    clinical_significance?: string;
    cadd_phred?: number;
    gnomad_af?: number;
  }>;
}

export interface CohortListResponse {
  cohorts: CohortListItem[];
  count: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface CreateCohortRequest {
  references: string[];
  label?: string;
  idempotency_key?: string;
}

export interface CreateCohortResponse {
  id: string;
  status: CohortStatus;
  created_at: string;
}

export interface CohortTopKRequest {
  score: string;
  k?: number;
}

export interface CohortAggregateRequest {
  field: "gene" | "consequence" | "clinical_significance" | "frequency" | "chromosome";
  limit?: number;
}

export interface CohortDeriveRequest {
  filters: Array<Record<string, unknown>>;
  label?: string;
}

export interface CohortExportResponse {
  text_summary: string;
  url: string;
  expires_in_seconds: number;
  variant_count: number;
}

export interface DeleteCohortResponse {
  id: string;
  action: "cancelled" | "deleted";
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
  error: string | null;
}
