"use client";

import { RuntimeError } from "@/components/ui/error-states";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RuntimeError
      error={error}
      reset={reset}
      categoryName="Integrative Data"
      description="We encountered an error while loading the integrative annotation scores. This could be due to a network issue or a temporary server problem."
    />
  );
}
