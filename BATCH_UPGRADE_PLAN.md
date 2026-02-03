# Batch Annotation Frontend Upgrade Plan

## Overview

This document outlines the plan to upgrade the batch annotation frontend to match the new backend API contract and deliver a premium UX experience.

**Key Principles** (from `docs/CONVENTIONS.md`):
- **Parse, don't validate**: Parse API responses at boundary, return discriminated unions
- **Make invalid states unrepresentable**: Use discriminated unions, not boolean flags
- **Single source of truth**: Derive state, don't store redundant copies
- **Flatten control flow**: Guard clauses + early returns

---

## 1. Contract Changes (Types)

### 1.1 Type Alignment Issues

| Field | Current Frontend | New Backend | Action |
|-------|-----------------|-------------|--------|
| `KeyType` | `RS_ID` | `RSID` | Update to `RSID` |
| `progress.stage` | Missing | `ProcessingStage` | Add |
| `progress.stage_description` | Missing | `string` | Add |
| `progress.total_rows` | Missing | `number` | Add |
| `progress.unique_vids` | Missing | `number` | Add |
| `progress.duplicates` | Missing | `number` | Add |
| `error_code` | Missing | `ErrorCode` | Add |
| `retryable` | Missing | `boolean` | Add |
| `output.parquet` | Exists | **Removed** | Delete |

### 1.2 New Types to Add

```typescript
// Processing stages - shows pipeline progress
type ProcessingStage =
  | "QUEUED"      // Waiting for worker pickup
  | "RESOLVING"   // Phase 1: Converting keys to VIDs
  | "SORTING"     // Phase 2: Sorting VIDs for efficient lookup
  | "FETCHING"    // Phase 3: Fetching variant data
  | "WRITING"     // Writing output to S3
  | "DONE";       // Complete

// Structured error codes for better UX
type ErrorCode =
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
```

### 1.3 Updated Interfaces (Make Invalid States Unrepresentable)

Instead of optional fields everywhere, use **discriminated unions** to make invalid states impossible:

