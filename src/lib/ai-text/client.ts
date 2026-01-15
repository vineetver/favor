import type {
  AITextGenerateRequest,
  AITextGenerateResponse,
  AITextResponse,
  AITextStreamEvent,
} from "./types";

const AI_TEXT_API_BASE = "http://localhost:8000/api/v1/ai-text";

export async function getAIText(params: {
  entity_type: string;
  entity_id: string;
  content_type: string;
}): Promise<AITextResponse> {
  const searchParams = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    content_type: params.content_type,
  });

  const response = await fetch(`${AI_TEXT_API_BASE}?${searchParams}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { data: null };
    }
    throw new Error(`Failed to fetch AI text: ${response.status}`);
  }

  return response.json();
}

export async function generateAIText(
  request: AITextGenerateRequest,
): Promise<AITextGenerateResponse> {
  const response = await fetch(`${AI_TEXT_API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate AI text: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function subscribeToStream(
  requestId: string,
  onEvent: (event: AITextStreamEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  const eventSource = new EventSource(
    `${AI_TEXT_API_BASE}/stream/${requestId}`,
  );

  eventSource.addEventListener("status", (event) => {
    try {
      const data = JSON.parse(event.data) as AITextStreamEvent;
      onEvent(data);

      if (data.status === "completed" || data.status === "failed") {
        eventSource.close();
      }
    } catch (error) {
      onError?.(new Error(`Failed to parse SSE event: ${error}`));
    }
  });

  eventSource.onerror = () => {
    onError?.(new Error("SSE connection error"));
    eventSource.close();
  };

  return () => eventSource.close();
}
