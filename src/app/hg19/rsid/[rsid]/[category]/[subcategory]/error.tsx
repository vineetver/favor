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
      categoryName="Variant Annotation"
      description="We encountered an error while loading the annotation data for this variant. This could be due to an invalid rsID or a temporary server issue."
    />
  );
}
