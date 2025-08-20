import type { GWAS, EfoNode } from "@/lib/variant/gwas/api";

export interface ProcessedGwasData extends GWAS {
  category: string;
  xValue: number;
  yValue: number;
  originalYValue: number;
  isAboveCutoff: boolean;
  radius: number;
  effectSize: number;
  uniqueKey: string;
}

export interface GwasTableColumn {
  key: keyof GWAS;
  label: string;
  tooltip: string;
}

export interface GwasTooltipData {
  rsid: string;
  gwas_disease_trait: string;
  category: string;
  gwas_p_value: string;
  yValue: number;
  originalYValue?: number;
  gwas_risk_allele_frequency: string;
  gwas_or_or_beta?: string | null;
  gwas_mapped_gene?: string;
  isAboveCutoff?: boolean;
  uniqueKey?: string;
}

export interface GwasTableProps {
  data: ProcessedGwasData[];
  hoveredRow?: string | null;
  hoveredPoint?: string | null;
  selectedPoint?: string | null;
  onRowHover?: (key: string | null) => void;
  onPointClick?: (uniqueKey: string) => void;
  className?: string;
}

export interface GwasChartInteractionState {
  hoveredRow: string | null;
  hoveredPoint: string | null;
  selectedPoint: string | null;
  selectedCategory: string | null;
}

export interface CategoryProcessingResult {
  processed: ProcessedGwasData[];
  categories: string[];
}

export interface JitterConfig {
  amount: number;
  ySpread: number;
  xSpread: number;
}

export interface ChartDimensions {
  width: string | number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
