import type { ReactNode } from "react";
import type { CellContext, ColumnDef, AccessorFn } from "@tanstack/react-table";
import { ExternalLink } from "@/components/ui/external-link";
import { cn } from "@/lib/utils";

// ============================================================================
// Color System
// ============================================================================

// Badge styles for cells
export const BADGE_COLORS = {
  blue: "bg-blue-300/90 text-blue-950 hover:bg-blue-400 shadow-sm shadow-blue-500/10",
  red: "bg-red-300/90 text-red-950 hover:bg-red-400 shadow-sm shadow-red-500/10",
  green: "bg-green-300/90 text-green-950 hover:bg-green-400 shadow-sm shadow-green-500/10",
  indigo: "bg-indigo-300/90 text-indigo-950 hover:bg-indigo-400 shadow-sm shadow-indigo-500/10",
  lime: "bg-lime-300/90 text-lime-950 hover:bg-lime-400 shadow-sm shadow-lime-500/10",
  teal: "bg-teal-300/90 text-teal-950 hover:bg-teal-400 shadow-sm shadow-teal-500/10",
  cyan: "bg-cyan-300/90 text-cyan-950 hover:bg-cyan-400 shadow-sm shadow-cyan-500/10",
  yellow: "bg-yellow-300/90 text-yellow-950 hover:bg-yellow-400 shadow-sm shadow-yellow-500/10",
  rose: "bg-rose-300/90 text-rose-950 hover:bg-rose-400 shadow-sm shadow-rose-500/10",
  sky: "bg-sky-300/90 text-sky-950 hover:bg-sky-400 shadow-sm shadow-sky-500/10",
  orange: "bg-orange-300/90 text-orange-950 hover:bg-orange-400 shadow-sm shadow-orange-500/10",
  stone: "bg-stone-300/90 text-stone-950 hover:bg-stone-400 shadow-sm shadow-stone-500/10",
  amber: "bg-amber-300/90 text-amber-950 hover:bg-amber-400 shadow-sm shadow-amber-500/10",
  emerald: "bg-emerald-300/90 text-emerald-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/10",
  fuchsia: "bg-fuchsia-300/90 text-fuchsia-950 hover:bg-fuchsia-400 shadow-sm shadow-fuchsia-500/10",
  violet: "bg-violet-300/90 text-violet-950 hover:bg-violet-400 shadow-sm shadow-violet-500/10",
  purple: "bg-purple-300/90 text-purple-950 hover:bg-purple-400 shadow-sm shadow-purple-500/10",
  pink: "bg-pink-300/90 text-pink-950 hover:bg-pink-400 shadow-sm shadow-pink-500/10",
  gray: "bg-slate-300/90 text-slate-950 hover:bg-slate-400 shadow-sm shadow-slate-500/10",
} as const;

// Dot colors for tooltip legends (static classes for Tailwind)
export const DOT_COLORS: Record<BadgeColor, string> = {
  blue: "bg-blue-400",
  red: "bg-red-400",
  green: "bg-green-400",
  indigo: "bg-indigo-400",
  lime: "bg-lime-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  yellow: "bg-yellow-400",
  rose: "bg-rose-400",
  sky: "bg-sky-400",
  orange: "bg-orange-400",
  stone: "bg-stone-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  fuchsia: "bg-fuchsia-400",
  violet: "bg-violet-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
  gray: "bg-slate-400",
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
          : value === item.match
      );
    },
    /** Get the color for a value */
    getColor(value: string | null | undefined): BadgeColor {
      if (!value) return "gray";
      const match = items.find((item) =>
        item.match instanceof RegExp
          ? item.match.test(value)
          : value === item.match
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
                <span className={cn("w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0", DOT_COLORS[item.color])} />
                <span><strong>{item.label}:</strong> {item.description}</span>
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
export function Badge({ children, color }: { children: ReactNode; color: BadgeColor }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1.5 rounded-full font-medium transition-colors capitalize",
        BADGE_COLORS[color]
      )}
    >
      {children}
    </span>
  );
}

export const cell = {
  /** Plain text */
  text<TData>() {
    return ({ getValue }: CellContext<TData, unknown>) => {
      const v = getValue();
      return isEmpty(v) ? EMPTY : String(v);
    };
  },

  /** Decimal number with configurable precision */
  decimal<TData>(decimals = 3) {
    return ({ getValue }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (isNaN(num)) return EMPTY;
      return num.toFixed(decimals);
    };
  },

  /** Integer (whole number) */
  integer<TData>() {
    return ({ getValue }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (isNaN(num)) return EMPTY;
      return Math.round(num).toString();
    };
  },

  /** Percentage (multiplies by 100 and adds %) */
  percent<TData>(decimals = 1) {
    return ({ getValue }: CellContext<TData, number | string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const num = typeof v === "string" ? parseFloat(v) : v;
      if (isNaN(num)) return EMPTY;
      return `${(num * 100).toFixed(decimals)}%`;
    };
  },

  /** Colored badge based on category matching */
  badge<TData>(cats: ReturnType<typeof categories>, fallback: BadgeColor = "gray") {
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
    fallback: BadgeColor = "gray"
  ) {
    return ({ getValue }: CellContext<TData, string | null | undefined>) => {
      const v = getValue();
      if (isEmpty(v)) return EMPTY;
      const color = colorMap[v] ?? fallback;
      const label = labelMap?.[v] ?? v;
      return <Badge color={color}>{label.replace(/_/g, " ")}</Badge>;
    };
  },

  /** External link */
  link<TData, TValue>(urlFn: (value: TValue, row: TData) => string) {
    return ({ getValue, row }: CellContext<TData, TValue | null | undefined>) => {
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
    return ({ getValue, row }: CellContext<TData, TValue | null | undefined>) => {
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

/** View configuration for CategoryDataView */
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
  /** View configuration for CategoryDataView */
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
      config: AccessorColConfig<TData, TValue>
    ): ColumnDef<TData> {
      const { accessor, header, description, headerTooltip, sortable, sortDescFirst, cell: cellFn } = config;
      const meta: ColumnMeta = {};
      if (description) meta.description = description;
      if (headerTooltip) meta.headerTooltip = headerTooltip;
      if (sortable !== undefined) meta.sortable = sortable;
      if (sortDescFirst !== undefined) meta.sortDescFirst = sortDescFirst;

      return {
        id,
        accessorFn: typeof accessor === "function"
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
    group(id: string, header: string, columns: ColumnDef<TData>[], config?: GroupConfig): ColumnGroup<TData> {
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
              <span className={cn("w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0", DOT_COLORS[item.color])} />
              <span><strong>{item.label}:</strong> {item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
