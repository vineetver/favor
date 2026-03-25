import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/require-auth";

import { API_BASE } from "@/config/api";

/**
 * SSE proxy for ai-text streaming.
 * EventSource can't send custom headers, so we proxy through Next.js
 * to inject the API key server-side.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { error } = await requireAuth(_request);
  if (error) return error;

  const { requestId } = await params;

  const upstreamUrl = `${API_BASE}/ai-text/stream/${encodeURIComponent(requestId)}`;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };

  // Forward user's session cookie so the backend can scope the stream to the tenant.
  // Falls back to FAVOR_API_KEY only if cookies are unavailable (e.g., dev mode).
  const cookie = _request.headers.get("cookie");
  if (cookie) {
    headers["Cookie"] = cookie;
  } else {
    const apiKey = process.env.FAVOR_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SSE proxy not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const upstream = await fetch(upstreamUrl, { headers });

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `Stream request failed (${upstream.status})` }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
