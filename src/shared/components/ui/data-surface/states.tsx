"use client";

import { AlertCircle, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "../button";

interface LoadingStateProps {
  rows?: number;
  columns?: number;
}

export function LoadingState({ rows = 5, columns = 4 }: LoadingStateProps) {
  return (
    <div className="overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 bg-slate-50/80">
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-slate-50">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-6 py-3">
                  <div
                    className="h-4 bg-slate-100 rounded animate-pulse"
                    style={{ width: `${60 + Math.random() * 40}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export function EmptyState({
  message = "No data found",
  description = "Try adjusting your search or filters",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <FileSearch className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{message}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = typeof error === "string" ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm text-center">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
