"use client";

import { updateClientUrl, useClientSearchParams } from "@shared/hooks";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

/**
 * Shown above the detail DataSurface when `tissue_group` is in the URL.
 * Clears tissue_group, cursor, and tissue params to return to the grouped view.
 */
export function TissueGroupBackButton() {
  const searchParams = useClientSearchParams();
  const tissueGroup = searchParams.get("tissue_group");

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("tissue_group");
    params.delete("cursor");
    params.delete("tissue");
    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    updateClientUrl(url, true);
  }, []);

  if (!tissueGroup) return null;

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>All tissue groups</span>
      <span className="text-foreground font-medium ml-1">{tissueGroup}</span>
    </button>
  );
}
