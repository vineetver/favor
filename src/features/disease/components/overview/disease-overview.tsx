"use client";

import { ExternalLink } from "lucide-react";
import type { Disease } from "@/features/disease/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClickableEntityId } from "@/components/ui/clickable-entity-id";

interface DiseaseOverviewProps {
  disease: Disease;
}

export function DiseaseOverview({ disease }: DiseaseOverviewProps) {
  const renderPillList = (items: string[], maxVisible = 10, mono = false, clickable = false) => {
    if (items.length === 0) return null;
    const visibleItems = items.slice(0, maxVisible);
    const hasOverflow = items.length > maxVisible;
    return (
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item, index) =>
          clickable ? (
            <ClickableEntityId key={`${item}-${index}`} id={item} mono={mono} />
          ) : (
            <span
              key={`${item}-${index}`}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700",
                mono && "font-mono"
              )}
            >
              {item}
            </span>
          )
        )}
        {hasOverflow && (
          <span className="text-xs text-slate-400">+{items.length - maxVisible} more</span>
        )}
      </div>
    );
  };

  const renderPillListWithDetails = (items: string[], maxVisible = 10, mono = false, clickable = false) => {
    if (items.length <= maxVisible) {
      return renderPillList(items, maxVisible, mono, clickable);
    }

    return (
      <div className="space-y-2">
        {renderPillList(items, maxVisible, mono, clickable)}
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer select-none hover:text-slate-700">
            Show all {items.length}
          </summary>
          <div className="mt-2 max-h-44 overflow-y-auto pr-1">
            {renderPillList(items, items.length, mono, clickable)}
          </div>
        </details>
      </div>
    );
  };

  const hasIdentifiers = Boolean(disease.source || disease.code || disease.dbxrefs?.length);
  const hasOntology = Boolean(
    disease.parents?.length ||
    disease.ancestors?.length ||
    disease.children?.length ||
    disease.descendants?.length ||
    disease.therapeutic_areas?.length
  );
  const hasSynonyms = Boolean(
    disease.synonyms?.hasExactSynonym?.length ||
    disease.synonyms?.hasBroadSynonym?.length ||
    disease.synonyms?.hasNarrowSynonym?.length ||
    disease.synonyms?.hasRelatedSynonym?.length
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      {disease.description && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed">
            {disease.description}
          </CardContent>
        </Card>
      )}

      {/* Primary Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Identifiers */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Identifiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasIdentifiers ? (
              <dl className="space-y-3">
                {disease.source && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Source
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {disease.source}
                    </dd>
                  </div>
                )}

                {disease.code && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Code
                    </dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                      {disease.code}
                    </dd>
                  </div>
                )}

                {disease.dbxrefs && disease.dbxrefs.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Cross References
                    </dt>
                    <dd>{renderPillListWithDetails(disease.dbxrefs, 6, true, true)}</dd>
                  </div>
                )}

                {disease.epidemiology?.orphanet_code && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Orphanet Code
                    </dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                      {disease.epidemiology.orphanet_code}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No identifiers available.</p>
            )}
          </CardContent>
        </Card>

        {/* Ontology */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Ontology
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasOntology ? (
              <dl className="space-y-4">
                {disease.therapeutic_areas && disease.therapeutic_areas.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Therapeutic Areas
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {disease.therapeutic_areas.length.toLocaleString()}
                    </dd>
                    <div className="mt-2">
                      {renderPillListWithDetails(disease.therapeutic_areas, 6, true, true)}
                    </div>
                  </div>
                )}

                {disease.parents && disease.parents.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Parents
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {disease.parents.length.toLocaleString()}
                    </dd>
                    <div className="mt-2">
                      {renderPillListWithDetails(disease.parents, 6, true, true)}
                    </div>
                  </div>
                )}

                {disease.children && disease.children.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Children
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {disease.children.length.toLocaleString()}
                    </dd>
                    <div className="mt-2">
                      {renderPillListWithDetails(disease.children, 6, true, true)}
                    </div>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No ontology information available.</p>
            )}
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {disease.epidemiology?.disorder_type && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Disorder Type
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">
                    {disease.epidemiology.disorder_type}
                  </dd>
                </div>
              )}

              {disease.isTherapeuticArea !== undefined && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Therapeutic Area
                  </dt>
                  <dd className="text-sm font-medium mt-0.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                      disease.isTherapeuticArea
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {disease.isTherapeuticArea ? "Yes" : "No"}
                    </span>
                  </dd>
                </div>
              )}

              {disease.leaf !== undefined && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Leaf Node
                  </dt>
                  <dd className="text-sm font-medium mt-0.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                      disease.leaf
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {disease.leaf ? "Yes" : "No"}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Synonyms */}
      {hasSynonyms && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Synonyms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disease.synonyms?.hasExactSynonym && disease.synonyms.hasExactSynonym.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Exact Synonyms
                  </dt>
                  <dd>{renderPillListWithDetails(disease.synonyms.hasExactSynonym, 12)}</dd>
                </div>
              )}

              {disease.synonyms?.hasBroadSynonym && disease.synonyms.hasBroadSynonym.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Broad Synonyms
                  </dt>
                  <dd>{renderPillListWithDetails(disease.synonyms.hasBroadSynonym, 12)}</dd>
                </div>
              )}

              {disease.synonyms?.hasNarrowSynonym && disease.synonyms.hasNarrowSynonym.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Narrow Synonyms
                  </dt>
                  <dd>{renderPillListWithDetails(disease.synonyms.hasNarrowSynonym, 12)}</dd>
                </div>
              )}

              {disease.synonyms?.hasRelatedSynonym && disease.synonyms.hasRelatedSynonym.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Related Synonyms
                  </dt>
                  <dd>{renderPillListWithDetails(disease.synonyms.hasRelatedSynonym, 12)}</dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Epidemiology */}
      {disease.epidemiology?.prevalence && disease.epidemiology.prevalence.length > 0 && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Epidemiology
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {disease.epidemiology.prevalence.map((prev, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    {prev.geographic && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Geographic
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.geographic}</dd>
                      </div>
                    )}

                    {prev.prevalence_class && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Prevalence Class
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.prevalence_class}</dd>
                      </div>
                    )}

                    {prev.prevalence_type && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Type
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.prevalence_type}</dd>
                      </div>
                    )}

                    {prev.value !== undefined && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Value
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.value}</dd>
                      </div>
                    )}

                    {prev.prevalence_qualification && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Qualification
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.prevalence_qualification}</dd>
                      </div>
                    )}

                    {prev.source && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Source
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.source}</dd>
                      </div>
                    )}

                    {prev.validation_status && (
                      <div>
                        <dt className="font-semibold text-slate-500 uppercase tracking-wide">
                          Validation
                        </dt>
                        <dd className="text-slate-900 mt-0.5">{prev.validation_status}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ontology Sources */}
      {disease.ontology?.sources && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Ontology Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {disease.ontology.sources.name && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Name
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">
                    {disease.ontology.sources.name}
                  </dd>
                </div>
              )}

              {disease.ontology.sources.url && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    URL
                  </dt>
                  <dd className="text-sm mt-0.5">
                    <a
                      href={disease.ontology.sources.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {disease.ontology.sources.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Obsolete Terms */}
      {((disease.obsolete_terms && disease.obsolete_terms.length > 0) ||
        (disease.obsolete_xrefs && disease.obsolete_xrefs.length > 0)) && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Obsolete Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disease.obsolete_terms && disease.obsolete_terms.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Obsolete Terms
                  </dt>
                  <dd>{renderPillListWithDetails(disease.obsolete_terms, 10)}</dd>
                </div>
              )}

              {disease.obsolete_xrefs && disease.obsolete_xrefs.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Obsolete Cross References
                  </dt>
                  <dd>{renderPillListWithDetails(disease.obsolete_xrefs, 10, true, true)}</dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
