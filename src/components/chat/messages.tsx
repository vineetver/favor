"use client";

import { useChat } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AnimatePresence } from "framer-motion";
import { memo } from "react";
import type { UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Greeting } from "./greeting";
import { PreviewMessage } from "./preview-message";
import { ThinkingMessage } from "./thinking-message";

type MessagesProps = {
  status: ReturnType<typeof useChat>["status"];
  messages: UIMessage[];
  regenerate: ReturnType<typeof useChat>["regenerate"];
  setInput: (input: string) => void;
  selectedModelId: string;
};

function PureMessages({ status, messages, regenerate, setInput, selectedModelId }: MessagesProps) {
  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.length === 0 && <Greeting setInput={setInput} />}

        {messages.map((message, index) => (
          <PreviewMessage
            isLoading={status === "streaming" && messages.length - 1 === index}
            key={message.id}
            message={message}
            regenerate={regenerate}
            selectedModelId={selectedModelId}
          />
        ))}

        <AnimatePresence mode="wait">
          {status === "submitted" && <ThinkingMessage key="thinking" />}
        </AnimatePresence>

        {status === "error" && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-destructive bg-destructive/10 rounded-md mx-4">
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <span>
              An error occurred during the API request, preventing successful
              completion.
            </span>
          </div>
        )}
      </ConversationContent>
    </Conversation>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (nextProps.status === 'streaming') {
    return false;
  }
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }

  return true;
});
