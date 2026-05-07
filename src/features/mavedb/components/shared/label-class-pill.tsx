import { cn } from "@infra/utils";
import { LABEL_CLASS_DESCRIPTIONS, LABEL_CLASS_STYLE } from "../../constants";
import type { LabelClass } from "../../types";

interface LabelClassPillProps {
  labelClass: LabelClass;
  count: number;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Hero count tile for the variant gateway. One per LabelClass — clickable
 * (acts as a filter) when `onClick` is provided.
 */
export function LabelClassPill({
  labelClass,
  count,
  active,
  onClick,
}: LabelClassPillProps) {
  const interactive = typeof onClick === "function";
  const Comp = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left transition-colors",
        LABEL_CLASS_STYLE[labelClass],
        interactive && "cursor-pointer hover:brightness-105",
        active && "ring-2 ring-offset-2 ring-offset-background ring-current",
      )}
    >
      <p className="text-2xl font-semibold tabular-nums leading-none">
        {count}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider">
        {labelClass}
      </p>
      <p className="text-[10px] opacity-80">
        {LABEL_CLASS_DESCRIPTIONS[labelClass]}
      </p>
    </Comp>
  );
}