```typescript
// src/features/batch/types/index.ts

// ============================================================================
// DISCRIMINATED UNION: Job by State (Parse at boundary)
// ============================================================================

// Base fields present in all states
interface JobBase {
  job_id: string;
  attempt: number;
  created_at: string;
  input: JobInput;
  timing: JobTiming;
  db_version?: string;
}

// PENDING: Waiting in queue
interface JobPending extends JobBase {
  state: "PENDING";
  is_terminal: false;
  can_cancel: true;
  poll: { after_ms: number; message: string };
}

// RUNNING: Actively processing
interface JobRunning extends JobBase {
  state: "RUNNING";
  is_terminal: false;
  can_cancel: true;
  poll: { after_ms: number; message: string };
  started_at: string;
  progress: JobProgress;
  eta?: { seconds: number; human: string };
}

// CANCEL_REQUESTED: Cancellation in progress
interface JobCancelRequested extends JobBase {
  state: "CANCEL_REQUESTED";
  is_terminal: false;
  can_cancel: false;
  started_at: string;
  progress: JobProgress;
}

// COMPLETED: Success with output
interface JobCompleted extends JobBase {
  state: "COMPLETED";
  is_terminal: true;
  can_cancel: false;
  started_at: string;
  completed_at: string;
  progress: JobProgress;
  output: JobOutput;
}

// FAILED: Error with details
interface JobFailed extends JobBase {
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
interface JobCancelled extends JobBase {
  state: "CANCELLED";
  is_terminal: true;
  can_cancel: false;
  started_at?: string;
  completed_at: string;
  progress?: JobProgress;
}

// The discriminated union - TypeScript will narrow based on `state`
type Job =
  | JobPending
  | JobRunning
  | JobCancelRequested
  | JobCompleted
  | JobFailed
  | JobCancelled;

// ============================================================================
// Progress (always present when job has started)
// ============================================================================

interface JobProgress {
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

// ============================================================================
// Output (only present on COMPLETED)
// ============================================================================

interface JobOutput {
  url: string;              // Always present on completed
  manifest_url: string;
  bytes: number;
  bytes_human: string;
  sha256: string;
  expires_at: string;
  expires_in_seconds: number;
}

// ============================================================================
// Parse at boundary (API layer)
// ============================================================================

// Raw API response (loose types)
interface RawJobResponse {
  job_id: string;
  state: string;
  is_terminal: boolean;
  can_cancel: boolean;
  // ... all fields as optional
  [key: string]: unknown;
}

// Parser function - validates and narrows to discriminated union
function parseJobResponse(raw: RawJobResponse): Job {
  const base: JobBase = {
    job_id: raw.job_id,
    attempt: raw.attempt as number,
    created_at: raw.created_at as string,
    input: raw.input as JobInput,
    timing: raw.timing as JobTiming,
    db_version: raw.db_version as string | undefined,
  };

  switch (raw.state) {
    case "PENDING":
      return { ...base, state: "PENDING", is_terminal: false, can_cancel: true, poll: raw.poll as any };

    case "RUNNING":
      return {
        ...base,
        state: "RUNNING",
        is_terminal: false,
        can_cancel: true,
        poll: raw.poll as any,
        started_at: raw.started_at as string,
        progress: raw.progress as JobProgress,
        eta: raw.eta as any,
      };

    case "COMPLETED":
      return {
        ...base,
        state: "COMPLETED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at as string,
        completed_at: raw.completed_at as string,
        progress: raw.progress as JobProgress,
        output: raw.output as JobOutput,
      };

    case "FAILED":
      return {
        ...base,
        state: "FAILED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at as string | undefined,
        completed_at: raw.completed_at as string,
        progress: raw.progress as JobProgress | undefined,
        error_code: raw.error_code as ErrorCode,
        error_message: raw.error_message as string,
        retryable: raw.retryable as boolean,
      };

    case "CANCELLED":
      return {
        ...base,
        state: "CANCELLED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at as string | undefined,
        completed_at: raw.completed_at as string,
        progress: raw.progress as JobProgress | undefined,
      };

    case "CANCEL_REQUESTED":
      return {
        ...base,
        state: "CANCEL_REQUESTED",
        is_terminal: false,
        can_cancel: false,
        started_at: raw.started_at as string,
        progress: raw.progress as JobProgress,
      };

    default:
      throw new Error(`Unknown job state: ${raw.state}`);
  }
}
```

### Benefits of Discriminated Union Approach

1. **TypeScript narrows automatically**:
   ```typescript
   function renderJob(job: Job) {
     if (job.state === "COMPLETED") {
       // TypeScript knows: job.output exists, job.error_code doesn't
       return <Download url={job.output.url} />;
     }
     if (job.state === "FAILED") {
       // TypeScript knows: job.error_code exists, job.output doesn't
       return <ErrorPanel code={job.error_code} retryable={job.retryable} />;
     }
   }
   ```

2. **No more `?.` chains or null checks**:
   ```typescript
   // Before (defensive)
   const url = job.output?.url ?? null;

   // After (impossible to be wrong)
   if (job.state === "COMPLETED") {
     const url = job.output.url; // Always exists
   }
   ```

3. **Impossible to render invalid UI**:
   - Can't show retry button on completed job
   - Can't show download on failed job
   - Can't show cancel on terminal job

### 1.4 Breaking Changes to Handle

1. **Remove `ParquetState` and `ParquetOutput` types** - No longer needed
2. **Remove all parquet-related UI** - Download button shows Arrow IPC only
3. **Update `KeyType`** - Change `RS_ID` to `RSID` throughout codebase

---

## 2. UX Improvements

### 2.1 Processing Pipeline Visualization (WOW Factor)

**Current:** Simple "X variants processed" text
**New:** Visual pipeline with animated stages

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  QUEUED  │ → │RESOLVING │ → │ SORTING  │ → │ FETCHING │ → │ WRITING  │
│    ○     │   │    ●     │   │    ○     │   │    ○     │   │    ○     │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                   ↑
              Current Stage
              "Converting rsIDs to VIDs..."
