export type HistoryKind = "search" | "view";

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  query?: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  genome?: string;
  hitCount: number;
  pinned: boolean;
  firstUsedAt: string;
  lastUsedAt: string;
}

export interface RecordHistoryBody {
  kind: HistoryKind;
  query?: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  genome?: string;
}

export interface ListHistoryParams {
  kind?: HistoryKind;
  limit?: number;
  pinned?: boolean;
  genome?: string;
}

export interface ListHistoryResponse {
  items: HistoryItem[];
  count: number;
}
