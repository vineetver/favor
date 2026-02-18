import { createAgentUIStreamResponse } from "ai";
import { favorAgent } from "@features/agent/agent";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createAgentUIStreamResponse({
    agent: favorAgent,
    uiMessages: messages,
  });
}