```

**Implementation:**
- Create `<ProcessingPipeline>` component
- Animated connecting lines between stages
- Current stage pulses/glows
- Stage description shows below
- Completed stages show checkmark

### 2.2 Enhanced Progress Card

**New elements to add:**

```
┌─────────────────────────────────────────────────────────────┐
│ myfile.vcf                                    [● Running 47%]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ○ ─── ● ─── ○ ─── ○ ─── ○    RESOLVING                    │
│  Queue  Resolve Sort  Fetch Write                           │
│                                                             │
│  "Converting rsIDs to variant IDs..."                       │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░  47%          │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 45,000  │ │ 43,000  │ │  1,800  │ │   200   │           │
│  │Processed│ │  Found  │ │Not Found│ │ Errors  │           │
│  │         │ │  95.6%  │ │   4.0%  │ │   0.4%  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Deduplication: 95,000 unique / 5,000 duplicates  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ETA: ~1 min remaining  •  1,000 rows/sec  •  Duration: 46s│
│                                                             │
│                                        [Cancel Job]         │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Smart Error Handling with Retry

**Current:** Generic error message
**New:** Structured error with actionable buttons

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Job Failed                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Error: MAX_ATTEMPTS_EXCEEDED                               │
│  "Job failed after 3 attempts due to database timeouts"     │
│                                                             │
│  This error is temporary and can be retried.                │
│                                                             │
│                        [Retry Job]  [View Details]          │
└─────────────────────────────────────────────────────────────┘
```

**Error code → Action mapping:**

| Error Code | Retryable | User Action |
|------------|-----------|-------------|
| `CANCELLED` | No | None (user initiated) |
| `MAX_ATTEMPTS_EXCEEDED` | Yes | Show "Retry" button |
| `EMPTY_FILE` | No | "Upload a different file" |
| `INVALID_FORMAT` | No | "Check file format" |
| `NO_KEY_COLUMN` | No | "Verify variant IDs column" |
| `FILE_TOO_LARGE` | No | "Split file into smaller chunks" |
| `INPUT_NOT_FOUND` | No | "Re-upload file" |
| `ROCKSDB_UNAVAILABLE` | Yes | Show "Retry" + status page link |
| `S3_UNAVAILABLE` | Yes | Show "Retry" |
| `TIMEOUT` | Yes | Show "Retry" with smaller file suggestion |
| `LEASE_LOST` | Yes | Auto-retry hint |
| `INTERNAL_ERROR` | Yes | Show "Retry" + contact support |

### 2.4 Real-time Polling with Server Hints

**Current:** Fixed 5-second polling interval
**New:** Use `poll.after_ms` from API response

```typescript
// Smart polling based on server hint
async function pollJob(jobId: string): Promise<JobResponse> {
  while (true) {
    const job = await getJobStatus(jobId, tenantId);

    if (job.is_terminal) return job;

    // Use server-suggested interval (default 2s)
    const delay = job.poll?.after_ms ?? 2000;
    await sleep(delay);
  }
}
```

### 2.5 Deduplication Stats Display

Show users how many duplicates were found:

```
┌────────────────────────────────────────────┐
│ 📊 Input Analysis                          │
│                                            │
│ Total rows:     100,000                    │
│ Unique VIDs:     95,000  (95%)            │
│ Duplicates:       5,000  (5%)  ⓘ          │
│                                            │
│ ⓘ Duplicates are processed once           │
└────────────────────────────────────────────┘
```

### 2.6 ETA Display Enhancement

**Current:** No ETA shown during processing
**New:** Smart ETA with human-readable format

```
ETA: ~1 min remaining
ETA: ~30 seconds
ETA: Almost done...
ETA: Calculating...  (when no estimate available)
```

### 2.7 Download Experience

**Current:** Separate parquet/arrow downloads
**New:** Single Arrow IPC download with clear messaging

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Results Ready                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 variant_annotations.arrow           75 MB               │
│                                                             │
│  Format: Arrow IPC (compatible with Python, R, DuckDB)      │
│  Expires: in 1 hour                                         │
│                                                             │
│  [Download Results]   [View Manifest]   [Open in Analytics] │
│                                                             │
│  💡 Tip: Load with `pyarrow.ipc.open_file()` or DuckDB     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Changes

### 3.1 Files to Modify

| File | Changes |
|------|---------|
| `types/index.ts` | Update all types per contract |
| `api/index.ts` | Update response handling, add retry logic |
| `constants/index.ts` | Add stage configs, error configs |
| `job-progress-card.tsx` | Add pipeline viz, stage display, ETA, dedup stats |
| `validation-summary.tsx` | Update KeyType display (`RSID`) |
| `batch-wizard.tsx` | Handle new validation response fields |
| `jobs-dashboard.tsx` | Show stage in job cards, handle new states |
| `job-configuration.tsx` | No changes needed |

### 3.2 New Components to Create

| Component | Purpose |
|-----------|---------|
| `processing-pipeline.tsx` | Visual stage pipeline with animation |
| `error-panel.tsx` | Smart error display with retry button |
| `dedup-stats.tsx` | Deduplication statistics display |
| `eta-display.tsx` | Smart ETA with countdown |

### 3.3 New Hooks to Create

| Hook | Purpose |
|------|---------|
| `use-job-polling.ts` | Smart polling with server hints |
| `use-job-retry.ts` | Handle job retry logic |

### 3.4 Component Props (Make Invalid States Unrepresentable)

Components should accept the **narrowed type**, not the union:

```typescript
// ❌ BAD: Accepts union, has to handle all cases internally
function JobProgressCard({ job }: { job: Job }) {
  // Must check job.state everywhere
}

