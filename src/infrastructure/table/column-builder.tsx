import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import type { AccessorFn, CellContext, ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

// ============================================================================
// Color System - Refined for scientific/genomics data display
// ============================================================================

// Badge styles - subtle, refined aesthetic for scientific contexts
export const BADGE_COLORS = {
  // Primary status colors - semantic meaning
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  orange: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",

  // Scientific/genomics-oriented colors
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200/60",

  // Extended palette
  lime: "bg-lime-50 text-lime-700 ring-1 ring-lime-200/60",
  teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60",
  cyan: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/60",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  stone: "bg-stone-50 text-stone-600 ring-1 ring-stone-200/60",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  pink: "bg-pink-50 text-pink-700 ring-1 ring-pink-200/60",

  // Neutral
  gray: "bg-muted text-muted-foreground ring-1 ring-border/60",
} as const;

// Dot colors for tooltip legends
export const DOT_COLORS: Record<BadgeColor, string> = {
  green: "bg-emerald-500",
  red: "bg-rose-500",
  yellow: "bg-amber-500",
  orange: "bg-orange-500",
  blue: "bg-sky-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  lime: "bg-lime-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  stone: "bg-stone-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  pink: "bg-pink-500",
  gray: "bg-muted-foreground",
};

export type BadgeColor = keyof typeof BADGE_COLORS;

// ============================================================================
// Category System - Unified badge colors + description rendering
// ============================================================================

export type Category = {
  label: string;
  match: string | RegExp;
  color: BadgeColor;
  description: string;
};

/** Create a category mapping for badges. Colors and descriptions stay in sync. */
export function categories(items: Category[]) {
  return {
    items,
    /** Get the matching category for a value */
    getCategory(value: string | null | undefined): Category | undefined {
      if (!value) return undefined;
      return items.find((item) =>
        item.match instanceof RegExp
          ? item.match.test(value)
          : value === item.match,
      );
    },
    /** Get the color for a value */
    getColor(value: string | null | undefined): BadgeColor {
      if (!value) return "gray";
      const match = items.find((item) =>
        item.match instanceof RegExp
          ? item.match.test(value)
          : value === item.match,
      );
      return match?.color ?? "gray";
    },
    /** Render description with color legend */
    description(intro: ReactNode): ReactNode {
      return (
        <div className="space-y-2 text-left">
          <div>{intro}</div>
          <div className="space-y-1.5 text-sm">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0",
                    DOT_COLORS[item.color],
                  )}
                />
                <span>
                  <strong>{item.label}:</strong> {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    },
  };
}

// ============================================================================
// Cell Renderers - Composable building blocks
// ============================================================================

const EMPTY = "-";

function isEmpty(v: unknown): v is null | undefined {
  return v === null || v === undefined;
}

/** Badge component - exported for use in derived columns */
export function Badge({
  children,
  color,
}: {
  children: ReactNode;
  color: BadgeColor;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase",
        BADGE_COLORS[color],
      )}
    >
      {children}
    </span>
  );
}

/** Chainable text transformer builder */
class TextBuilder<TData> {
  private transforms: Array<(str: string) => string> = [];

  /** Capitalize first letter of each word */
  capitalize(): this {
    this.transforms.push((str) =>
      str
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" "),
    );
    return this;
  }

  /** Uppercase */
  upper(): this {
    this.transforms.push((str) => str.toUpperCase());
    return this;
  }

  /** Lowercase */
  lower(): this {
    this.transforms.push((str) => str.toLowerCase());
    return this;
  }

  /** Trim whitespace */
  trim(): this {
    this.transforms.push((str) => str.trim());
    return this;
  }

  /** Split string and optionally get specific part */
  split(separator: string, index?: number): this {
    this.transforms.push((str) => {
      const parts = str.split(separator);
      if (index !== undefined) {
        return parts[index] ?? "";
      }
      return parts.filter(Boolean).join(", ");
    });
    return this;
  }

  /** Replace text */
  replace(search: string | RegExp, replacement: string): this {
    this.transforms.push((str) => str.replace(search, replacement));
    return this;
  }

  /** Build the final cell renderer */
  private build() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      let result = String(v);
      for (const transform of this.transforms) {
        result = transform(result);
      }
      return result;
    };
  }

  /** Allow using the builder directly as a cell renderer */
  [Symbol.for("tanstack.cell")]() {
    return this.build();
  }
}

