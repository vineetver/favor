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
      categoryName="Male Allele Frequency Data"
      description="We encountered an error while loading the male-specific allele frequency data. This might be due to a network issue or a problem with the data source."
    />
  );
}
