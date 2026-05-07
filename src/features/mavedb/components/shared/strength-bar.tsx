import { cn } from "@infra/utils";
import { strengthFill, strengthLabel } from "../../lib/parse";
import type { EvidenceStrength } from "../../types";

interface StrengthBarProps {
  strength: EvidenceStrength | null;
}

const SEGMENTS = 4;

/**
 * Four-segment fill bar. SUPPORTING=1, MODERATE=2, MODERATE_PLUS=3, STRONG=4.
 */
export function StrengthBar({ strength }: StrengthBarProps) {
  const filled = strengthFill(strength);
  const label = strengthLabel(strength);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Evidence strength: ${label}`}
    >
      <span className="inline-flex gap-0.5" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-3 rounded-sm",
              i < filled ? "bg-foreground/80" : "bg-muted",
            )}
          />
        ))}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