export const cell = {
  /** Plain text - returns cell renderer */
  text<TData>(): (ctx: CellContext<TData, unknown>) => ReactNode {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      return String(v);
    };
  },

  /** Capitalize first letter of each word (standalone) */
  capitalize<TData>() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const str = String(v);
      return str
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
    };
  },

  /** Uppercase (standalone) */
  upper<TData>() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      return isEmpty(v) ? EMPTY : String(v).toUpperCase();
    };
  },

  /** Lowercase (standalone) */
  lower<TData>() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      return isEmpty(v) ? EMPTY : String(v).toLowerCase();
    };
  },

  /** Trim whitespace (standalone) */
  trim<TData>() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      return isEmpty(v) ? EMPTY : String(v).trim();
    };
  },

  /** Split string and optionally get specific part (standalone) */
  split<TData>(separator: string, index?: number) {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const parts = String(v).split(separator);
      if (index !== undefined) {
        return parts[index] ?? EMPTY;
      }
      return parts.filter(Boolean).join(", ");
    };
  },

  /** Replace text (standalone) */
  replace<TData>(search: string | RegExp, replacement: string) {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      return isEmpty(v) ? EMPTY : String(v).replace(search, replacement);
    };
  },

  /** Decimal number with configurable precision */
  decimal<TData>(decimals = 3) {
    return ({
      getValue,
    }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (Number.isNaN(num)) return EMPTY;
      return num.toFixed(decimals);
    };
  },

  /** Integer (whole number) */
  integer<TData>() {
    return ({
      getValue,
    }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (Number.isNaN(num)) return EMPTY;
      return Math.round(num).toString();
    };
  },

  /** Percentage (multiplies by 100 and adds %) */
  percent<TData>(decimals = 1) {
    return ({
      getValue,
    }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (Number.isNaN(num)) return EMPTY;
      return `${(num * 100).toFixed(decimals)}%`;
    };
  },

  /** Colored badge based on category matching */
  badge<TData>(
    cats: ReturnType<typeof categories>,
    fallback: BadgeColor = "gray",
  ) {
    return ({ getValue }: CellContext<TData, string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const category = cats.getCategory(v);
      const color = category?.color ?? fallback;
      const label = category?.label ?? v.replace(/_/g, " ");
      return <Badge color={color}>{label}</Badge>;
    };
  },

  /** Badge with value transformation */
  badgeMap<TData>(
    colorMap: Record<string, BadgeColor>,
    labelMap?: Record<string, string>,
    fallback: BadgeColor = "gray",
  ) {
    return ({ getValue }: CellContext<TData, string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const color = colorMap[v] ?? fallback;
      const label = labelMap?.[v] ?? v;
      return <Badge color={color}>{label.replace(/_/g, " ")}</Badge>;
    };
  },

  /** Presence badge - shows "Yes" if any truthy value exists, "-" if empty */
  presence<TData>(presentLabel = "Yes", presentColor: BadgeColor = "green") {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      return <Badge color={presentColor}>{presentLabel}</Badge>;
    };
  },

  /** External link */
  link<TData, TValue>(urlFn: (value: TValue, row: TData) => string) {
    return ({
      getValue,
      row,
    }: CellContext<TData, TValue | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      return (
        <ExternalLink href={urlFn(v as TValue, row.original)}>
          {String(v)}
        </ExternalLink>
      );
    };
  },

  /** Custom renderer */
  custom<TData, TValue>(render: (value: TValue, row: TData) => ReactNode) {
    return ({
      getValue,
      row,
    }: CellContext<TData, TValue | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      return render(v as TValue, row.original);
    };
  },
};

// ============================================================================
// Column Builder - Type-safe column definitions
// ============================================================================

/** Column metadata stored in meta field, accessible during rendering */
export type ColumnMeta = {
  description?: ReactNode;
  headerTooltip?: ReactNode;
  sortable?: boolean;
  sortDescFirst?: boolean;
};

type ColConfig<TData, TValue> = {
  header: string;
  description?: ReactNode;
  headerTooltip?: ReactNode;
  sortable?: boolean;
  sortDescFirst?: boolean;
  cell?: (ctx: CellContext<TData, TValue>) => ReactNode;
};

type AccessorColConfig<TData, TValue> = ColConfig<TData, TValue> & {
  accessor: keyof TData | AccessorFn<TData, TValue>;
};

type DisplayColConfig<TData> = ColConfig<TData, unknown> & {
  cell: (ctx: CellContext<TData, unknown>) => ReactNode;
};

/** Single derived column for key-value table views */
export type DerivedColumn = {
  header: string;
  headerTooltip?: ReactNode;
  /** Transform the base value into a derived value. Receives value and optionally the row/column ID. */
  derive: (value: unknown, id?: string) => unknown;
  /** Render the derived value */
  render: (value: unknown) => ReactNode;
};

/** Default sort configuration */
export type DefaultSort = {
  /** Column to sort by: "label", "value", or "derived" */
  column: "label" | "value" | "derived";
  direction: "asc" | "desc";
};

