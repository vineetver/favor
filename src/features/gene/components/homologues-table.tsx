"use client";

import { ExternalLink } from "@shared/components/ui/external-link";

type Homologue = {
  speciesName: string;
  targetGeneId: string;
  targetGeneSymbol: string;
  queryPercentageIdentity: number;
  priority: number;
  [key: string]: unknown;
};

interface HomologuesTableProps {
  homologues: Homologue[] | null | undefined;
}

export function HomologuesTable({ homologues }: HomologuesTableProps) {
  if (!homologues || homologues.length === 0) return null;

  const sorted = [...homologues].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
  );

  return (
    <div className="flex flex-col gap-1">
      {sorted.map((h, i) => (
        <div key={i} className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm text-foreground">{h.speciesName}</span>
          <span className="text-muted-foreground">—</span>
          <ExternalLink
            href={`https://www.ensembl.org/id/${h.targetGeneId}`}
            className="text-sm text-primary hover:underline"
            iconSize="sm"
          >
            {h.targetGeneSymbol}
          </ExternalLink>
          <span className="text-xs text-muted-foreground tabular-nums">
            {h.queryPercentageIdentity?.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
