"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { cn } from "@infra/utils";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
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
  anchor: TypeaheadSuggestion | null;
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

export function UniversalSearch() {
  const router = useRouter();
  const [genome, setGenome] = useState<GenomeBuild>("hg38");
  const [searchState, setSearchState] = useState<SearchState>({
    mode: "idle",
    query: "",
    anchor: null,
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
    limit: 4,
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
  } = usePivotExpansion({
    limit: 5,
  });

  // Sync typeahead query only when in typing mode
  useEffect(() => {
    if (searchState.mode === "typing") {
      setTypeaheadQuery(deferredQuery);
    }
  }, [deferredQuery, searchState.mode, setTypeaheadQuery]);

  // Sync pivot anchor when in selected mode
  useEffect(() => {
    if (searchState.mode === "selected" && searchState.anchor) {
      setPivotAnchor({
        id: searchState.anchor.id,
        type: searchState.anchor.entity_type,
      });
    } else if (searchState.mode !== "selected") {
      clearPivot();
    }
  }, [searchState.mode, searchState.anchor, setPivotAnchor, clearPivot]);

  const handleInputChange = useCallback((value: string) => {
    if (value.trim().length === 0) {
      setSearchState({ mode: "idle", query: "", anchor: null });
      setIsDropdownOpen(false);
    } else {
      // Any typing clears selection and returns to typing mode
      setSearchState({ mode: "typing", query: value, anchor: null });
      if (value.trim().length >= 2) {
        setIsDropdownOpen(true);
      }
    }
    setHighlightedIndex(-1);
  }, []);

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
        const displayText = getPopulateIdentifier(suggestion);
        setSearchState({
          mode: "selected",
          query: displayText,
          anchor: suggestion,
        });
        setHighlightedIndex(-1);
        // Keep dropdown open to show pivot results
      });
    },
    [],
  );

  const handleClearAnchor = useCallback(() => {
    startTransition(() => {
      // Clear pivot results immediately to prevent stale data flash
      clearPivot();

      // Clear anchor, return to typing mode, keep query text
      setSearchState((prev) => {
        const newMode = prev.query.trim().length >= 2 ? "typing" : "idle";
        return {
          mode: newMode,
          query: prev.query,
          anchor: null,
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
        setSearchState({ mode: "idle", query: "", anchor: null });
        setIsDropdownOpen(false);
      } else {
        // Pivot-hop: set this as new anchor
        handleSelectSuggestion(item);
      }
    },
    [genome, router, clearTypeahead, clearPivot, handleSelectSuggestion],
  );

  // Navigate to anchor entity page (used in selected mode)
  const navigateToAnchor = useCallback(async () => {
    if (searchState.mode !== "selected" || !searchState.anchor) return false;

    const { anchor } = searchState;

    if (!hasEntityPage(anchor.entity_type)) {
      // No entity page - stay in pivot view
      return false;
    }

    // For variants, try routing via rsID if available
    if (anchor.entity_type === "variants") {
      // Check if display_name is an rsID
      const rsIdMatch = anchor.display_name.match(/^rs\d+$/i);
      if (rsIdMatch) {
        const success = await navigateToQuery(anchor.display_name, genome, router);
        if (success) {
          clearTypeahead();
          clearPivot();
          setSearchState({ mode: "idle", query: "", anchor: null });
          setIsDropdownOpen(false);
          return true;
        }
      }
    }

    // Standard URL navigation using anchor.id (not display_name)
    const url = anchor.url || getEntityUrl(anchor.entity_type, anchor.id, { genome });
    router.push(url);
    clearTypeahead();
    clearPivot();
    setSearchState({ mode: "idle", query: "", anchor: null });
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
          setSearchState({ mode: "idle", query: "", anchor: null });
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
    if (query.trim().length >= 2 || searchState.mode === "selected") {
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
        groupedTypeaheadSuggestions.push({
          type: group.entity_type,
          items: group.suggestions,
        });
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

              <div className="flex-1 w-full relative">
                <ComboboxInput
                  className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg h-14 px-2 font-medium tracking-tight focus:outline-none"
                  displayValue={() => query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  onKeyDown={(e) => {
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
                  placeholder="Search genes, variants, diseases, drugs, pathways..."
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Clear button when anchor is selected */}
                {searchState.mode === "selected" && (
                  <button
                    type="button"
                    onClick={handleClearAnchor}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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

                  {/* SELECTED MODE: Show anchor card + pivot results */}
                  {searchState.mode === "selected" && searchState.anchor && (
                    <>
                      {/* Anchor Card - always shown immediately */}
                      <AnchorCard
                        anchor={searchState.anchor}
                        onClear={handleClearAnchor}
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
                        // Pivot groups
                        pivotGroups.map((group) => (
                          <PivotGroupSection
                            key={group.type}
                            group={group}
                            onItemClick={handlePivotItemClick}
                          />
                        ))
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
                setSearchState({ mode: "typing", query: search, anchor: null });
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

// Anchor Card Component
function AnchorCard({
  anchor,
  onClear,
}: {
  anchor: TypeaheadSuggestion;
  onClear: () => void;
}) {
  const config = ENTITY_CONFIG[anchor.entity_type];

  // Only show top 4 link counts, sorted by count
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
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 4);

  // Truncate description to ~150 chars
  const truncatedDescription = anchor.description
    ? anchor.description.length > 150
      ? anchor.description.slice(0, 150).trim() + "..."
      : anchor.description
    : null;

  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Entity name and type */}
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className={cn("text-lg font-semibold", config.textColor)}>
              {anchor.display_name}
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-white/90",
                config.bgColor,
              )}
            >
              {config.label}
            </span>
          </div>

          {/* Description - 2 lines max */}
          {truncatedDescription && (
            <p className="text-sm text-slate-500 leading-relaxed mb-3">
              {truncatedDescription}
            </p>
          )}

          {/* Link counts - subtle, inline */}
          {linkCounts.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {linkCounts.map((link) => (
                <span key={link.label}>
                  <span className="font-medium text-slate-600">
                    {link.count?.toLocaleString()}
                  </span>{" "}
                  {link.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Clear button */}
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 -mr-1.5 -mt-1 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
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
      {/* Section Header - subtle */}
      <div className="px-4 pt-3 pb-1">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Entity Cards */}
      <div>
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
}: {
  group: { type: EntityType; items: TypeaheadSuggestion[] };
  onItemClick: (item: TypeaheadSuggestion) => void;
}) {
  const config = ENTITY_CONFIG[group.type];

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Section Header - subtle */}
      <div className="px-4 pt-3 pb-1">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Entity Cards */}
      <div>
        {group.items.map((item) => (
          <SuggestionCard
            key={item.id}
            item={item}
            config={config}
            onClick={() => onItemClick(item)}
            showPivotHint={!hasEntityPage(item.entity_type)}
          />
        ))}
      </div>
    </div>
  );
}

// Shared Suggestion Card Component
function SuggestionCard({
  item,
  config,
  onClick,
  showPivotHint = false,
}: {
  item: TypeaheadSuggestion;
  config: (typeof ENTITY_CONFIG)[EntityType];
  onClick: () => void;
  showPivotHint?: boolean;
}) {
  const hasUrl = hasEntityPage(item.entity_type);

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

  // Truncate description to 80 chars for cards
  const truncatedDescription = item.description
    ? item.description.length > 80
      ? item.description.slice(0, 80).trim() + "..."
      : item.description
    : null;

  return (
    <ComboboxOption
      as="div"
      className="cursor-pointer transition-colors duration-150 data-[focus]:bg-slate-50 border-b border-slate-50 last:border-0"
      value={item}
      onClick={onClick}
    >
      <div className="px-4 py-3">
        {/* Name */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("font-medium text-sm", config.textColor)}>
            {item.display_name}
          </span>
          {hasUrl ? (
            <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
          ) : showPivotHint ? (
            <span className="text-[9px] font-medium text-slate-400">
              explore
            </span>
          ) : null}
        </div>

        {/* Description - single line */}
        {truncatedDescription && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">
            {truncatedDescription}
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
