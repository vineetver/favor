"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { useTypeahead } from "../hooks/use-typeahead";
import { getEntityUrl, hasEntityPage } from "../utils/entity-routes";
import { navigateToQuery, isRoutableQuery, parseQuery, preloadVariantDebounced, getPopulateIdentifier } from "../utils";
import type { TypeaheadSuggestion, EntityType } from "../types/api";
import { cn } from "@/lib/utils";

type GenomeBuild = "hg38" | "hg19";

const ENTITY_CONFIG: Record<
  EntityType,
  {
    label: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  genes: {
    label: "GENES",
    textColor: "text-purple-700",
    bgColor: "bg-purple-600",
    borderColor: "border-purple-200"
  },
  variants: {
    label: "VARIANTS",
    textColor: "text-blue-700",
    bgColor: "bg-blue-600",
    borderColor: "border-blue-200"
  },
  diseases: {
    label: "DISEASES",
    textColor: "text-red-700",
    bgColor: "bg-red-600",
    borderColor: "border-red-200"
  },
  drugs: {
    label: "DRUGS",
    textColor: "text-green-700",
    bgColor: "bg-green-600",
    borderColor: "border-green-200"
  },
  pathways: {
    label: "PATHWAYS",
    textColor: "text-orange-700",
    bgColor: "bg-orange-600",
    borderColor: "border-orange-200"
  },
};

