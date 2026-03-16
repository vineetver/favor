import type { ServerFilterConfig } from "@shared/hooks";
import { formatTissueName, TISSUE_GROUPS } from "@shared/utils/tissue-format";

/** Tissue group dropdown using the 18 standard groups */
export function tissueGroupFilter(
  groups?: string[],
): ServerFilterConfig {
  return {
    id: "tissue_group",
    label: "Tissue Group",
    type: "select",
    placeholder: "All groups",
    options: (groups ?? (TISSUE_GROUPS as unknown as string[])).map((g) => ({
      value: g,
      label: g,
    })),
  };
}

/** Biosample / tissue dropdown with human-readable labels */
export function tissueFilter(
  tissues: string[],
  opts?: { label?: string; format?: boolean },
): ServerFilterConfig {
  const label = opts?.label ?? "Biosample";
  const format = opts?.format ?? true;
  return {
    id: "tissue",
    label,
    type: "select",
    placeholder: `All ${label.toLowerCase()}s`,
    options: tissues.map((t) => ({
      value: t,
      label: format ? formatTissueName(t) : t,
    })),
  };
}

/** "Significant only" toggle filter (used by ASE, QTLs) */
export function significantOnlyFilter(): ServerFilterConfig {
  return {
    id: "significant_only",
    label: "Significant",
    type: "select",
    placeholder: "All",
    options: [{ value: "true", label: "Significant only" }],
  };
}
