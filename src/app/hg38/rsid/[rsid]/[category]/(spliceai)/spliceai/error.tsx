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
      categoryName="SpliceAI Data"
      description="We encountered an error while loading the SpliceAI splice prediction data. This could be due to a network issue or a temporary server problem."
    />
  );
}
