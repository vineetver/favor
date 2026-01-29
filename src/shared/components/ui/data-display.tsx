import { cn } from "@infra/utils";
import type { ReactNode } from "react";

/**
 * Section label - uppercase, tracking-widest
 * Use for: card headers, panel titles, group labels
 */
export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-label text-subtle", className)}>{children}</div>
  );
}

/**
 * Section title - larger, semibold
 * Use for: hallmark names, category titles, primary groupings
 */
export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-section-header", className)}>{children}</div>
  );
}

/**
 * Item title - semibold heading text
 * Use for: list item titles, probe names, event names
 */
export function ItemTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-sm font-semibold text-heading", className)}>
      {children}
    </div>
  );
}

/**
 * Body text - standard secondary text
 * Use for: descriptions, explanatory text
 */
export function BodyText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-body-sm text-body", className)}>{children}</div>
  );
}

/**
 * Subtle text - muted, for secondary info
 * Use for: subtitles, meta information, counts
 */
export function SubtleText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-body-sm text-subtle", className)}>{children}</div>
  );
}

/**
 * Data value - monospace for identifiers and codes
 * Use for: IDs, PMIDs, variant identifiers
 */
export function DataValue({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("text-data", className)}>{children}</span>;
}

/**
 * Key-value row - consistent label/value display
 */
export function KeyValueRow({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-body-sm", className)}>
      <span className="text-subtle">{label}:</span>
      {mono ? (
        <DataValue>{value ?? "—"}</DataValue>
      ) : (
        <span className="text-body">{value ?? "—"}</span>
      )}
    </div>
  );
}

/**
 * Key-value grid - for multiple key-value pairs in a row
 */
export function KeyValueGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", className)}
    >
      {children}
    </div>
  );
}

/**
 * Empty value placeholder
 */
export function EmptyValue({ className }: { className?: string }) {
  return <span className={cn("text-body-sm text-subtle", className)}>—</span>;
}

/**
 * Section with label and content
 */
export function Section({
  label,
  count,
  children,
  className,
}: {
  label: string;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <SectionLabel>
        {label}
        {count !== undefined && ` (${count})`}
      </SectionLabel>
      {children}
    </div>
  );
}
