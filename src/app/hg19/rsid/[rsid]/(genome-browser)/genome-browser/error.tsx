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
      categoryName="Genome Browser"
      description="We encountered an error while loading the genome browser for this variant. This could be due to invalid coordinates or a temporary server issue."
    />
  );
}