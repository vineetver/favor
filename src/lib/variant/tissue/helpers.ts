import type { Variant } from "@/lib/variant/api";
import type { CCRE } from "@/lib/variant/ccre/types";
import type { ABCScore, ABCPeaks } from "@/lib/variant/abc/api";
import type { Entex } from "@/lib/variant/entex/api";
import type { ScentTissue } from "@/lib/variant/scent/types";
import type { PGBoost } from "@/lib/variant/pgboost/types";

export interface CV2FTissueScore {
  tissue: string;
  score: number;
}

export function processTissueSpecificData(
  variant: Variant,
  ccreElements: CCRE[],
  ccreToggles: any[], // Not used for now
  abcScores: ABCScore[],
  abcPeaks: ABCPeaks[],
  entexData: Entex[],
  scentData: ScentTissue[],
  pgboostData: PGBoost[],
) {
  // Process cCRE regulatory types
  const ccre_regulatory_types_set = new Set(
    ccreElements
      .filter(
        (item) =>
          item.annotations === "PLS" ||
          item.annotations === "pELS" ||
          item.annotations === "dELS",
      )
      .map((item) => item.annotations),
  );
  const ccre_regulatory_types = Array.from(ccre_regulatory_types_set);

  // Process ABC target genes and max score
  const abc_target_genes_set = new Set(
    abcScores
      .filter((item) => item && item.abc_score != null && item.abc_score > 0.02)
      .map((item) => item.gene_name)
      .filter(Boolean),
  );
  const abc_target_genes = Array.from(abc_target_genes_set);

  const abc_max_score = Math.max(
    0,
    ...abcScores
      .filter((item) => item && item.abc_score != null)
      .map((item) => item.abc_score),
  );

  // Process ENTEx imbalanced tissues
  const entex_imbalanced_tissues_set = new Set(
    entexData
      .filter(
        (item) =>
          item &&
          (item.imbalance_significance >= 0.5 ||
            (item.p_betabinom && item.p_betabinom <= 0.05)),
      )
      .map((item) => item.tissue)
      .filter(Boolean),
  );
  const entex_imbalanced_tissues = Array.from(entex_imbalanced_tissues_set);

  // Process SCENT tissues
  const scent_tissues_set = new Set(
    scentData.map((item) => item?.tissue).filter(Boolean),
  );
  const scent_tissues = Array.from(scent_tissues_set);

  // Process PGBoost high-confidence genes (top 10% = 90th percentile)
  const pgboost_high_confidence_genes = pgboostData
    .filter(
      (item) =>
        item &&
        item.pg_boost_percentile != null &&
        item.pg_boost_percentile >= 0.9,
    )
    .map((item) => item.gene)
    .filter(Boolean)
    .slice(0, 10); // Limit to top 10

  // Note: CV2F data would come from a separate source, placeholder for now
  const cv2f_significant_tissues: CV2FTissueScore[] = [];

  return {
    ccre_regulatory_types,
    abc_target_genes,
    abc_max_score: abc_max_score > 0 ? abc_max_score : undefined,
    cv2f_significant_tissues,
    entex_imbalanced_tissues,
    scent_tissues,
    pgboost_high_confidence_genes,
  };
}
