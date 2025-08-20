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
      categoryName="Variant Table"
      description="We encountered an error while loading the variant table for this region. This could be due to invalid parameters or a temporary server issue."
    />
  );
}