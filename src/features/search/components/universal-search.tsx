"use client";

import { useState, useCallback, type FormEvent } from "react";
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

  const handleGenomeChange = useCallback((value: GenomeBuild) => {
    setGenome(value);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!query.trim()) return;

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
    [query, results, genome]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: TypeaheadSuggestion) => {
      const url = suggestion.url || getEntityUrl(suggestion.type, suggestion.id, { genome });

      if (url && hasEntityPage(suggestion.type)) {
        router.push(url);
        clear();
        setIsDropdownOpen(false);
      }
    },
    [genome, router, clear]
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
                      {anchorEntity && (
                        <div className="border-b border-slate-200 p-5 bg-slate-50">
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                            Top Result
                          </div>
                          <div className="flex-1">
                            <div className={cn("font-semibold text-slate-900 mb-1", ENTITY_CONFIG[anchorEntity.type].textColor)}>
                              {anchorEntity.name}
                            </div>
                            {anchorEntity.description && (
                              <div className="text-sm text-slate-600">
                                {anchorEntity.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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

                                return (
                                  <ComboboxOption
                                    key={item.id}
                                    className="cursor-pointer transition-all duration-150 data-focus:bg-slate-50 border-b md:border-r border-slate-100 md:last:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0 last:border-b-0"
                                    value={item}
                                  >
                                    <div className="p-4 h-full">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <span className={cn("font-semibold text-sm", config.textColor)}>
                                              {item.highlight ? (
                                                <span
                                                  dangerouslySetInnerHTML={{
                                                    __html: item.highlight.replace(/<em>/g, '<em class="not-italic font-bold">'),
                                                  }}
                                                />
                                              ) : (
                                                item.name
                                              )}
                                            </span>
                                            {!hasUrl && (
                                              <span className="text-[10px] text-slate-400 italic">(soon)</span>
                                            )}
                                          </div>

                                          {item.description && (
                                            <div className="text-xs text-slate-600 line-clamp-2 mb-2">
                                              {item.description}
                                            </div>
                                          )}

                                          {/* Compact Stats */}
                                          {(item.links?.gene_count || item.links?.variant_count || item.links?.disease_count) && (
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                              {item.links?.gene_count !== undefined && item.links.gene_count > 0 && (
                                                <span>{item.links.gene_count.toLocaleString()} genes</span>
                                              )}
                                              {item.links?.variant_count !== undefined && item.links.variant_count > 0 && (
                                                <span>{item.links.variant_count.toLocaleString()} vars</span>
                                              )}
                                              {item.links?.disease_count !== undefined && item.links.disease_count > 0 && (
                                                <span>{item.links.disease_count.toLocaleString()} diseases</span>
                                              )}
                                            </div>
                                          )}

                                          {/* Preview */}
                                          {item.preview?.genes && item.preview.genes.length > 0 && (
                                            <div className="mt-1.5 text-[10px] text-slate-400 truncate">
                                              → {item.preview.genes.slice(0, 3).join(", ")}
                                            </div>
                                          )}
                                        </div>

                                        {hasUrl && (
                                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                                        )}
                                      </div>
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
      <div className="mt-6 flex justify-center gap-8 text-sm font-medium text-slate-400 uppercase tracking-widest opacity-80">
        {["BRCA1", "rs7412", "Alzheimer"].map((search) => (
          <button
            type="button"
            key={search}
            className="hover:text-purple-600 cursor-pointer transition-colors"
            onClick={() => setQuery(search)}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
