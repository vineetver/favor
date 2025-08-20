"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TissueSpecificErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TissueSpecificError({
  error,
  reset,
}: TissueSpecificErrorProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Error Loading Tissue-Specific Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-red-700">
          <p className="mb-2">
            We encountered an error while loading tissue-specific regulatory
            data. This could be due to a network issue or a temporary server
            problem.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">
              Technical Details
            </summary>
            <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono">
              {error.message}
              {error.digest && (
                <div className="mt-1 text-red-600">Digest: {error.digest}</div>
              )}
            </div>
          </details>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={reset}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Refresh Page
          </Button>
        </div>

        <div className="text-xs text-red-600">
          If this problem persists, please try refreshing the page or check your
          internet connection.
        </div>
      </CardContent>
    </Card>
  );
}
