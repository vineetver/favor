import type {
  FilterChip,
  ServerSortProps,
} from "@shared/components/ui/data-surface/types";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  updateClientUrl,
  useClientSearchParams,
} from "./use-client-search-params";

// ============================================================================
// Types
// ============================================================================

export interface ServerFilterConfig {
  id: string;
  label: string;
  type: "select" | "multiselect" | "text";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  /** Section heading in the filter drawer (drawer groups filters by section) */
  section?: string;
  /** Custom label formatter for filter chips */
  chipLabel?: (value: string) => string;
}

export interface ServerPaginationInfo {
  /** Total number of items across all pages */
  totalCount?: number;
  /** Current page size */
  pageSize: number;
  /** Whether there are more pages */
  hasMore?: boolean;
  /** Current cursor (for cursor-based pagination) */
  currentCursor?: string | null;
}

export interface UseServerTableOptions {
  /** Filter configurations */
  filters: ServerFilterConfig[];
  /** Debounce delay for text inputs in milliseconds (default: 300) */
  debounceDelay?: number;
  /** Initial filter values from server (e.g., from URL params) */
  serverFilters?: Record<string, string>;
  /** Enable server-side pagination */
  serverPagination?: boolean;
  /** Server pagination info */
  paginationInfo?: ServerPaginationInfo;
}

