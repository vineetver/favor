"use client";

import { AlertCircle, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "../button";

interface LoadingStateProps {
  rows?: number;
  columns?: number;
}

export function LoadingState({ rows = 8, columns = 4 }: LoadingStateProps) {
  return (
    <div className="overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-2.5 bg-muted/50">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/50">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-2.5">
                  <div
                    className="h-3 bg-muted rounded animate-pulse"
                    style={{ width: `${65 + ((rowIdx * 7 + colIdx * 13) % 30)}%` }}
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
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileSearch className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
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
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm text-center">
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
