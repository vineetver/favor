import type { FilterChip } from "@shared/components/ui/data-surface/types";
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
  type: "select" | "text";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
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
  const [isPending, setIsPending] = useState(false);

  // ============================================================================
  // Local State for Text Inputs (immediate UI feedback)
  // ============================================================================

  // Create text filter map for quick lookup
  const textFilterIds = useMemo(
    () => new Set(filters.filter((f) => f.type === "text").map((f) => f.id)),
    [filters],
  );

  // Initialize local state from server filters (single source of truth)
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
        const urlValue = serverFilters[filterId] ?? "";
        updated[filterId] = urlValue;
        if (prev[filterId] !== urlValue) {
          hasChanged = true;
        }
      }

      return hasChanged ? updated : prev;
    });
  }, [serverFilters, textFilterIds]);

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

      // Update URL without Next.js server navigation
      updateClientUrl(newUrl, false);

      // Show loading state briefly (optional, for UX feedback)
      setIsPending(true);
      setTimeout(() => setIsPending(false), 100);
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
    [textFilterIds, updateUrl],
  );

  const handleRemoveFilterChip = useCallback(
    (chipId: string) => {
      // Cancel pending debounced update
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear local state for text filters
      if (textFilterIds.has(chipId)) {
        setLocalTextFilters((prev) => ({ ...prev, [chipId]: "" }));
      }

      // Update URL immediately
      updateUrl(chipId, "");
    },
    [textFilterIds, updateUrl],
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

  // Combined filter values: local for text (instant), server for select
  const filterValues = useMemo(() => {
    const values: Record<string, unknown> = {};

    for (const filter of filters) {
      if (filter.type === "text") {
        values[filter.id] = localTextFilters[filter.id] ?? "";
      } else {
        values[filter.id] = serverFilters[filter.id] ?? "";
      }
    }

    return values;
  }, [filters, localTextFilters, serverFilters]);

  // Generate filter chips from current values
  const filterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];

    for (const filter of filters) {
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
    loading: isPending,
    pagination,
  };
}
