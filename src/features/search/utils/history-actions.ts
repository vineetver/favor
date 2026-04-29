import type { EntityType } from "../types/api";
import type { HistoryItem } from "../types/history";
import { getEntityUrl, hasEntityPage } from "./entity-routes";

/** Resolve the URL for a history item (entity-resolved or null for free-text). */
export function getHistoryItemUrl(
  item: HistoryItem,
  genome: "hg38" | "hg19" = "hg38",
): string | null {
  const eType = item.entityType as EntityType | undefined;
  if (!eType || !item.entityId || !hasEntityPage(eType)) return null;
  return getEntityUrl(eType, item.entityId, { genome });
}
