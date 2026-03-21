"use client";

import { Button } from "@shared/components/ui/button";

export default function ErrorBoundary({
  error: err,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <h3 className="text-destructive font-medium mb-2">
          Error loading summary
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{err.message}</p>
        <Button variant="outline" size="sm" onClick={reset}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
