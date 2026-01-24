"use client";

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
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-slate-500 mb-6">
          {error.message || "An unexpected error occurred while loading the variant page."}
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
