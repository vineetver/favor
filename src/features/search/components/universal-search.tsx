"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { cn } from "@infra/utils";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePivotExpansion } from "../hooks/use-pivot-expansion";
import { useTypeahead } from "../hooks/use-typeahead";
import type { EntityType, TypeaheadSuggestion } from "../types/api";
import {
  getPopulateIdentifier,
  isRoutableQuery,
  navigateToQuery,
  parseQuery,
  preloadVariantDebounced,
} from "../utils";
import { getEntityUrl, hasEntityPage } from "../utils/entity-routes";

type GenomeBuild = "hg38" | "hg19";

// State machine for search modes
// typing: user is typing, show typeahead suggestions
// selected: user has selected an anchor, show pivot results
type SearchMode = "idle" | "typing" | "selected";

interface SearchState {
  mode: SearchMode;
  query: string;
  anchors: TypeaheadSuggestion[];
}

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
    borderColor: "border-purple-200",
  },
  variants: {
    label: "VARIANTS",
    textColor: "text-blue-700",
    bgColor: "bg-blue-600",
    borderColor: "border-blue-200",
  },
  diseases: {
    label: "DISEASES",
    textColor: "text-red-700",
    bgColor: "bg-red-600",
    borderColor: "border-red-200",
  },
  drugs: {
    label: "DRUGS",
    textColor: "text-green-700",
    bgColor: "bg-green-600",
    borderColor: "border-green-200",
  },
  pathways: {
    label: "PATHWAYS",
    textColor: "text-orange-700",
    bgColor: "bg-orange-600",
    borderColor: "border-orange-200",
  },
  phenotypes: {
    label: "PHENOTYPES",
    textColor: "text-pink-700",
    bgColor: "bg-pink-600",
    borderColor: "border-pink-200",
  },
  studies: {
    label: "STUDIES",
    textColor: "text-cyan-700",
    bgColor: "bg-cyan-600",
    borderColor: "border-cyan-200",
  },
  traits: {
    label: "TRAITS",
    textColor: "text-amber-700",
    bgColor: "bg-amber-600",
    borderColor: "border-amber-200",
  },
};

