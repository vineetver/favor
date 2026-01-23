"use client";

import { AlertTriangle, FileQuestion, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

interface BaseErrorProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  categoryName?: string;
  title?: string;
  description?: string;
}

export function RuntimeError({
  error,
  reset,
  categoryName = "Data",
  title,
  description,
}: BaseErrorProps) {
  useEffect(() => {
    if (error) {
      console.error(`${categoryName} error:`, error);
    }
  }, [error, categoryName]);

  const errorTitle = title || `Failed to Load ${categoryName}`;
  const errorDescription =
    description ||
    `We encountered an error while loading the ${categoryName.toLowerCase()}. This could be due to a network issue or a temporary server problem.`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-60" />
          <h2 className="text-2xl font-semibold mb-2">{errorTitle}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {errorDescription}
          </p>

          <div className="space-y-4">
            {reset && (
              <Button onClick={reset} className="gap-2" size="lg">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}

            {error?.digest && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono">
                  <p>
                    <strong>Error:</strong> {error.message}
                  </p>
                  <p>
                    <strong>Digest:</strong> {error.digest}
                  </p>
                </div>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoDataState({
  categoryName = "data",
  title,
  description,
}: Omit<BaseErrorProps, "error" | "reset">) {
  const noDataTitle = title || `No ${categoryName} Available`;
  const noDataDescription =
    description ||
    `No ${categoryName.toLowerCase()} is available for this variant.`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center py-16">
          <FileQuestion className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-60" />
          <h3 className="text-xl font-semibold mb-2">{noDataTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {noDataDescription}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