export interface UseServerTableReturn {
  /** Current filter values for DataSurface */
  filterValues: Record<string, unknown>;
  /** Handle filter changes */
  onFilterChange: (filterId: string, value: unknown) => void;
  /** Active filter chips */
  filterChips: FilterChip[];
  /** Handle removing a filter chip */
  onRemoveFilterChip: (chipId: string) => void;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Loading state from server transitions */
  loading: boolean;
  /** Server pagination handlers (only when serverPagination is enabled) */
  pagination?: {
    onNextPage: () => void;
    onPreviousPage: () => void;
    onPageSizeChange: (size: number) => void;
    canGoNext: boolean;
    canGoPrevious: boolean;
    pageSize: number;
    totalCount?: number;
  };
  /** Server sort state (only when serverPagination is enabled) */
  serverSort?: ServerSortProps;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing server-side table filtering and pagination with URL state.
 * Follows the patterns from useTypeahead: AbortController, request versioning,
 * debouncing, and proper cleanup.
 *
 * @example
 * const table = useServerTable({
 *   filters: [
 *     { id: 'status', label: 'Status', type: 'select', options: [...] },
 *     { id: 'search', label: 'Search', type: 'text', placeholder: 'Search...' },
 *   ],
 *   serverFilters,
 *   serverPagination: true,
 *   paginationInfo,
 * });
 *
 * return <DataSurface {...table} serverPagination={table.pagination} />;
 */
export function useServerTable({
  filters,
  debounceDelay = 300,
  serverFilters = {},
  serverPagination = false,
  paginationInfo,
}: UseServerTableOptions): UseServerTableReturn {
  const pathname = usePathname();
  const searchParams = useClientSearchParams();

  // ============================================================================
  // Local State for Text Inputs (immediate UI feedback)
  // ============================================================================

  // Create text filter map for quick lookup
  const textFilterIds = useMemo(
    () => new Set(filters.filter((f) => f.type === "text").map((f) => f.id)),
    [filters],
  );

  // Multiselect filter map for array round-trip via URL (comma-separated)
  const multiselectFilterIds = useMemo(
    () =>
      new Set(filters.filter((f) => f.type === "multiselect").map((f) => f.id)),
    [filters],
  );

  // Initialize local state from serverFilters (SSR-safe, no window access)
  const [localTextFilters, setLocalTextFilters] = useState<
    Record<string, string>
  >(() => {
    const state: Record<string, string> = {};
    for (const filterId of textFilterIds) {
      state[filterId] = serverFilters[filterId] ?? "";
    }
    return state;
  });

  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Cursor history for "previous" button support
  const cursorHistory = useRef<string[]>([]);

  // ============================================================================
  // Sync local state with URL on browser navigation (back/forward)
  // ============================================================================

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setLocalTextFilters((prev) => {
      const updated: Record<string, string> = {};
      let hasChanged = false;

      for (const filterId of textFilterIds) {
        const urlValue = searchParams.get(filterId) ?? "";
        updated[filterId] = urlValue;
        if (prev[filterId] !== urlValue) {
          hasChanged = true;
        }
      }

      return hasChanged ? updated : prev;
    });
  }, [searchParams, textFilterIds]);

  // ============================================================================
  // URL Update Logic (using window.history to avoid server navigation)
  // ============================================================================

  const updateUrl = useCallback(
    (filterId: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(filterId, value);
      } else {
        params.delete(filterId);
      }

      // Reset pagination when filters change
      if (serverPagination) {
        params.delete("cursor");
        cursorHistory.current = [];
      }

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;

      updateClientUrl(newUrl, false);
    },
    [pathname, searchParams, serverPagination],
  );

  // ============================================================================
  // Debounced URL update for text filters
  // ============================================================================

  const scheduleUrlUpdate = useCallback(
    (filterId: string, value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateUrl(filterId, value);
      }, debounceDelay);
    },
    [updateUrl, debounceDelay],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Filter Change Handlers
  // ============================================================================

  const handleFilterChange = useCallback(
    (filterId: string, value: unknown) => {
      // Multiselect: encode array as comma-separated string in URL
      if (multiselectFilterIds.has(filterId)) {
        const arr = Array.isArray(value) ? value.map(String).filter(Boolean) : [];
        updateUrl(filterId, arr.join(","));
        return;
      }

      const strValue = String(value ?? "");

      if (textFilterIds.has(filterId)) {
        // Text filter: FilterDrawer already debounced this, so update immediately
        setLocalTextFilters((prev) => {
          // Avoid unnecessary re-renders if value didn't change
          if (prev[filterId] === strValue) return prev;
          return { ...prev, [filterId]: strValue };
        });
        // Update URL immediately (FilterDrawer already debounced the call)
        updateUrl(filterId, strValue);
      } else {
        // Select filter: update URL immediately (no typing involved)
        updateUrl(filterId, strValue);
      }
    },
    [textFilterIds, multiselectFilterIds, updateUrl],
  );

  const handleRemoveFilterChip = useCallback(
    (chipId: string) => {
      // Cancel pending debounced update
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Multiselect chips are namespaced as `${filterId}::${value}` — drop just that value.
      if (chipId.includes("::")) {
        const [filterId, value] = chipId.split("::");
        if (!filterId || value === undefined) return;
        const params = new URLSearchParams(searchParams.toString());
        const current = (params.get(filterId) ?? "")
          .split(",")
          .filter(Boolean);
        const next = current.filter((v) => v !== value);
        if (next.length) {
          params.set(filterId, next.join(","));
        } else {
          params.delete(filterId);
        }
        if (serverPagination) {
          params.delete("cursor");
          cursorHistory.current = [];
        }
        const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
        updateClientUrl(newUrl, false);
        return;
      }

      // Clear local state for text filters
      if (textFilterIds.has(chipId)) {
        setLocalTextFilters((prev) => ({ ...prev, [chipId]: "" }));
      }

      // Update URL immediately
      updateUrl(chipId, "");
    },
    [textFilterIds, updateUrl, searchParams, pathname, serverPagination],
  );

  const handleClearFilters = useCallback(() => {
    // Cancel pending debounced updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear all local text filter state
    setLocalTextFilters((prev) => {
      const cleared: Record<string, string> = {};
      for (const key of Object.keys(prev)) {
        cleared[key] = "";
      }
      return cleared;
    });

    // Navigate to clean URL without server navigation
    updateClientUrl(pathname, false);
  }, [pathname]);

  // ============================================================================
  // Computed Values (derived state, not stored)
  // ============================================================================

  // Combined filter values: local for text (instant), URL for select/multiselect
  const filterValues = useMemo(() => {
    const values: Record<string, unknown> = {};

    for (const filter of filters) {
      if (filter.type === "text") {
        // Text filters: use local state for instant feedback
        values[filter.id] = localTextFilters[filter.id] ?? "";
      } else if (filter.type === "multiselect") {
        // Multiselect: parse comma-separated URL value into array
        const raw = searchParams.get(filter.id);
        values[filter.id] = raw ? raw.split(",").filter(Boolean) : [];
      } else {
        // Select filters: read from current URL (source of truth)
        values[filter.id] = searchParams.get(filter.id) ?? "";
      }
    }

    return values;
  }, [filters, localTextFilters, searchParams]);

  // Generate filter chips from current values.
  // Multiselect emits one chip per selected value so users can drop values individually.
  // Chip ids are namespaced as `${filterId}::${value}` so onRemoveFilterChip can route them.
  const filterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];

    for (const filter of filters) {
      if (filter.type === "multiselect") {
        const arr = (filterValues[filter.id] as string[]) ?? [];
        for (const v of arr) {
          const opt = filter.options?.find((o) => o.value === v);
          chips.push({
            id: `${filter.id}::${v}`,
            label: filter.label,
            value: filter.chipLabel?.(v) ?? opt?.label ?? v,
          });
        }
        continue;
      }

      const value = filterValues[filter.id] as string;
      if (!value) continue;

      let displayValue = value;

      // Use custom chip label if provided
      if (filter.chipLabel) {
        displayValue = filter.chipLabel(value);
      }
      // For select filters, find the option label
      else if (filter.type === "select" && filter.options) {
        const option = filter.options.find((opt) => opt.value === value);
        if (option) {
          displayValue = option.label;
        }
      }

      chips.push({
        id: filter.id,
        label: filter.label,
        value: displayValue,
      });
    }

    return chips;
  }, [filters, filterValues]);

  // ============================================================================
  // Sorting Handlers
  // ============================================================================

  const handleSortChange = useCallback(
    (columnId: string, desc: boolean) => {
      // Read current URL directly to avoid stale closure over searchParams
      const params = new URLSearchParams(window.location.search);
      if (columnId) {
        params.set("sort_by", columnId);
        params.set("sort_dir", desc ? "desc" : "asc");
      } else {
        params.delete("sort_by");
        params.delete("sort_dir");
      }
      // Reset pagination on sort change
      params.delete("cursor");
      cursorHistory.current = [];

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      updateClientUrl(newUrl, false);
    },
    [pathname],
  );

  const serverSort = useMemo<ServerSortProps | undefined>(() => {
    if (!serverPagination) return undefined;
    const sortBy = searchParams.get("sort_by") || null;
    const sortDir =
      (searchParams.get("sort_dir") as "asc" | "desc") || "desc";
    return { sortBy, sortDir, onSortChange: handleSortChange };
  }, [serverPagination, searchParams, handleSortChange]);

  // ============================================================================
  // Pagination Handlers
  // ============================================================================

  const pagination = useMemo(() => {
    if (!serverPagination || !paginationInfo) return undefined;

    const currentCursor = searchParams.get("cursor");
    const pageSize =
      Number(searchParams.get("page_size")) || paginationInfo.pageSize;

    const handleNextPage = () => {
      if (!paginationInfo.hasMore) return;

      const params = new URLSearchParams(searchParams.toString());

      // Save current cursor to history before navigating
      if (currentCursor) {
        cursorHistory.current.push(currentCursor);
      } else if (cursorHistory.current.length === 0) {
        // First page, save empty cursor
        cursorHistory.current.push("");
      }

      // Set next cursor
      if (paginationInfo.currentCursor) {
        params.set("cursor", paginationInfo.currentCursor);
      }

      const newUrl = `${pathname}?${params.toString()}`;
      // Use pushState for pagination to support back/forward
      updateClientUrl(newUrl, true);
    };

    const handlePreviousPage = () => {
      if (cursorHistory.current.length === 0) return;

      const params = new URLSearchParams(searchParams.toString());
      const previousCursor = cursorHistory.current.pop();

      if (previousCursor) {
        params.set("cursor", previousCursor);
      } else {
        // Go back to first page
        params.delete("cursor");
      }

      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      // Use pushState for pagination to support back/forward
      updateClientUrl(newUrl, true);
    };

    const handlePageSizeChange = (size: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page_size", String(size));
      // Reset to first page when changing page size
      params.delete("cursor");
      cursorHistory.current = [];

      const newUrl = `${pathname}?${params.toString()}`;
      // Use replaceState for page size changes
      updateClientUrl(newUrl, false);
    };

    return {
      onNextPage: handleNextPage,
      onPreviousPage: handlePreviousPage,
      onPageSizeChange: handlePageSizeChange,
      canGoNext: paginationInfo.hasMore ?? false,
      canGoPrevious: cursorHistory.current.length > 0,
      pageSize,
      totalCount: paginationInfo.totalCount,
    };
  }, [serverPagination, paginationInfo, searchParams, pathname]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    filterValues,
    onFilterChange: handleFilterChange,
    filterChips,
    onRemoveFilterChip: handleRemoveFilterChip,
    onClearFilters: handleClearFilters,
    loading: false,
    pagination,
    serverSort,
  };
}
