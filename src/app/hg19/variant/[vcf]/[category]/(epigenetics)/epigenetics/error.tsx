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
      categoryName="Epigenetics Data"
      description="We encountered an error while loading the epigenetics annotations. This might be due to a network issue or a problem with the data source."
    />
  );
}
