import { cn } from "@infra/utils";

export type BadgeVariant = "positive" | "negative" | "warning" | "neutral" | "primary";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negative: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
  primary: "bg-primary/10 text-primary border-primary/20",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-semibold",
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface ChipProps {
  children: React.ReactNode;
  className?: string;
}

export function Chip({ children, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-caption font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

interface LinkChipProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkChip({ href, children, className }: LinkChipProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-primary hover:bg-slate-100 transition-colors",
        className
      )}
    >
      {children}
    </a>
  );
}
