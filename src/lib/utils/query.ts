import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

export function buildFiltersQuery(filters: ColumnFiltersState): string {
  return filters
    .filter((filter) => filter.value !== undefined && filter.value !== null)
    .filter((filter) => !isRangeFilter(filter.value))
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

function isRangeFilter(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

export function extractNumericFilters(filters: ColumnFiltersState): Array<{
  field: string;
  operator: "gt" | "lt" | "eq";
  value: string;
}> {
  const numericFilters: Array<{
    field: string;
    operator: "gt" | "lt" | "eq";
    value: string;
  }> = [];

  filters.forEach((filter) => {
    if (isRangeFilter(filter.value)) {
      const [min, max] = filter.value as [number, number];
      numericFilters.push({
        field: filter.id,
        operator: "gt",
        value: String(min),
      });
      numericFilters.push({
        field: filter.id,
        operator: "lt",
        value: String(max),
      });
    }
  });

  return numericFilters;
}

export function buildSortingQuery(sorting: SortingState): string {
  return sorting
    .map((sort) => `sort=${sort.desc ? "-" : ""}${sort.id}`)
    .join("&");
}