export function UniversalSearch() {
  const router = useRouter();
  const [genome, setGenome] = useState<GenomeBuild>("hg38");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<TypeaheadSuggestion | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const { query, setQuery, results, isLoading, clear } = useTypeahead({
    minLength: 2,
    debounce: 300,
    limit: 3,
    includeLinks: true,
    includePreview: true,
  });

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
  }, [setQuery]);

  // Clear selected suggestion when user manually edits query
  useEffect(() => {
    if (selectedSuggestion) {
      const selectedIdentifier = getPopulateIdentifier(selectedSuggestion);
      if (query !== selectedIdentifier) {
        setSelectedSuggestion(null);
      }
    }
  }, [query, selectedSuggestion]);

  // Preload variant data when user types a complete VCF
  useEffect(() => {
    const parsed = parseQuery(query);

    // Only preload if it's a valid, complete variant query
    if (parsed.isValid && (parsed.type === 'variant_vcf' || parsed.type === 'variant_rsid')) {
      preloadVariantDebounced(query, 500).catch(() => {
        // Silently fail - preloading is optional optimization
      });
    }
  }, [query]);

  const handleGenomeChange = useCallback((value: GenomeBuild) => {
    setGenome(value);
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: TypeaheadSuggestion) => {
      // Populate search bar with identifier instead of navigating
      const identifier = getPopulateIdentifier(suggestion);
      setQuery(identifier);
      setSelectedSuggestion(suggestion);
      // Keep dropdown open with results visible
    },
    [setQuery]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!query.trim()) return;

      // 1. If user has selected a suggestion, navigate to it
      if (selectedSuggestion) {
        const url = selectedSuggestion.url || getEntityUrl(selectedSuggestion.type, selectedSuggestion.id, { genome });
        if (url && hasEntityPage(selectedSuggestion.type)) {
          router.push(url);
          clear();
          setIsDropdownOpen(false);
          setSelectedSuggestion(null);
        }
        return;
      }

      // 2. Try direct routing for complete VCF/rsID queries
      if (isRoutableQuery(query)) {
        const success = await navigateToQuery(query, genome, router);
        if (success) {
          clear();
          setIsDropdownOpen(false);
          return;
        }
      }

      // 3. Fall back to first typeahead suggestion (populate, don't navigate)
      if (results && results.total > 0) {
        const entityTypes: EntityType[] = ["genes", "variants", "diseases", "drugs", "pathways"];

        for (const type of entityTypes) {
          const entities = results.suggestions[type];
          if (entities && entities.length > 0) {
            handleSelectSuggestion(entities[0]);
            return;
          }
        }
      }
    },
    [query, results, genome, router, clear, selectedSuggestion, handleSelectSuggestion]
  );

  const handleFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => setIsDropdownOpen(false), 200);
  };

  // Smart heuristics to detect query intent
  const getQueryIntent = (q: string): "variant" | "gene" | "general" => {
    const trimmed = q.trim();

    // Detect rsID patterns (complete or partial)
    if (/^rs\d/i.test(trimmed)) {
      return "variant";
    }

    // Detect VCF-like patterns (chr-pos-ref-alt or partial)
    // Matches: "19-440908822-C", "19-440908822", "chr1-1000-A-T", etc.
    if (/^(chr)?(\d{1,2}|X|Y|MT?)[-:]\d+/i.test(trimmed)) {
      return "variant";
    }

    // Detect genomic regions
    if (/^(chr)?(\d{1,2}|X|Y|MT?):\d+-\d+$/i.test(trimmed)) {
      return "variant";
    }

    // Gene-like patterns (all caps, short)
    if (/^[A-Z][A-Z0-9-]{1,10}$/.test(trimmed)) {
      return "gene";
    }

    return "general";
  };

  const queryIntent = getQueryIntent(query);

  // Get primary anchor based on intent
  let anchorEntity: TypeaheadSuggestion | null = null;
  if (results && results.total > 0) {
    let entityTypes: EntityType[];

    if (queryIntent === "variant") {
      entityTypes = ["variants", "genes", "diseases", "drugs", "pathways"];
    } else if (queryIntent === "gene") {
      entityTypes = ["genes", "variants", "diseases", "drugs", "pathways"];
    } else {
      // General search - prioritize diseases/drugs/pathways for text queries
      entityTypes = ["diseases", "genes", "drugs", "pathways", "variants"];
    }

    for (const type of entityTypes) {
      const entities = results.suggestions[type];
      if (entities && entities.length > 0) {
        anchorEntity = entities[0];
        break;
      }
    }
  }

  // Group remaining suggestions by entity type
  const groupedSuggestions: Array<{ type: EntityType; items: TypeaheadSuggestion[] }> = [];

  if (results && results.total > 0) {
    const entityTypes: EntityType[] = ["genes", "variants", "diseases", "drugs", "pathways"];

    entityTypes.forEach((type) => {
      const items = results.suggestions[type];
      if (items && items.length > 0) {
        groupedSuggestions.push({ type, items });
      }
    });
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-purple-200 to-indigo-200 rounded-[28px] blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>

        <div className="relative">
          <Combobox value={null} onChange={(val) => val && handleSelectSuggestion(val)}>
            <div className="relative flex flex-col sm:flex-row items-center bg-white p-2.5 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/80 ring-1 ring-slate-100">
              <div className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 m-1 sm:mr-4 shrink-0 relative w-full sm:w-[144px]">
                <div
                  className={cn(
                    "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out",
                    genome === "hg38" ? "left-1" : "right-1"
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg38")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    genome === "hg38" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  HG38
                </button>
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg19")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    genome === "hg19" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  HG19
                </button>
              </div>

              <div className="flex-1 w-full relative">
                <ComboboxInput
                  className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg h-14 px-2 font-medium tracking-tight focus:outline-none"
                  displayValue={() => query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Search genes, variants, diseases, drugs, pathways..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="submit"
                className="hidden sm:flex bg-slate-900 hover:bg-slate-800 text-white w-12 h-12 rounded-[18px] transition-all duration-200 items-center justify-center shadow-lg shadow-slate-900/10 mr-1"
              >
                {isLoading && isDropdownOpen ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Search className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Dropdown with fixed positioning to prevent overflow */}
            {isDropdownOpen && (
              <ComboboxOptions
                static
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-2xl focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ maxHeight: "calc(100vh - 400px)" }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                  {isLoading ? (
                    <div className="py-8 px-6 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <div className="text-sm">Searching...</div>
                    </div>
                  ) : groupedSuggestions.length === 0 && query.trim() !== "" ? (
                    <div className="py-8 px-6 text-center text-slate-400">
                      <div className="text-sm">No results found</div>
                    </div>
                  ) : (
                    <>
                      {/* Anchor Card */}
                      {anchorEntity && (() => {
                        const config = ENTITY_CONFIG[anchorEntity.type];
                        const linkCounts = [
                          { label: "genes", count: anchorEntity.links?.gene_count },
                          { label: "variants", count: anchorEntity.links?.variant_count },
                          { label: "diseases", count: anchorEntity.links?.disease_count },
                          { label: "drugs", count: anchorEntity.links?.drug_count },
                          { label: "pathways", count: anchorEntity.links?.pathway_count },
                        ].filter(link => link.count && link.count > 0);

                        const previews = [];
                        if (anchorEntity.preview?.genes && anchorEntity.preview.genes.length > 0) {
                          previews.push({ label: "Genes", items: anchorEntity.preview.genes });
                        }
                        if (anchorEntity.preview?.diseases && anchorEntity.preview.diseases.length > 0) {
                          previews.push({ label: "Diseases", items: anchorEntity.preview.diseases });
                        }
                        if (anchorEntity.preview?.drugs && anchorEntity.preview.drugs.length > 0) {
                          previews.push({ label: "Drugs", items: anchorEntity.preview.drugs });
                        }
                        if (anchorEntity.preview?.pathways && anchorEntity.preview.pathways.length > 0) {
                          previews.push({ label: "Pathways", items: anchorEntity.preview.pathways });
                        }

                        return (
                          <ComboboxOption
                            value={anchorEntity}
                            className="cursor-pointer hover:bg-slate-50 transition-colors duration-150"
                          >
                            <div className="border-b border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-white">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                                Best Match
                              </div>
                              <div className="space-y-2.5">
                              {/* Name + ID */}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={cn("font-semibold text-base leading-tight", config.textColor)}>
                                    {anchorEntity.name}
                                  </h3>
                                  {anchorEntity.match_type === 'prefix' && (
                                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Exact match" />
                                  )}
                                </div>
                                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                  {anchorEntity.id}
                                </div>
                              </div>

                              {/* Description */}
                              {anchorEntity.description && (
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {anchorEntity.description}
                                </p>
                              )}

                              {/* Link Counts */}
                              {linkCounts.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {linkCounts.map((link) => (
                                    <span
                                      key={link.label}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-600 shadow-sm"
                                    >
                                      <span className="font-bold text-slate-900">
                                        {link.count!.toLocaleString()}
                                      </span>
                                      {link.label}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Previews */}
                              {previews.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  {previews.slice(0, 3).map((preview) => (
                                    <div key={preview.label} className="text-[11px]">
                                      <span className="font-bold text-slate-500 uppercase tracking-wide">
                                        {preview.label}:
                                      </span>{" "}
                                      <span className="text-slate-600">
                                        {preview.items.slice(0, 5).join(", ")}
                                        {preview.items.length > 5 && ` +${preview.items.length - 5} more`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          </ComboboxOption>
                        );
                      })()}

                      {/* Grouped Results */}
                      {groupedSuggestions.map((group) => {
                        const config = ENTITY_CONFIG[group.type];

                        return (
                          <div key={group.type} className="border-b border-slate-100 last:border-0">
                            {/* Section Header - Colored */}
                            <div className={cn(
                              "sticky top-0 z-10 px-4 py-2.5 flex items-center gap-2",
                              config.bgColor
                            )}>
                              <span className="text-xs font-bold uppercase tracking-widest text-white">
                                {config.label}
                              </span>
                              <span className="text-xs text-white/70">({group.items.length})</span>
                            </div>

                            {/* Entity Cards - Two Column Grid on Desktop */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                              {group.items.map((item) => {
                                const hasUrl = hasEntityPage(item.type);

                                // Count how many link types have data
                                const linkCounts = [
                                  { label: "genes", count: item.links?.gene_count },
                                  { label: "variants", count: item.links?.variant_count },
                                  { label: "diseases", count: item.links?.disease_count },
                                  { label: "drugs", count: item.links?.drug_count },
                                  { label: "pathways", count: item.links?.pathway_count },
                                ].filter(link => link.count && link.count > 0);

                                // Get relevant previews based on entity type
                                const previews = [];
                                if (item.preview?.genes && item.preview.genes.length > 0) {
                                  previews.push({ label: "Genes", items: item.preview.genes });
                                }
                                if (item.preview?.diseases && item.preview.diseases.length > 0) {
                                  previews.push({ label: "Diseases", items: item.preview.diseases });
                                }
                                if (item.preview?.drugs && item.preview.drugs.length > 0) {
                                  previews.push({ label: "Drugs", items: item.preview.drugs });
                                }
                                if (item.preview?.pathways && item.preview.pathways.length > 0) {
                                  previews.push({ label: "Pathways", items: item.preview.pathways });
                                }
                                if (item.preview?.variants && item.preview.variants.length > 0) {
                                  previews.push({ label: "Variants", items: item.preview.variants });
                                }

                                return (
                                  <ComboboxOption
                                    key={item.id}
                                    className="cursor-pointer transition-all duration-150 data-focus:bg-slate-50 border-b md:border-r border-slate-100 md:odd:border-r md:even:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0 last:border-b-0 [&:nth-last-child(1)]:border-b-0"
                                    value={item}
                                  >
                                    <div className="p-3.5 h-full">
                                      {/* Header: Name + Match Quality */}
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={cn("font-semibold text-sm leading-tight", config.textColor)}>
                                              {item.name}
                                            </span>
                                            {/* Match Quality Indicator */}
                                            {item.match_type === 'prefix' && (
                                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" title="Exact match" />
                                            )}
                                            {item.match_type === 'substring' && (
                                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" title="Substring match" />
                                            )}
                                            {item.match_type === 'fuzzy' && (
                                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" title="Fuzzy match" />
                                            )}
                                          </div>
                                          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                            {item.id}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {!hasUrl && (
                                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide px-1.5 py-0.5 bg-slate-100 rounded">Soon</span>
                                          )}
                                          {hasUrl && (
                                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Description */}
                                      {item.description && (
                                        <p className="text-xs text-slate-600 line-clamp-2 mb-2.5 leading-relaxed">
                                          {item.description}
                                        </p>
                                      )}

                                      {/* Link Counts - Badge Pills */}
                                      {linkCounts.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {linkCounts.map((link) => (
                                            <span
                                              key={link.label}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                                            >
                                              <span className="font-semibold text-slate-900">
                                                {link.count!.toLocaleString()}
                                              </span>
                                              {link.label}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {/* Previews */}
                                      {previews.length > 0 && (
                                        <div className="space-y-1">
                                          {previews.slice(0, 2).map((preview) => (
                                            <div key={preview.label} className="text-[10px]">
                                              <span className="font-semibold text-slate-500 uppercase tracking-wide">
                                                {preview.label}:
                                              </span>{" "}
                                              <span className="text-slate-600">
                                                {preview.items.slice(0, 4).join(", ")}
                                                {preview.items.length > 4 && ` +${preview.items.length - 4}`}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </ComboboxOption>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </ComboboxOptions>
            )}
          </Combobox>
        </div>
      </form>

      {/* Helper Text */}
      <div className="mt-6 flex justify-center gap-8 text-sm font-medium text-slate-400 uppercase tracking-widest opacity-80 flex-wrap">
        {["BRCA1", "rs7412", "Alzheimer", "Imatinib"].map((search) => (
          <button
            type="button"
            key={search}
            className="hover:text-purple-600 cursor-pointer transition-colors"
            onClick={() => {
              setQuery(search);
              setIsDropdownOpen(true);
            }}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
