"use client";

import { useState } from "react";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@shared/components/ui/sheet";

type GoTerm = {
  id: string;
  source: string;
  evidence: string;
  aspect: string;
  geneProduct: string;
  ecoId: string;
};

type FunctionDetailViewProps = {
  descriptions: string[];
  sources?: Array<{ location: string; source: string }>;
  goTerms?: GoTerm[];
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
    .replace(/\s*\{[^}]*\}\s*\.?/g, "")     // Remove {ECO:xxx|PubMed:xxx} blocks
    .replace(/\s*\([^)]*ECO:[^)]*\)/g, "")  // Remove (ECO:xxx...) parenthetical
    .replace(/\s*\([^)]*PubMed:[^)]*\)/g, "")  // Remove (PubMed:xxx...) parenthetical
    .replace(/\s*\([,\s]*\)/g, "")          // Remove empty parentheses like (,,) or ( )
    .replace(/\s*ECO:\d+/g, "")             // Remove standalone ECO:xxx
    .replace(/\s*PubMed:\d+/g, "")          // Remove standalone PubMed:xxx
    .replace(/\s+\./g, ".")                 // Clean up spaces before periods
    .replace(/\s+,/g, ",")                  // Clean up spaces before commas
    .replace(/,{2,}/g, ",")                 // Collapse multiple commas
    .replace(/\s{2,}/g, " ")                // Collapse multiple spaces
    .trim();

  return {
    text: cleanText,
    citations: {
      pubmed: pubmedIds,
      eco: ecoIds,
    },
  };
}

function getSummary(descriptions: string[]) {
  if (!descriptions || descriptions.length === 0) return "";
  const firstDesc = parseCitations(descriptions[0]).text;
  const sentences = firstDesc.split(/[.!?]+/).filter(Boolean);
  return sentences.slice(0, 2).join(". ").trim() + ".";
}

// Group GO terms by aspect
function groupGoTermsByAspect(goTerms: GoTerm[]) {
  const groups: Record<string, GoTerm[]> = {};
  for (const term of goTerms) {
    const aspect = term.aspect || "other";
    if (!groups[aspect]) groups[aspect] = [];
    groups[aspect].push(term);
  }
  return groups;
}

const ASPECT_LABELS: Record<string, string> = {
  biological_process: "Biological Process",
  molecular_function: "Molecular Function",
  cellular_component: "Cellular Component",
  other: "Other",
};

type TabId = "function" | "location" | "go_terms" | "citations";

type TabConfig = {
  id: TabId;
  label: string;
  show: boolean;
};

export function FunctionDetailView({ descriptions, sources, goTerms }: FunctionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("function");

  if (!descriptions || descriptions.length === 0) return null;

  const parsed = descriptions.map(parseCitations);
  const summary = getSummary(descriptions);
  const allPubmedIds = [...new Set(parsed.flatMap(p => p.citations.pubmed))];
  const allEcoIds = [...new Set(parsed.flatMap(p => p.citations.eco))];
  const hasCitations = allPubmedIds.length > 0 || allEcoIds.length > 0;
  const hasGoTerms = goTerms && goTerms.length > 0;
  const groupedGoTerms = hasGoTerms ? groupGoTermsByAspect(goTerms) : {};

  const tabs: TabConfig[] = [
    { id: "function", label: "Function", show: true },
    { id: "location", label: "Location", show: Boolean(sources && sources.length > 0) },
    { id: "go_terms", label: "GO Terms", show: hasGoTerms },
    { id: "citations", label: "Citations", show: hasCitations },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <div>
      {/* Summary View */}
      <div className="space-y-2.5">
        <p className="text-sm text-slate-900 leading-relaxed">
          {summary}
        </p>

        {/* Citation Chips */}
        {hasCitations && (
          <div className="flex gap-2 flex-wrap items-center">
            {allPubmedIds.slice(0, 3).map((id) => (
              <span
                key={`pm-${id}`}
                className="text-xs px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-md font-medium"
              >
                PMID:{id}
              </span>
            ))}
            {allPubmedIds.length > 3 && (
              <span className="text-xs text-slate-400">
                +{allPubmedIds.length - 3} more
              </span>
            )}
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" size="sm" className="p-0 h-auto text-sm">
              View details
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-lg flex flex-col overflow-hidden !bg-white">
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold text-slate-900">
                Function Details
              </SheetTitle>
            </SheetHeader>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mt-4 overflow-x-auto flex-shrink-0">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto flex-1 pt-5 pb-6">
              {activeTab === "function" && (
                <div className="space-y-4">
                  <ul className="space-y-4">
                    {parsed.map((item, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-700 leading-relaxed">
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "location" && sources && (
                <div className="space-y-3">
                  {sources.map((loc, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700">{loc.location}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Source: {loc.source}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "go_terms" && hasGoTerms && (
                <div className="space-y-6">
                  {Object.entries(groupedGoTerms).map(([aspect, terms]) => (
                    <div key={aspect} className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {ASPECT_LABELS[aspect] || aspect.replace(/_/g, " ")}
                      </h4>
                      <div className="space-y-2">
                        {terms.map((term, index) => (
                          <div key={index} className="flex gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ExternalLink
                                  href={`https://www.ebi.ac.uk/QuickGO/term/${term.id}`}
                                  className="text-sm font-medium text-primary hover:underline"
                                  iconSize="sm"
                                >
                                  {term.id}
                                </ExternalLink>
                                {term.geneProduct && (
                                  <span className="text-sm text-slate-600">
                                    {term.geneProduct}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Evidence: {term.evidence}
                                {term.source && ` · Source: ${term.source}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "citations" && (
                <div className="space-y-6">
                  {allPubmedIds.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        PubMed References
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {allPubmedIds.map((id) => (
                          <ExternalLink
                            key={`pubmed-${id}`}
                            href={`https://pubmed.ncbi.nlm.nih.gov/${id}`}
                            className="text-xs px-2.5 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md font-medium hover:bg-sky-100 transition-colors"
                            iconSize="sm"
                          >
                            PMID:{id}
                          </ExternalLink>
                        ))}
                      </div>
                    </div>
                  )}
                  {allEcoIds.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Evidence Codes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {allEcoIds.map((id) => (
                          <ExternalLink
                            key={`eco-${id}`}
                            href={`https://www.ebi.ac.uk/QuickGO/term/ECO:${id}`}
                            className="text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium hover:bg-emerald-100 transition-colors"
                            iconSize="sm"
                          >
                            ECO:{id}
                          </ExternalLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