// ✅ GOOD: Accepts only valid states for this component
function RunningJobCard({ job }: { job: JobRunning }) {
  // job.progress always exists
  // job.eta might exist
  // job.output never exists (TypeScript enforces this)
}

function CompletedJobCard({ job }: { job: JobCompleted }) {
  // job.output always exists
  // No need for null checks
}

function FailedJobCard({ job }: { job: JobFailed }) {
  // job.error_code always exists
  // job.retryable always exists
}

// Parent component does the narrowing once
function JobDetailPage({ job }: { job: Job }) {
  switch (job.state) {
    case "PENDING":
      return <PendingJobCard job={job} />;
    case "RUNNING":
      return <RunningJobCard job={job} />;
    case "COMPLETED":
      return <CompletedJobCard job={job} />;
    case "FAILED":
      return <FailedJobCard job={job} />;
    case "CANCELLED":
      return <CancelledJobCard job={job} />;
    case "CANCEL_REQUESTED":
      return <CancellingJobCard job={job} />;
  }
}
```

### 3.5 Flatten Control Flow (Guard Clauses)

Use early returns instead of nested conditions:

```typescript
// ❌ BAD: Deeply nested
function handleJobAction(job: Job) {
  if (job) {
    if (job.state === "FAILED") {
      if (job.retryable) {
        return retryJob(job.job_id);
      } else {
        return showError(job.error_message);
      }
    } else if (job.state === "COMPLETED") {
      return downloadResult(job.output.url);
    }
  }
}

// ✅ GOOD: Guard clauses + early returns
function handleJobAction(job: Job) {
  if (!job) return;

  if (job.state === "COMPLETED") {
    return downloadResult(job.output.url);
  }

  if (job.state !== "FAILED") return;

  if (job.retryable) {
    return retryJob(job.job_id);
  }

  return showError(job.error_message);
}

// ✅ EVEN BETTER: Pattern match with switch
function handleJobAction(job: Job) {
  switch (job.state) {
    case "COMPLETED":
      return downloadResult(job.output.url);
    case "FAILED":
      return job.retryable
        ? retryJob(job.job_id)
        : showError(job.error_message);
    default:
      return; // No action for other states
  }
}
```

### 3.6 Derived State (Single Source of Truth)

Don't store what can be computed:

```typescript
// ❌ BAD: Storing derived values
const [isTerminal, setIsTerminal] = useState(false);
const [canCancel, setCanCancel] = useState(true);