// AnchorChip Component - displays selected anchor as a chip inside the input
// Styled to match HG38/HG19 toggle height and aesthetic
function AnchorChip({
  anchor,
  onRemove,
}: {
  anchor: TypeaheadSuggestion;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 bg-slate-100 rounded-xl pl-4 pr-2 py-2">
      <span className="text-sm font-semibold text-slate-900">{anchor.display_name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </span>
  );
}

export function UniversalSearch() {
  const router = useRouter();
  const [genome, setGenome] = useState<GenomeBuild>("hg38");
  const [searchState, setSearchState] = useState<SearchState>({
    mode: "idle",
    query: "",
    anchors: [],
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Derive query from state
  const query = searchState.query;
  const deferredQuery = useDeferredValue(query);

  // Typeahead hook - only active in typing mode
  const {
    setQuery: setTypeaheadQuery,
    results: typeaheadResults,
    isLoading: isTypeaheadLoading,
    clear: clearTypeahead,
    refetch: refetchTypeahead,
  } = useTypeahead({
    minLength: 2,
    debounce: 300,
    limit: 5, // Request 5 so after best match deduplication, we still show 4
    includeLinks: true,
    includeLinked: true,
  });

  // Pivot expansion hook - only active in selected mode
  const {
    setAnchor: setPivotAnchor,
    results: pivotResults,
    isLoading: isPivotLoading,
    error: pivotError,
    clear: clearPivot,
    expandedTypes,
    expandingType,
    fetchMoreForType,
  } = usePivotExpansion({
    limit: 5,
    expandedLimit: 50,
  });

  // Sync typeahead query only when in typing mode
  useEffect(() => {
    if (searchState.mode === "typing") {
      setTypeaheadQuery(deferredQuery);
    }
  }, [deferredQuery, searchState.mode, setTypeaheadQuery]);

  // Sync pivot anchor when in selected mode (use last anchor for pivot queries)
  useEffect(() => {
    const lastAnchor = searchState.anchors[searchState.anchors.length - 1];
    if (searchState.mode === "selected" && lastAnchor) {
      setPivotAnchor({
        id: lastAnchor.id,
        type: lastAnchor.entity_type,
      });
    } else if (searchState.mode !== "selected") {
      clearPivot();
    }
  }, [searchState.mode, searchState.anchors, setPivotAnchor, clearPivot]);

  const handleInputChange = useCallback((value: string) => {
    setSearchState((prev) => {
      if (value.trim().length === 0 && prev.anchors.length === 0) {
        return { mode: "idle", query: "", anchors: [] };
      } else if (value.trim().length === 0 && prev.anchors.length > 0) {
        // Keep anchors, stay in selected mode with empty query
        return { mode: "selected", query: "", anchors: prev.anchors };
      } else if (prev.anchors.length > 0) {
        // Has anchors - stay in selected mode while typing to filter
        return { mode: "selected", query: value, anchors: prev.anchors };
      } else {
        // No anchors - typing mode
        return { mode: "typing", query: value, anchors: [] };
      }
    });

    if (value.trim().length >= 2 || searchState.anchors.length > 0) {
      setIsDropdownOpen(true);
    } else if (value.trim().length === 0 && searchState.anchors.length === 0) {
      setIsDropdownOpen(false);
    }
    setHighlightedIndex(-1);
  }, [searchState.anchors.length]);

  // Preload variant data when user types a complete VCF (only in typing mode)
  useEffect(() => {
    if (searchState.mode !== "typing") return;

    const parsed = parseQuery(query);
    if (
      parsed.isValid &&
      (parsed.type === "variant_vcf" || parsed.type === "variant_rsid")
    ) {
      preloadVariantDebounced(query, 500).catch(() => {
        // Silently fail - preloading is optional optimization
      });
    }
  }, [query, searchState.mode]);

  const handleGenomeChange = useCallback((value: GenomeBuild) => {
    setGenome(value);
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: TypeaheadSuggestion) => {
      startTransition(() => {
        setSearchState((prev) => ({
          mode: "selected",
          query: "",  // Clear query after selection
          anchors: [...prev.anchors, suggestion],
        }));
        setHighlightedIndex(-1);
        // Keep dropdown open to show pivot results
      });
    },
    [],
  );

  const handleRemoveAnchorAt = useCallback((index: number) => {
    startTransition(() => {
      // Clear pivot results immediately to prevent stale data flash
      clearPivot();

      setSearchState((prev) => {
        const newAnchors = prev.anchors.slice(0, index);
        const newMode = newAnchors.length > 0
          ? "selected"
          : (prev.query.trim().length >= 2 ? "typing" : "idle");
        return {
          mode: newMode,
          query: prev.query,
          anchors: newAnchors,
        };
      });

      // Force re-fetch typeahead since query didn't change
      // (setTypeaheadQuery won't trigger fetch if query is same)
      refetchTypeahead();
    });
  }, [clearPivot, refetchTypeahead]);

  // Handle clicking a pivot result - can navigate or pivot-hop
  const handlePivotItemClick = useCallback(
    (item: TypeaheadSuggestion) => {
      if (hasEntityPage(item.entity_type)) {
        // Navigate to entity page
        const url = item.url || getEntityUrl(item.entity_type, item.id, { genome });
        router.push(url);
        clearTypeahead();
        clearPivot();
        setSearchState({ mode: "idle", query: "", anchors: [] });
        setIsDropdownOpen(false);
      } else {
        // Pivot-hop: add this as new anchor
        handleSelectSuggestion(item);
      }
    },
    [genome, router, clearTypeahead, clearPivot, handleSelectSuggestion],
  );

  // Navigate to last anchor entity page (used in selected mode)
  const navigateToAnchor = useCallback(async () => {
    const lastAnchor = searchState.anchors[searchState.anchors.length - 1];
    if (searchState.mode !== "selected" || !lastAnchor) return false;

    if (!hasEntityPage(lastAnchor.entity_type)) {
      // No entity page - stay in pivot view
      return false;
    }

    // For variants, try routing via rsID if available
    if (lastAnchor.entity_type === "variants") {
      // Check if display_name is an rsID
      const rsIdMatch = lastAnchor.display_name.match(/^rs\d+$/i);
      if (rsIdMatch) {
        const success = await navigateToQuery(lastAnchor.display_name, genome, router);
        if (success) {
          clearTypeahead();
          clearPivot();
          setSearchState({ mode: "idle", query: "", anchors: [] });
          setIsDropdownOpen(false);
          return true;
        }
      }
    }

    // Standard URL navigation using anchor.id (not display_name)
    const url = lastAnchor.url || getEntityUrl(lastAnchor.entity_type, lastAnchor.id, { genome });
    router.push(url);
    clearTypeahead();
    clearPivot();
    setSearchState({ mode: "idle", query: "", anchors: [] });
    setIsDropdownOpen(false);
    return true;
  }, [searchState, genome, router, clearTypeahead, clearPivot]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (searchState.mode === "idle") return;

      // Selected mode: Enter navigates to anchor entity page (if available)
      if (searchState.mode === "selected") {
        await navigateToAnchor();
        return;
      }

      // Typing mode: try direct routing for VCF/rsID first
      if (isRoutableQuery(query)) {
        const success = await navigateToQuery(query, genome, router);
        if (success) {
          clearTypeahead();
          setSearchState({ mode: "idle", query: "", anchors: [] });
          setIsDropdownOpen(false);
          return;
        }
      }

      // Fall back to selecting first typeahead suggestion (if any)
      // Note: If Combobox has a highlighted option, this won't be reached
      // because Combobox will fire onChange instead
      if (typeaheadResults && typeaheadResults.total_count > 0) {
        for (const group of typeaheadResults.groups) {
          if (group.suggestions.length > 0) {
            handleSelectSuggestion(group.suggestions[0]);
            return;
          }
        }
      }

      // No suggestions - do nothing (graceful handling of zero results)
    },
    [
      searchState,
      typeaheadResults,
      genome,
      router,
      clearTypeahead,
      handleSelectSuggestion,
      query,
      navigateToAnchor,
    ],
  );

  // Click-outside detection
  const isDropdownOpenRef = useRef(isDropdownOpen);
  isDropdownOpenRef.current = isDropdownOpen;

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isDropdownOpenRef.current
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isDropdownOpen]);

  const handleFocus = () => {
    if (query.trim().length >= 2 || searchState.anchors.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  // Build flat list of typeahead suggestions for keyboard navigation
  const flatTypeaheadSuggestions: TypeaheadSuggestion[] = [];
  if (searchState.mode === "typing" && typeaheadResults) {
    for (const group of typeaheadResults.groups) {
      flatTypeaheadSuggestions.push(...group.suggestions);
    }
  }

  // Build grouped suggestions for display (no reordering - trust backend)
  const groupedTypeaheadSuggestions: Array<{
    type: EntityType;
    items: TypeaheadSuggestion[];
  }> = [];

  // Best match is the first item from the first group (trust backend ordering)
  let bestMatch: TypeaheadSuggestion | null = null;

  if (typeaheadResults && typeaheadResults.total_count > 0) {
    for (const group of typeaheadResults.groups) {
      if (group.suggestions.length > 0) {
        // First suggestion of first group is best match
        if (!bestMatch) {
          bestMatch = group.suggestions[0];
        }

        // Filter out best match from its group to avoid duplication
        const filteredItems = bestMatch && group.entity_type === bestMatch.entity_type
          ? group.suggestions.filter(item => item.id !== bestMatch.id)
          : group.suggestions;

        // Limit to 4 items max for consistent display
        const limitedItems = filteredItems.slice(0, 4);

        // Only add group if it has items after filtering
        if (limitedItems.length > 0) {
          groupedTypeaheadSuggestions.push({
            type: group.entity_type,
            items: limitedItems,
          });
        }
      }
    }
  }

  // Build pivot groups for display (no reordering - trust backend)
  // Pivot API returns same format as typeahead: groups with suggestions
  const pivotGroups: Array<{
    type: EntityType;
    items: TypeaheadSuggestion[];
  }> = [];

  if (pivotResults && pivotResults.total_count > 0) {
    for (const group of pivotResults.groups) {
      if (group.suggestions.length > 0) {
        pivotGroups.push({
          type: group.entity_type,
          items: group.suggestions,
        });
      }
    }
  }

  const isLoading = searchState.mode === "typing" ? isTypeaheadLoading : isPivotLoading;

  return (
    <div className="w-full" ref={containerRef}>
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-purple-200 to-indigo-200 rounded-[28px] blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>

        <div className="relative">
          <Combobox
            value={null}
            onChange={(val) => val && handleSelectSuggestion(val)}
          >
            <div className="relative flex flex-col sm:flex-row items-center bg-white p-2.5 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/80 ring-1 ring-slate-100">
              <div className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 m-1 sm:mr-4 shrink-0 relative w-full sm:w-[144px]">
                <div
                  className={cn(
                    "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out",
                    genome === "hg38" ? "left-1" : "right-1",
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg38")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    genome === "hg38"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  HG38
                </button>
                <button
                  type="button"
                  onClick={() => handleGenomeChange("hg19")}
                  className={cn(
                    "relative z-10 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200",
                    genome === "hg19"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  HG19
                </button>
              </div>

              <div className="flex-1 w-full relative flex items-center gap-2 flex-wrap px-2 py-1.5 min-h-14">
                {/* Anchor chips */}
                {searchState.anchors.map((anchor, index) => (
                  <AnchorChip
                    key={anchor.id}
                    anchor={anchor}
                    onRemove={() => handleRemoveAnchorAt(index)}
                  />
                ))}

                {/* Text input */}
                <ComboboxInput
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg py-2 font-medium tracking-tight focus:outline-none"
                  displayValue={() => query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  onKeyDown={(e) => {
                    // Backspace on empty input removes last anchor
                    if (e.key === "Backspace" && query === "" && searchState.anchors.length > 0) {
                      e.preventDefault();
                      handleRemoveAnchorAt(searchState.anchors.length - 1);
                      return;
                    }

                    if (e.key === "Enter") {
                      // In selected mode: always handle navigation ourselves
                      if (searchState.mode === "selected") {
                        e.preventDefault();
                        handleSubmit(e as unknown as FormEvent);
                        return;
                      }

                      // In typing mode with routable query (VCF/rsID): handle direct routing
                      if (searchState.mode === "typing" && isRoutableQuery(query)) {
                        e.preventDefault();
                        handleSubmit(e as unknown as FormEvent);
                        return;
                      }

                      // In typing mode with no suggestions: do nothing
                      if (searchState.mode === "typing" && (!typeaheadResults || typeaheadResults.total_count === 0)) {
                        e.preventDefault();
                        return;
                      }

                      // Otherwise: let Combobox handle Enter (selects highlighted option)
                      // Combobox will fire onChange with the highlighted item
                    }
                  }}
                  placeholder={searchState.anchors.length > 0 ? "Continue searching..." : "Search genes, variants, diseases, drugs, pathways..."}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="submit"
                className="hidden sm:flex bg-primary hover:bg-primary/90 text-white w-12 h-12 rounded-[18px] transition-all duration-200 items-center justify-center shadow-lg shadow-slate-900/10 mr-1"
              >
                {(isLoading || isPending) && isDropdownOpen ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Search className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <ComboboxOptions
                static
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-2xl focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ maxHeight: "calc(100vh - 400px)" }}
              >
                {/* Loading bar */}
                {(isLoading || isPending) && (
                  <div className="h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
                )}

                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 400px)" }}
                >
                  {/* TYPING MODE: Show typeahead suggestions */}
                  {searchState.mode === "typing" && (
                    <>
                      {isTypeaheadLoading && groupedTypeaheadSuggestions.length === 0 ? (
                        <div className="py-8 px-6 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          <div className="text-sm">Searching...</div>
                        </div>
                      ) : groupedTypeaheadSuggestions.length === 0 && query.trim() !== "" ? (
                        <div className="py-8 px-6 text-center text-slate-400">
                          <div className="text-sm">No results found</div>
                        </div>
                      ) : (
                        <>
                          {/* Best Match Card */}
                          {bestMatch && (
                            <BestMatchCard
                              item={bestMatch}
                              onSelect={handleSelectSuggestion}
                            />
                          )}

                          {/* Grouped Results */}
                          {groupedTypeaheadSuggestions.map((group) => (
                            <TypeaheadGroupSection
                              key={group.type}
                              group={group}
                              onSelect={handleSelectSuggestion}
                            />
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* SELECTED MODE: Show pivot results (anchor chips are in input) */}
                  {searchState.mode === "selected" && searchState.anchors.length > 0 && (
                    <>
                      {/* Pivot Anchor Info Card */}
                      <PivotAnchorCard
                        anchor={searchState.anchors[searchState.anchors.length - 1]}
                        onLinkedClick={(name) => {
                          // Search for the clicked linked entity
                          setSearchState(prev => ({
                            ...prev,
                            mode: "typing",
                            query: name,
                          }));
                          setTypeaheadQuery(name);
                        }}
                      />

                      {/* Pivot Results Section */}
                      {isPivotLoading ? (
                        // Loading skeleton while pivot fetches
                        <div className="py-8 px-6 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          <div className="text-sm">Loading related entities...</div>
                        </div>
                      ) : pivotError ? (
                        // Error state - show message without collapsing
                        <div className="py-8 px-6 text-center text-red-400">
                          <div className="text-sm">Failed to load related entities</div>
                          <div className="text-xs mt-1 text-slate-400">
                            {pivotError.message}
                          </div>
                        </div>
                      ) : pivotGroups.length === 0 ? (
                        // No results
                        <div className="py-8 px-6 text-center text-slate-400">
                          <div className="text-sm">No related entities found</div>
                        </div>
                      ) : (
                        // Pivot context header + groups
                        <>
                          {/* Related to header */}
                          <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                            <span className="text-sm text-slate-500">
                              Related to{" "}
                              <span className={cn("font-semibold", ENTITY_CONFIG[searchState.anchors[searchState.anchors.length - 1].entity_type].textColor)}>
                                {searchState.anchors[searchState.anchors.length - 1].display_name}
                              </span>
                            </span>
                          </div>
                          {pivotGroups.map((group) => {
                            const lastAnchor = searchState.anchors[searchState.anchors.length - 1];
                            const totalAvailable = lastAnchor.links?.[group.type] ?? group.items.length;
                            return (
                              <PivotGroupSection
                                key={group.type}
                                group={group}
                                onItemClick={handlePivotItemClick}
                                totalAvailable={totalAvailable}
                                isExpanded={expandedTypes.has(group.type)}
                                isExpanding={expandingType === group.type}
                                onShowMore={() => fetchMoreForType(group.type)}
                              />
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* IDLE MODE: Show prompt */}
                  {searchState.mode === "idle" && (
                    <div className="py-8 px-6 text-center text-slate-400">
                      <div className="text-sm">Start typing to search...</div>
                    </div>
                  )}
                </div>
              </ComboboxOptions>
            )}
          </Combobox>
        </div>
      </form>

      {/* Helper Text */}
      <div className="mt-6 flex justify-center gap-8 text-sm font-medium text-slate-400 uppercase tracking-widest opacity-80 flex-wrap">
        {["BRCA1", "rs7412", "Alzheimer", "Metformin"].map((search) => (
          <button
            type="button"
            key={search}
            className="hover:text-purple-600 cursor-pointer transition-colors"
            onClick={() => {
              startTransition(() => {
                setSearchState({ mode: "typing", query: search, anchors: [] });
                setIsDropdownOpen(true);
              });
            }}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

// Pivot Anchor Card - shows info about the current pivot anchor at the top of dropdown
function PivotAnchorCard({
  anchor,
  onLinkedClick,
}: {
  anchor: TypeaheadSuggestion;
  onLinkedClick?: (name: string, type: EntityType) => void;
}) {
  const config = ENTITY_CONFIG[anchor.entity_type];

  // Truncate description
  const truncatedDescription = anchor.description
    ? anchor.description.length > 120
      ? anchor.description.slice(0, 120).trim() + "..."
      : anchor.description
    : null;

  // Build linked entity groups with their entity types
  const linkedGroups: Array<{ type: EntityType; names: string[]; config: typeof config }> = [];

  if (anchor.linked?.genes && anchor.linked.genes.length > 0) {
    linkedGroups.push({ type: "genes", names: anchor.linked.genes.slice(0, 4), config: ENTITY_CONFIG.genes });
  }
  if (anchor.linked?.diseases && anchor.linked.diseases.length > 0) {
    linkedGroups.push({ type: "diseases", names: anchor.linked.diseases.slice(0, 4), config: ENTITY_CONFIG.diseases });
  }
  if (anchor.linked?.drugs && anchor.linked.drugs.length > 0) {
    linkedGroups.push({ type: "drugs", names: anchor.linked.drugs.slice(0, 3), config: ENTITY_CONFIG.drugs });
  }
  if (anchor.linked?.pathways && anchor.linked.pathways.length > 0) {
    linkedGroups.push({ type: "pathways", names: anchor.linked.pathways.slice(0, 3), config: ENTITY_CONFIG.pathways });
  }

  // Show all link counts
  const linkCounts = [
    { label: "genes", count: anchor.links?.genes },
    { label: "variants", count: anchor.links?.variants },
    { label: "diseases", count: anchor.links?.diseases },
    { label: "drugs", count: anchor.links?.drugs },
    { label: "pathways", count: anchor.links?.pathways },
    { label: "phenotypes", count: anchor.links?.phenotypes },
    { label: "studies", count: anchor.links?.studies },
    { label: "traits", count: anchor.links?.traits },
  ]
    .filter((link) => link.count && link.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <div className="px-5 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white">
      {/* Entity name and type badge */}
      <div className="flex items-center gap-3 mb-2">
        <h3 className={cn("text-xl font-bold tracking-tight", config.textColor)}>
          {anchor.display_name}
        </h3>
        <span
          className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-sm",
            config.bgColor,
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Description */}
      {truncatedDescription && (
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          {truncatedDescription}
        </p>
      )}

      {/* Link counts - show all available */}
      {linkCounts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {linkCounts.map((link) => (
            <span
              key={link.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs"
            >
              <span className="font-semibold text-slate-700">
                {link.count?.toLocaleString()}
              </span>
              <span className="text-slate-500">{link.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Linked entity chips - clickable previews */}
      {linkedGroups.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quick links</span>
          <div className="flex flex-wrap gap-1.5">
            {linkedGroups.flatMap((group) =>
              group.names.map((name) => (
                <button
                  key={`${group.type}-${name}`}
                  type="button"
                  onClick={() => onLinkedClick?.(name, group.type)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Best Match Card Component (for typing mode)
function BestMatchCard({
  item,
  onSelect,
}: {
  item: TypeaheadSuggestion;
  onSelect: (item: TypeaheadSuggestion) => void;
}) {
  const config = ENTITY_CONFIG[item.entity_type];

  // Build linked entity previews from item.linked
  const linkedPreviews: string[] = [];
  if (item.linked) {
    if (item.linked.genes) linkedPreviews.push(...item.linked.genes);
    if (item.linked.diseases) linkedPreviews.push(...item.linked.diseases);
    if (item.linked.drugs) linkedPreviews.push(...item.linked.drugs);
    if (item.linked.pathways) linkedPreviews.push(...item.linked.pathways);
  }

  // Top 3 link counts
  const linkCounts = [
    { label: "genes", count: item.links?.genes },
    { label: "variants", count: item.links?.variants },
    { label: "diseases", count: item.links?.diseases },
    { label: "drugs", count: item.links?.drugs },
    { label: "pathways", count: item.links?.pathways },
  ]
    .filter((link) => link.count && link.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 3);

  // Truncate description
  const truncatedDescription = item.description
    ? item.description.length > 120
      ? item.description.slice(0, 120).trim() + "..."
      : item.description
    : null;

  return (
    <ComboboxOption
      as="div"
      value={item}
      onClick={() => onSelect(item)}
      className="cursor-pointer transition-colors duration-150 data-[focus]:bg-slate-50"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Name and type */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn("font-semibold", config.textColor)}>
                {item.display_name}
              </h3>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase text-white/90",
                  config.bgColor,
                )}
              >
                {config.label}
              </span>
            </div>

            {/* Description */}
            {truncatedDescription && (
              <p className="text-sm text-slate-500 leading-relaxed mb-2">
                {truncatedDescription}
              </p>
            )}

            {/* Link counts */}
            {linkCounts.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {linkCounts.map((link) => (
                  <span key={link.label}>
                    <span className="font-medium text-slate-500">
                      {link.count?.toLocaleString()}
                    </span>{" "}
                    {link.label}
                  </span>
                ))}
              </div>
            )}

            {/* Linked entity previews */}
            {linkedPreviews.length > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                <span className="font-medium">Linked:</span>{" "}
                {linkedPreviews.slice(0, 3).join(", ")}
                {linkedPreviews.length > 3 && ` +${linkedPreviews.length - 3} more`}
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="text-slate-300 pt-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </ComboboxOption>
  );
}

// Typeahead Group Section Component
function TypeaheadGroupSection({
  group,
  onSelect,
}: {
  group: { type: EntityType; items: TypeaheadSuggestion[] };
  onSelect: (item: TypeaheadSuggestion) => void;
}) {
  const config = ENTITY_CONFIG[group.type];

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Section Header - Colored */}
      <div
        className={cn(
          "sticky top-0 z-10 px-4 py-2 flex items-center gap-2",
          config.bgColor,
        )}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-white">
          {config.label}
        </span>
        <span className="text-xs text-white/70">
          ({group.items.length})
        </span>
      </div>

      {/* Entity Cards - Two Column Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {group.items.map((item) => (
          <SuggestionCard
            key={item.id}
            item={item}
            config={config}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </div>
  );
}

// Pivot Group Section Component
function PivotGroupSection({
  group,
  onItemClick,
  totalAvailable,
  isExpanded,
  isExpanding,
  onShowMore,
}: {
  group: { type: EntityType; items: TypeaheadSuggestion[] };
  onItemClick: (item: TypeaheadSuggestion) => void;
  totalAvailable: number;
  isExpanded: boolean;
  isExpanding: boolean;
  onShowMore: () => void;
}) {
  const config = ENTITY_CONFIG[group.type];
  const hasMore = !isExpanded && totalAvailable > group.items.length;
  const remainingCount = totalAvailable - group.items.length;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Section Header - Colored */}
      <div
        className={cn(
          "sticky top-0 z-10 px-4 py-2 flex items-center gap-2",
          config.bgColor,
        )}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-white">
          {config.label}
        </span>
        <span className="text-xs text-white/70">
          ({group.items.length}{totalAvailable > group.items.length ? ` of ${totalAvailable.toLocaleString()}` : ""})
        </span>
      </div>

      {/* Entity Cards - Two Column Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {group.items.map((item) => (
          <SuggestionCard
            key={item.id}
            item={item}
            config={config}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>

      {/* Show more button when there are more results */}
      {hasMore && (
        <button
          type="button"
          onClick={onShowMore}
          disabled={isExpanding}
          className="w-full px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExpanding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <span>
              Show more {config.label.toLowerCase()} ({remainingCount.toLocaleString()} more)
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// Shared Suggestion Card Component
function SuggestionCard({
  item,
  config,
  onClick,
}: {
  item: TypeaheadSuggestion;
  config: (typeof ENTITY_CONFIG)[EntityType];
  onClick: () => void;
}) {
  // Top 2 link counts only
  const linkCounts = [
    { label: "genes", count: item.links?.genes },
    { label: "variants", count: item.links?.variants },
    { label: "diseases", count: item.links?.diseases },
    { label: "drugs", count: item.links?.drugs },
  ]
    .filter((link) => link.count && link.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 2);

  // For studies: show ID, then display_name as "description"
  const isStudy = item.entity_type === "studies";
  const primaryText = isStudy ? item.id : item.display_name;

  // Build description text
  let descriptionText = null;
  if (isStudy && item.display_name !== item.id) {
    // For studies, show the study name (display_name) as description
    descriptionText = item.display_name.length > 80
      ? item.display_name.slice(0, 80).trim() + "..."
      : item.display_name;
  } else if (item.description) {
    // For other entities, use actual description
    descriptionText = item.description.length > 80
      ? item.description.slice(0, 80).trim() + "..."
      : item.description;
  }

  return (
    <ComboboxOption
      as="div"
      className="cursor-pointer transition-colors duration-150 data-[focus]:bg-slate-50 border-b md:border-r border-slate-100 md:odd:border-r md:even:border-r-0 last:border-b-0"
      value={item}
      onClick={onClick}
    >
      <div className="px-4 py-3 h-full">
        {/* Name */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("font-medium text-sm", config.textColor)}>
            {primaryText}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        </div>

        {/* Description - single line */}
        {descriptionText && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">
            {descriptionText}
          </p>
        )}

        {/* Link counts - minimal */}
        {linkCounts.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
            {linkCounts.map((link) => (
              <span key={link.label}>
                {link.count?.toLocaleString()} {link.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </ComboboxOption>
  );
}
