"use client";

import { Copy, ExternalLink } from "lucide-react";
import type { Drug } from "@/features/drug/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClickableEntityId } from "@/components/ui/clickable-entity-id";

interface DrugOverviewProps {
  drug: Drug;
}

export function DrugOverview({ drug }: DrugOverviewProps) {
  // Debug: Log drug data to verify what's being received
  console.log('DrugOverview - drug data:', {
    chembl_id: drug.chembl_id,
    name: drug.name,
    trade_names: drug.trade_names?.length,
    synonyms: drug.synonyms?.length,
    canonical_smiles: drug.canonical_smiles ? 'present' : 'missing',
    inchi_key: drug.inchi_key ? 'present' : 'missing',
    cross_references: drug.cross_references?.length,
    linked_diseases: drug.linked_diseases,
    linked_targets: drug.linked_targets,
    child_chembl_ids: drug.child_chembl_ids?.length,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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

  const getCrossRefHref = (source: string | undefined, id: string) => {
    if (!source) return null;
    const normalized = source.toLowerCase();
    if (normalized === "dailymed") {
      return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(id)}`;
    }
    return null;
  };

  const linkedDiseaseIds = drug.linked_diseases?.rows ?? [];
  const linkedDiseaseCount = drug.linked_diseases?.count ?? linkedDiseaseIds.length;
  const linkedTargetIds = drug.linked_targets?.rows ?? [];
  const linkedTargetCount = drug.linked_targets?.count ?? linkedTargetIds.length;
  const hasIdentifiers = Boolean(drug.source || drug.parent_id);
  const withdrawnStatus =
    drug.is_withdrawn === true ? "Yes" : drug.is_withdrawn === false ? "No" : "Unknown";
  const withdrawnClasses =
    drug.is_withdrawn === true
      ? "bg-red-100 text-red-700"
      : drug.is_withdrawn === false
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-500";
  const blackBoxStatus =
    drug.has_black_box_warning === true
      ? "Yes"
      : drug.has_black_box_warning === false
        ? "No"
        : "Unknown";
  const blackBoxClasses =
    drug.has_black_box_warning === true
      ? "bg-orange-100 text-orange-700"
      : drug.has_black_box_warning === false
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-500";

  return (
    <div className="space-y-6">
      {/* Summary */}
      {drug.description && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed">
            {drug.description}
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
                {drug.source && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Source
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {drug.source}
                    </dd>
                  </div>
                )}

                {drug.parent_id && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Parent molecule
                    </dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                      {drug.parent_id}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No identifiers available.</p>
            )}
          </CardContent>
        </Card>

        {/* Safety */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Withdrawn
                </dt>
                <dd className="text-sm font-medium mt-0.5">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                    withdrawnClasses
                  )}>
                    {withdrawnStatus}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Black box warning
                </dt>
                <dd className="text-sm font-medium mt-0.5">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                    blackBoxClasses
                  )}>
                    {blackBoxStatus}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Connections */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Linked diseases
                </dt>
                <dd className="text-sm font-medium text-slate-900 mt-0.5">
                  {linkedDiseaseCount.toLocaleString()}
                </dd>
                {linkedDiseaseIds.length > 0 ? (
                  <div className="mt-2">
                  {renderPillListWithDetails(linkedDiseaseIds, 8, true, true)}
                </div>
              ) : (
                linkedDiseaseCount > 0 && (
                  <p className="text-xs text-slate-400 mt-1">IDs available soon</p>
                )
              )}
              {linkedDiseaseIds.length > 0 && linkedDiseaseCount > linkedDiseaseIds.length && (
                <p className="text-xs text-slate-400 mt-1">
                  Showing {linkedDiseaseIds.length} of {linkedDiseaseCount}
                </p>
              )}
            </div>

              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Linked targets
                </dt>
                <dd className="text-sm font-medium text-slate-900 mt-0.5">
                  {linkedTargetCount.toLocaleString()}
                </dd>
                {linkedTargetIds.length > 0 ? (
                  <div className="mt-2">
                  {renderPillListWithDetails(linkedTargetIds, 8, true, true)}
                </div>
              ) : (
                linkedTargetCount > 0 && (
                  <p className="text-xs text-slate-400 mt-1">IDs available soon</p>
                )
              )}
              {linkedTargetIds.length > 0 && linkedTargetCount > linkedTargetIds.length && (
                <p className="text-xs text-slate-400 mt-1">
                  Showing {linkedTargetIds.length} of {linkedTargetCount}
                </p>
              )}
            </div>

              {drug.child_chembl_ids && drug.child_chembl_ids.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Child molecules
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">
                    {drug.child_chembl_ids.length.toLocaleString()}
                  </dd>
                  <div className="mt-2">
                    {renderPillListWithDetails(drug.child_chembl_ids, 6, true, true)}
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Names & Synonyms */}
      {((drug.trade_names && drug.trade_names.length > 0) || (drug.synonyms && drug.synonyms.length > 0)) && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Names & Synonyms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {drug.trade_names && drug.trade_names.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Trade names
                  </dt>
                  <dd>{renderPillListWithDetails(drug.trade_names, 12)}</dd>
                </div>
              )}

              {drug.synonyms && drug.synonyms.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Synonyms
                  </dt>
                  <dd>{renderPillListWithDetails(drug.synonyms, 14)}</dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chemistry */}
      {(drug.canonical_smiles || drug.inchi_key) && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Chemistry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {drug.canonical_smiles && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      SMILES
                    </dt>
                    <button
                      onClick={() => copyToClipboard(drug.canonical_smiles!)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <dd className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-3 break-all">
                    {drug.canonical_smiles}
                  </dd>
                </div>
              )}

              {drug.inchi_key && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      InChIKey
                    </dt>
                    <button
                      onClick={() => copyToClipboard(drug.inchi_key!)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <dd className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-3 break-all">
                    {drug.inchi_key}
                  </dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross References */}
      {drug.cross_references && drug.cross_references.length > 0 && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Cross References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drug.cross_references.map((ref, idx) => (
                <div key={idx}>
                  {ref.source && (
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      {ref.source}
                    </dt>
                  )}
                  <dd className="space-y-1.5">
                    {ref.ids && ref.ids.map((id, idIdx) => {
                      const href = getCrossRefHref(ref.source, id);
                      if (!href) {
                        return (
                          <span key={idIdx} className="text-sm font-mono text-slate-700">
                            {id}
                          </span>
                        );
                      }

                      return (
                        <a
                          key={idIdx}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-mono text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    })}
                  </dd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
