export interface AIText {
  id: string;
  entity_type: string;
  entity_id: string;
  content_type: string;
  content: string | null;
  model: string;
  prompt: string;
  status: string;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AITextResponse {
  data: AIText | null;
}

export interface AITextGenerateRequest {
  content_type: string;
  entity_id: string;
  entity_type: string;
  prompt: string;
  model?: string;
}

export type AITextGenerateResponse =
  | { status: "pending"; request_id: string; cached: false; estimated_seconds?: number; position?: number }
  | { status: "generating"; request_id: string; cached: false; estimated_seconds?: number }
  | { status: "completed"; request_id: string; cached: true; content: string }
  | { status: "failed"; request_id: string; cached: false; error?: string };

export type AITextStreamEvent =
  | { request_id: string; status: "pending" }
  | { request_id: string; status: "generating" }
  | { request_id: string; status: "completed"; content: string }
  | { request_id: string; status: "failed"; error: string };

export type VariantSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending"; requestId: string }
  | { status: "generating"; requestId: string; estimatedSeconds?: number }
  | { status: "completed"; summary: string; cachedAt?: string }
  | { status: "failed"; error: string };