/** Props passed to visualization components */
export type VisualizationProps<TRow = TransposedRow> = {
  /** Filtered and sorted rows from the table */
  data: TRow[];
  /** The derived column config (if any) */
  derivedColumn?: DerivedColumn;
};

/** A row in transposed format (used for integrative, conservation, etc.) */
export type TransposedRow = {
  id: string;
  label: string;
  value: unknown;
  derived: unknown;
};

/** View configuration for DataTable transposed mode */
export type ViewConfig = {
  /** Data format: transposed (columns→rows) or regular table */
  format?: "transposed" | "regular";
  /** Enable search input */
  search?: boolean;
  /** Enable column visibility toggle */
  columnToggle?: boolean;
  /** Enable CSV export */
  export?: boolean;
  /** Visualization component (enables Table/Visualization tabs) */
  visualization?: React.ComponentType<VisualizationProps>;
};

type GroupConfig = {
  headerTooltip?: ReactNode;
  /** Optional single derived column (e.g., percentile) */
  derivedColumn?: DerivedColumn;
  /** Default sort for table views */
  defaultSort?: DefaultSort;
  /** View configuration for DataTable transposed mode */
  view?: ViewConfig;
};

/** Type for a column group */
export type ColumnGroup<TData> = {
  id: string;
  header: string;
  columns: ColumnDef<TData>[];
  headerTooltip?: ReactNode;
  derivedColumn?: DerivedColumn;
  defaultSort?: DefaultSort;
  view?: ViewConfig;
};

/** Create a typed column builder for a specific data type */
export function createColumns<TData>() {
  return {
    /** Accessor column - maps to a data field */
    accessor<TValue = unknown>(
      id: string,
      config: AccessorColConfig<TData, TValue>,
    ): ColumnDef<TData> {
      const {
        accessor,
        header,
        description,
        headerTooltip,
        sortable,
        sortDescFirst,
        cell: cellFn,
      } = config;
      const meta: ColumnMeta = {};
      if (description) meta.description = description;
      if (headerTooltip) meta.headerTooltip = headerTooltip;
      if (sortable !== undefined) meta.sortable = sortable;
      if (sortDescFirst !== undefined) meta.sortDescFirst = sortDescFirst;

      return {
        id,
        accessorFn:
          typeof accessor === "function"
            ? (accessor as AccessorFn<TData, unknown>)
            : (row) => row[accessor as keyof TData],
        header,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
        cell: cellFn as ColumnDef<TData>["cell"],
        enableSorting: sortable,
        sortDescFirst,
      };
    },

    /** Display column - no data mapping, just renders */
    display(id: string, config: DisplayColConfig<TData>): ColumnDef<TData> {
      const { header, description, headerTooltip, cell: cellFn } = config;
      const meta: ColumnMeta = {};
      if (description) meta.description = description;
      if (headerTooltip) meta.headerTooltip = headerTooltip;

      return {
        id,
        header,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
        cell: cellFn as ColumnDef<TData>["cell"],
      };
    },

    /** Group of columns with optional derived column, sort, and view config */
    group(
      id: string,
      header: string,
      columns: ColumnDef<TData>[],
      config?: GroupConfig,
    ): ColumnGroup<TData> {
      return {
        id,
        header,
        columns,
        headerTooltip: config?.headerTooltip,
        derivedColumn: config?.derivedColumn,
        defaultSort: config?.defaultSort,
        view: config?.view,
      };
    },
  };
}

// ============================================================================
// Description Helpers - Unified tooltip formatting
// ============================================================================

type ScoreGuide = {
  threshold: string;
  meaning: string;
};

/**
 * Unified tooltip builder - works for both scores and categories.
 * Categories passed here will render with color dots automatically.
 */
export function tooltip(props: {
  title: string;
  description: string;
  citation?: string;
  range?: string;
  defaultValue?: string;
  guides?: ScoreGuide[];
  categories?: ReturnType<typeof categories>;
}) {
  return (
    <div className="space-y-2 text-left">
      <p>
        <strong>{props.title}:</strong> {props.description}
        {props.range && <> Range: {props.range}.</>}
        {props.defaultValue && <> (default: {props.defaultValue})</>}
        {props.citation && <> ({props.citation})</>}
      </p>
      {props.guides && props.guides.length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {props.guides.map((g, i) => (
            <li key={i}>
              <strong>{g.threshold}:</strong> {g.meaning}
            </li>
          ))}
        </ul>
      )}
      {props.categories && (
        <div className="space-y-1.5 text-sm">
          {props.categories.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0",
                  DOT_COLORS[item.color],
                )}
              />
              <span>
                <strong>{item.label}:</strong> {item.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
