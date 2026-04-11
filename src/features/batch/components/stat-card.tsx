import { cn } from "@infra/utils";
import type { LucideIcon } from "lucide-react";

export type StatCardVariant =
  | "default"
  | "positive"
  | "warning"
  | "negative"
  | "primary";

interface StatCardProps {
  value: string | number;
  label: string;
  /** Short inline hint shown in parentheses after label */
  percentage?: string;
  /** Longer description shown below the value */
  subValue?: string;
  variant?: StatCardVariant;
  icon?: LucideIcon;
  className?: string;
}

const VARIANT_STYLES: Record<
  StatCardVariant,
  { container: string; value: string }
> = {
  default: {
    container: "bg-muted border-border",
    value: "text-foreground",
  },
  positive: {
    container: "bg-emerald-50 border-emerald-200",
    value: "text-emerald-700",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    value: "text-amber-700",
  },
  negative: {
    container: "bg-rose-50 border-rose-200",
    value: "text-rose-700",
  },
  primary: {
    container: "bg-primary/5 border-primary/20",
    value: "text-primary",
  },
};

export function StatCard({
  value,
  label,
  percentage,
  subValue,
  variant = "default",
  icon: Icon,
  className,
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant];
  const displayValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className={cn("p-4 rounded-xl border", styles.container, className)}>
      {Icon && (
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
      )}
      <div
        className={cn(
          "text-xl font-bold",
          Icon ? "text-2xl" : "text-center",
          styles.value,
        )}
      >
        {displayValue}
      </div>
      {!Icon && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          {label}
          {percentage && (
            <span className="ml-1 text-muted-foreground/70">
              ({percentage})
            </span>
          )}
        </div>
      )}
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  );
}
