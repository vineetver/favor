import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

export function buildFiltersQuery(filters: ColumnFiltersState): string {
  return filters
    .filter((filter) => filter.value !== undefined && filter.value !== null)
    .map((filter) => {
      if (Array.isArray(filter.value)) {
        return filter.value
          .map((value) => `${filter.id}=${encodeURIComponent(String(value))}`)
          .join("&");
      }
      return `${filter.id}=${encodeURIComponent(String(filter.value))}`;
    })
    .filter(Boolean)
    .join("&");
}

export function buildSortingQuery(sorting: SortingState): string {
  return sorting
    .map((sort) => `sort=${sort.desc ? "-" : ""}${sort.id}`)
    .join("&");
}
