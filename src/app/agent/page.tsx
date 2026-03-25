import { ChatPage } from "@features/agent/components/chat-page";
import { RequireAuth } from "@shared/components/require-auth";

export default function AgentPage() {
  return (
    <RequireAuth>
      <ChatPage />
    </RequireAuth>
  );
}
