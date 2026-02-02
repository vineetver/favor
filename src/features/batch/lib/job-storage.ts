/**
 * Job Storage - Persists job metadata to localStorage
 * Allows users to track jobs across page navigations
 */

import type { JobProgress, JobState, StoredJob } from "../types";

const STORAGE_KEY = "favor_batch_jobs";
const MAX_STORED_JOBS = 50;

/**
 * Get all stored jobs
 */
export function getStoredJobs(): StoredJob[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get a specific stored job by ID
 */
export function getStoredJob(jobId: string): StoredJob | null {
  const jobs = getStoredJobs();
  return jobs.find((j) => j.job_id === jobId) || null;
}

/**
 * Save a new job to storage
 */
export function saveJob(job: StoredJob): void {
  if (typeof window === "undefined") return;

  const jobs = getStoredJobs();

  // Check if job already exists
  const existingIndex = jobs.findIndex((j) => j.job_id === job.job_id);
  if (existingIndex >= 0) {
    jobs[existingIndex] = job;
  } else {
    jobs.unshift(job);
  }

  // Keep only the most recent jobs
  const trimmed = jobs.slice(0, MAX_STORED_JOBS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Update an existing job's state and progress
 */
export function updateJobStatus(
  jobId: string,
  state: JobState,
  progress?: JobProgress,
): void {
  const jobs = getStoredJobs();
  const job = jobs.find((j) => j.job_id === jobId);

  if (job) {
    job.state = state;
    if (progress) {
      job.progress = progress;
    }
    saveJob(job);
  }
}

/**
 * Remove a job from storage
 */
export function removeJob(jobId: string): void {
  if (typeof window === "undefined") return;

  const jobs = getStoredJobs().filter((j) => j.job_id !== jobId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // Storage unavailable
  }
}

/**
 * Get jobs that are still in progress (not terminal)
 */
export function getActiveJobs(): StoredJob[] {
  const jobs = getStoredJobs();
  return jobs.filter(
    (j) => j.state === "PENDING" || j.state === "RUNNING" || j.state === "CANCEL_REQUESTED",
  );
}

/**
 * Get jobs that have completed (terminal states)
 */
export function getCompletedJobs(): StoredJob[] {
  const jobs = getStoredJobs();
  return jobs.filter(
    (j) => j.state === "COMPLETED" || j.state === "FAILED" || j.state === "CANCELLED",
  );
}

/**
 * Clear all stored jobs
 */
export function clearAllJobs(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable
  }
}
