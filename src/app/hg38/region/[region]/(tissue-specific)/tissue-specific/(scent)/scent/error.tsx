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
      categoryName="SCENT Data"
      description="We encountered an error while loading the SCENT tissue-specific expression data for this region. This could be due to a network issue or a temporary server problem."
    />
  );
}
