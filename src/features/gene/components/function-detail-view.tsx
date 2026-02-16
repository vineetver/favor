"use client";

import { ExternalLink } from "@shared/components/ui/external-link";

type FunctionDetailViewProps = {
  descriptions: string[];
};

/**
 * Parse and clean citation references from text.
 * Extracts PubMed and ECO IDs while removing them from the display text.
 */
function parseCitations(text: string) {
  const ecoRegex = /ECO:(\d+)/g;
  const pubmedRegex = /PubMed:(\d+)/g;

  const ecoIds: string[] = [];
  const pubmedIds: string[] = [];

  let match;
  while ((match = ecoRegex.exec(text)) !== null) {
    ecoIds.push(match[1]);
  }
  while ((match = pubmedRegex.exec(text)) !== null) {
    pubmedIds.push(match[1]);
  }

  // Remove citation blocks and clean up text
  const cleanText = text
    .replace(/\s*\{[^}]*\}\s*\.?/g, "")
    .replace(/\s*\([^)]*ECO:[^)]*\)/g, "")
    .replace(/\s*\([^)]*PubMed:[^)]*\)/g, "")
    .replace(/\s*\([,\s]*\)/g, "")
    .replace(/\s*ECO:\d+/g, "")
    .replace(/\s*PubMed:\d+/g, "")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    text: cleanText,
    citations: {
      pubmed: pubmedIds,
      eco: ecoIds,
    },
  };
}

export function FunctionDetailView({ descriptions }: FunctionDetailViewProps) {
  if (!descriptions || descriptions.length === 0) return null;

  const parsed = descriptions.map(parseCitations);
  const allPubmedIds = [...new Set(parsed.flatMap((p) => p.citations.pubmed))];

  return (
    <div className="space-y-3">
      {parsed.map((item, index) => (
        <p key={index} className="text-sm text-foreground leading-relaxed">
          {item.text}
        </p>
      ))}

      {allPubmedIds.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center pt-1">
          {allPubmedIds.slice(0, 5).map((id) => (
            <ExternalLink
              key={id}
              href={`https://pubmed.ncbi.nlm.nih.gov/${id}`}
              className="text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md font-medium hover:bg-primary/15 transition-colors"
              iconSize="sm"
            >
              PMID:{id}
            </ExternalLink>
          ))}
          {allPubmedIds.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{allPubmedIds.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
