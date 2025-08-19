"use client";

import { RuntimeError } from "@/components/ui/error-states";

export default function GwasCatalogError({
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
      description="We encountered an error while loading the GWAS catalog data. This might be due to a network issue or a problem with the data source."
    />
  );
}
