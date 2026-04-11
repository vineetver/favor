"use client";

import { Button } from "@shared/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function VariantError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("[VariantLayout Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-muted-foreground mb-6">
          {error.message ||
            "An unexpected error occurred while loading the variant page."}
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </Button>

          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
