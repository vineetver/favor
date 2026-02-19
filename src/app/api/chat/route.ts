import { createAgentUIStreamResponse } from "ai";
import { createFavorAgent } from "@features/agent/agent";
import { appendAgentMessage } from "@features/agent/lib/agent-api";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, sessionId, synthesisModel } = await req.json();

  // Persist user message (write-ahead) — fire-and-forget, don't block streaming
  if (sessionId) {
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (lastUserMsg) {
      appendAgentMessage(sessionId, {
        role: "user",
        content: JSON.stringify(lastUserMsg),
      }).catch((err) => console.error("[chat/route] Failed to persist user message:", err));
    }
  }

  const agent = createFavorAgent(synthesisModel);

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: sessionId
      ? ({ responseMessage }) => {
          appendAgentMessage(sessionId, {
            role: "assistant",
            content: JSON.stringify(responseMessage),
          }).catch((err) =>
            console.error("[chat/route] Failed to persist assistant message:", err),
          );
        }
      : undefined,
  });
}
