"use client";

import { cn } from "@infra/utils";
import { useWhatsNew } from "../hooks/use-whats-new";

interface NewDotProps {
  /** Highlight `navSlug` to check against the unread set. */
  slug: string;
  className?: string;
}

/**
 * 6px primary-color dot rendered next to a sub-nav item when there's
 * an unread highlight pointing at that slug. Drop next to a tab label,
 * sidebar link, or button. Clears once the user marks the highlight
 * seen (typically by visiting the destination, handled by the consumer).
 */
export function NewDot({ slug, className }: NewDotProps) {
  const { hasUnreadFor } = useWhatsNew();
  if (!hasUnreadFor(slug)) return null;
  return (
    <span
      role="img"
      aria-label="New"
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full bg-primary",
        "align-middle",
        className,
      )}
    />
  );
}
