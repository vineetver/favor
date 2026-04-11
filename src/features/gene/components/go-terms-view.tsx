"use client";

import { cn } from "@infra/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ExternalLink } from "@shared/components/ui/external-link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const COLLAPSED_LIMIT = 6;

type GoTermDetail = {
  id: string;
  aspect: string;
  evidence: string;
  [key: string]: string;
};

interface GoTermsViewProps {
  go:
    | {
        biological_process?: string;
        molecular_function?: string;
        cellular_component?: string;
      }
    | null
    | undefined;
  goDetailed?: GoTermDetail[] | null;
}

function parseSemicolonList(str: string | undefined): string[] {
  if (!str) return [];
  return str
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Deduplicate GO IDs for an aspect */
function uniqueIdsForAspect(
  detailed: GoTermDetail[] | null | undefined,
  aspect: string,
): string[] {
  if (!detailed) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const t of detailed) {
    if (t.aspect === aspect && !seen.has(t.id)) {
      seen.add(t.id);
      ids.push(t.id);
    }
  }
  return ids;
}

function AspectSection({
  label,
  terms,
  goIds,
}: {
  label: string;
  terms: string[];
  goIds: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (terms.length === 0) return null;

  const showToggle = terms.length > COLLAPSED_LIMIT;
  const visible = expanded ? terms : terms.slice(0, COLLAPSED_LIMIT);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground/60">{terms.length}</span>
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex flex-col gap-1.5">
          {visible.map((term, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-sm text-foreground leading-snug">
                {term}
              </span>
              {goIds[i] && (
                <ExternalLink
                  href={`https://www.ebi.ac.uk/QuickGO/term/${goIds[i]}`}
                  className="text-xs text-primary font-mono shrink-0 hover:underline"
                  iconSize="sm"
                >
                  {goIds[i]}
                </ExternalLink>
              )}
            </div>
          ))}
        </div>
        {showToggle && (
          <>
            <CollapsibleContent>
              <div className="flex flex-col gap-1.5">
                {terms.slice(COLLAPSED_LIMIT).map((term, i) => {
                  const idx = i + COLLAPSED_LIMIT;
                  return (
                    <div key={idx} className="flex items-baseline gap-2">
                      <span className="text-sm text-foreground leading-snug">
                        {term}
                      </span>
                      {goIds[idx] && (
                        <ExternalLink
                          href={`https://www.ebi.ac.uk/QuickGO/term/${goIds[idx]}`}
                          className="text-xs text-primary font-mono shrink-0 hover:underline"
                          iconSize="sm"
                        >
                          {goIds[idx]}
                        </ExternalLink>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
                {expanded ? "Show less" : `Show all ${terms.length}`}
              </button>
            </CollapsibleTrigger>
          </>
        )}
      </Collapsible>
    </div>
  );
}

export function GoTermsView({ go, goDetailed }: GoTermsViewProps) {
  if (!go) return null;

  const bp = parseSemicolonList(go.biological_process);
  const mf = parseSemicolonList(go.molecular_function);
  const cc = parseSemicolonList(go.cellular_component);

  if (bp.length === 0 && mf.length === 0 && cc.length === 0) return null;

  const bpIds = uniqueIdsForAspect(goDetailed, "P");
  const mfIds = uniqueIdsForAspect(goDetailed, "F");
  const ccIds = uniqueIdsForAspect(goDetailed, "C");

  return (
    <div className="space-y-5">
      <AspectSection label="Biological Process" terms={bp} goIds={bpIds} />
      <AspectSection label="Molecular Function" terms={mf} goIds={mfIds} />
      <AspectSection label="Cellular Component" terms={cc} goIds={ccIds} />
    </div>
  );
}
