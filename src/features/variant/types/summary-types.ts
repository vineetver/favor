/**
 * Type definitions and error classes for variant summary feature
 * Shared between server actions and client code
 */

export type SummaryStatus = "pending" | "generating" | "completed" | "failed";

export interface SummaryData {
  status: SummaryStatus;
  summary?: string;
  error?: string;
  timestamp?: string;
}

/**
 * Custom error types for better error handling
 */
export class SummaryNotFoundError extends Error {
  constructor(vcf: string) {
    super(`Summary not found for variant: ${vcf}`);
    this.name = "SummaryNotFoundError";
  }
}

export class SummaryDatabaseError extends Error {
  constructor(message: string) {
    super(`Database error: ${message}`);
    this.name = "SummaryDatabaseError";
  }
}

export class SummaryAPIError extends Error {
  constructor(message: string) {
    super(`API error: ${message}`);
    this.name = "SummaryAPIError";
  }
}
