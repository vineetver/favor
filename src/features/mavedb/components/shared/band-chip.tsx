import { cn } from "@infra/utils";
import { LABEL_CLASS_FALLBACK_STYLE, LABEL_CLASS_STYLE } from "../../constants";
import type { LabelClass } from "../../types";

interface BandChipProps {
  labelClass: LabelClass | null;
  children: React.ReactNode;
  className?: string;
}

/**
 * Color-coded pill for an ACMG band. Color is driven by `label_class`;
 * `display_label` (or whatever else) goes in `children`.
 */
export function BandChip({ labelClass, children, className }: BandChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        labelClass ? LABEL_CLASS_STYLE[labelClass] : LABEL_CLASS_FALLBACK_STYLE,
        className,
      )}
    >
      {children}
    </span>
  );
}
