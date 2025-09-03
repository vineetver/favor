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
      categoryName="GWAS Catalog Data"
      description="We encountered an error while loading the GWAS catalog data. This could be due to a network issue or a temporary server problem."
    />
  );
}
