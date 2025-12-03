import type { ReactNode } from "react";
import type { Variant } from "@/lib/genohub/hg38/types";

export interface ColumnItem {
  key: number;
  header: string;
  accessor: keyof Variant;
  tooltip?: ReactNode;
  Cell?: (value: any) => ReactNode;
  activity?: ReactNode;
}

export interface VariantColumnsType {
  name: string;
  slug: string;
  items: ColumnItem[];
}
