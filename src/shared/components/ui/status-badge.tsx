import { cn } from "@infra/utils";

export type BadgeVariant = "positive" | "negative" | "warning" | "neutral" | "primary";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  positive: "bg-success/10 text-success border-success/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  neutral: "bg-muted text-muted-foreground border-border",
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
        "inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-caption font-medium",
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
        "inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 text-caption font-medium text-primary hover:bg-muted/80 transition-colors",
        className
      )}
    >
      {children}
    </a>
  );
}