// ✅ GOOD: Derive from the source (job.state)
const isTerminal = job.is_terminal; // From API, or derive from state
const canCancel = job.can_cancel;

// Even better - derive in component
function JobActions({ job }: { job: Job }) {
  // These are derived from the discriminated union
  const showCancel = job.state === "PENDING" || job.state === "RUNNING";
  const showRetry = job.state === "FAILED" && job.retryable;
  const showDownload = job.state === "COMPLETED";

  return (
    <>
      {showCancel && <CancelButton />}
      {showRetry && <RetryButton />}
      {showDownload && <DownloadButton url={job.output.url} />}
    </>
  );
}
```

---

## 4. Implementation Order

### Phase 1: Types & Parsing (Foundation - Parse Don't Validate) ✅ COMPLETED
1. [x] Define discriminated union `Job` type with all state variants
2. [x] Create `parseJobResponse()` parser function in `api/index.ts`
3. [x] Update `ProcessingStage` and `ErrorCode` types
4. [x] Fix `KeyType` from `RS_ID` to `RSID` everywhere
5. [x] Remove `ParquetState`, `ParquetOutput` types
6. [x] Add stage/error config constants

### Phase 2: State-Specific Components (Invalid States Unrepresentable) ✅ COMPLETED
7. [x] Create `<PendingJobCard job={JobPending}>` component
8. [x] Create `<RunningJobCard job={JobRunning}>` component (with pipeline)
9. [x] Create `<CompletedJobCard job={JobCompleted}>` component
10. [x] Create `<FailedJobCard job={JobFailed}>` component (with retry)
11. [x] Create `<CancelledJobCard>` component
12. [x] Create parent `<JobDetailView>` that switches on `job.state`

### Phase 3: Shared Sub-Components ✅ COMPLETED
13. [x] Create `<ProcessingPipeline stage={ProcessingStage}>` component
14. [x] Error handling integrated into FailedJobCard (using ERROR_RECOVERY_CONFIG)
15. [x] Create `<DedupStats unique={n} duplicates={n}>` component
16. [x] Create `<EtaDisplay seconds={n}>` component

### Phase 4: Hooks (Single Source of Truth)
17. [x] `useJobPolling(jobId)` already exists and uses `poll.after_ms`
18. [ ] Create `useRetryJob(jobId)` - handles retry flow
19. [x] Removed redundant state from JobDetailClient

### Phase 5: Integration & Polish
20. [x] Update job detail page to use new components
21. [ ] Update jobs dashboard to show stages
22. [x] Add animations (pipeline transitions, progress pulse)
23. [ ] Add loading skeletons
24. [ ] Test all state transitions
25. [ ] Mobile responsiveness check

---

---

## 5. Failure Handling (Resurrection Principle)

### 5.1 Error Recovery Flow

The backend provides structured errors with `retryable` flag. We should make recovery obvious:

```typescript
// Error code → Recovery action mapping
const ERROR_RECOVERY: Record<ErrorCode, {
  title: string;
  description: string;
  action: "retry" | "fix_input" | "contact_support" | "none";
  actionLabel?: string;
}> = {
  CANCELLED: {
    title: "Job Cancelled",
    description: "This job was cancelled at your request.",
    action: "none",
  },
  MAX_ATTEMPTS_EXCEEDED: {
    title: "Temporary Failure",
    description: "The job failed after multiple attempts. This is usually temporary.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  EMPTY_FILE: {
    title: "Empty File",
    description: "The uploaded file contains no data.",
    action: "fix_input",
    actionLabel: "Upload Different File",
  },
  INVALID_FORMAT: {
    title: "Invalid Format",
    description: "The file format could not be parsed.",
    action: "fix_input",
    actionLabel: "Check File Format",
  },
  NO_KEY_COLUMN: {
    title: "No Variant IDs Found",
    description: "Could not identify a column containing variant identifiers.",
    action: "fix_input",
    actionLabel: "Verify Column Headers",
  },
  FILE_TOO_LARGE: {
    title: "File Too Large",
    description: "The file exceeds the maximum size limit.",
    action: "fix_input",
    actionLabel: "Split Into Smaller Files",
  },
  INPUT_NOT_FOUND: {
    title: "File Not Found",
    description: "The uploaded file could not be located. It may have expired.",
    action: "fix_input",
    actionLabel: "Re-upload File",
  },
  ROCKSDB_UNAVAILABLE: {
    title: "Database Unavailable",
    description: "The variant database is temporarily unavailable.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  S3_UNAVAILABLE: {
    title: "Storage Unavailable",
    description: "Cloud storage is temporarily unavailable.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  TIMEOUT: {
    title: "Job Timed Out",
    description: "The job exceeded the maximum runtime.",
    action: "retry",
    actionLabel: "Retry with Smaller File",
  },
  LEASE_LOST: {
    title: "Worker Interrupted",
    description: "The processing worker was interrupted.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  INTERNAL_ERROR: {
    title: "Internal Error",
    description: "An unexpected error occurred.",
    action: "contact_support",
    actionLabel: "Contact Support",
  },
};
```

### 5.2 FailedJobCard Component Design

```tsx
function FailedJobCard({ job }: { job: JobFailed }) {
  const recovery = ERROR_RECOVERY[job.error_code];

  return (
    <Card variant="error">
      <CardHeader>
        <AlertCircle className="text-rose-500" />
        <h3>{recovery.title}</h3>
        <Badge variant="error">{job.error_code}</Badge>
      </CardHeader>

      <CardContent>
        <p>{job.error_message || recovery.description}</p>

        {/* Show attempt count for retryable errors */}
        {job.retryable && (
          <p className="text-sm text-slate-500">
            Attempted {job.attempt} time{job.attempt > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>

      <CardFooter>
        {recovery.action === "retry" && (
          <RetryButton jobId={job.job_id} label={recovery.actionLabel} />
        )}
        {recovery.action === "fix_input" && (
          <Link href="/batch-annotation">
            <Button variant="outline">{recovery.actionLabel}</Button>
          </Link>
        )}
        {recovery.action === "contact_support" && (
          <Button variant="outline" onClick={openSupportDialog}>
            {recovery.actionLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 6. UI/UX Design

### Color Palette for Stages
- **QUEUED**: `slate-400` (neutral, waiting)
- **RESOLVING**: `blue-500` (processing, phase 1)
- **SORTING**: `indigo-500` (processing, phase 2)
- **FETCHING**: `violet-500` (processing, phase 3)
- **WRITING**: `purple-500` (finalizing)
- **DONE**: `emerald-500` (success)

### Animation Ideas
- Stage transitions: Smooth slide + fade
- Current stage: Subtle pulse animation
- Progress bar: Gradient animation
- ETA countdown: Smooth number transitions

### Micro-interactions
- Copy job ID: Brief checkmark animation
- Download button: Download icon bounces
- Retry button: Subtle shake on hover
- Cancel confirmation: Red glow effect

---

## 7. Testing Checklist

### Contract Tests
- [ ] All new fields render correctly
- [ ] Missing optional fields handled gracefully
- [ ] KeyType RSID works throughout
- [ ] No parquet references remain

### UX Tests
- [ ] Pipeline shows correct current stage
- [ ] Stage transitions animate smoothly
- [ ] ETA updates correctly
- [ ] Retry button appears for retryable errors
- [ ] Dedup stats show when duplicates exist
- [ ] Download works with Arrow IPC

### Edge Cases
- [ ] Job with 0 duplicates
- [ ] Job with 100% not found
- [ ] Very long ETA (hours)
- [ ] Rapid stage transitions
- [ ] Network interruption during polling

---

## 8. Success Metrics

After implementation, we should see:
- **Clarity**: Users understand exactly what stage their job is in
- **Confidence**: Clear progress indicators reduce anxiety
- **Actionability**: Errors tell users exactly what to do
- **Delight**: Smooth animations and micro-interactions
- **Trust**: Accurate ETAs and transparent deduplication

---

## Appendix: Full New Backend Contract

See the backend API contract provided in the original request for complete endpoint specifications.
