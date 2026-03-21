import type { ReactNode } from "react";

import { MessageResponse } from "@shared/components/ai-elements/message";
import { Badge } from "@shared/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      {type}
    </Badge>
  );
}

export function fmt(n: number, digits = 2): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toExponential(digits);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function StatCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text summary + collapsible raw data
// ---------------------------------------------------------------------------

export function TextSummaryWithData({
  textSummary,
  children,
}: {
  textSummary: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <MessageResponse>{textSummary}</MessageResponse>
      <Collapsible>
        <CollapsibleTrigger className="group/raw flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDownIcon className="size-3 transition-transform duration-200 group-data-[state=open]/raw:rotate-180" />
          <span className="font-medium">View raw data</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
