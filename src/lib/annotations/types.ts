import type { JSX } from "react";

export type CellValue = string | number | undefined | null;
export type CellRenderer = (value: CellValue) => JSX.Element | undefined;
export type DataRecord = {
  total?: number;
  [key: string]: unknown;
};

export type ColumnItem = {
  key: number;
  header: string;
  accessor: string;
  tooltip: string | React.JSX.Element;
  biologicalContext?: JSX.Element | string;
  Cell?: CellRenderer;
  activity?: React.JSX.Element | undefined;
  renderType?: string;
  renderProps?: Record<string, unknown>;
};

export type ColumnsType = {
  name: string;
  slug: string;
  items: ColumnItem[];
};

export type AnnotationType = "variant" | "gene" | "protein";
export type VariantCategory =
  | "summary"
  | "global-annotation"
  | "single-cell-tissue";

export type GeneCategory =
  | "gene-level-annotation"
  | "SNV-summary"
  | "InDel-summary"
  | "tissue-specific"
  | "full-tables";

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      details?: string;
    };

export type FilteredItem = {
  value: CellValue | JSX.Element;
  percentile: string;
  proportion: string;
  key: number;
  header: string;
  accessor: string;
  tooltip: string | JSX.Element;
  activity?: JSX.Element | undefined;
  biologicalContext?: JSX.Element | string;
};

// Legacy alias for backward compatibility
export type VariantColumnsType = ColumnsType;
