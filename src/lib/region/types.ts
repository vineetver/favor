// Reuse gene types for regions since they have similar structure
export type {
  GeneLevelAnnotation as RegionAnnotation,
  GeneSummary as RegionSummary,
  Summary,
  Gene as RegionVariant
} from "@/lib/gene/types";

// Additional region-specific types if needed
export interface RegionInfo {
  chromosome: string;
  start: number;
  end: number;
  size: number;
}