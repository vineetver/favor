"use client";

import { ComponentType } from "react";
import { useChat } from "@ai-sdk/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { ChatHeader } from "./chat-header";
import { Messages } from "./messages";

export const Chat = ({
  Close,
  selectedModelId,
  messages,
  sendMessage,
  status,
  regenerate,
  setMessages,
  input,
  setInput,
}: {
  Close: ComponentType<{ onClick?: () => void }>;
  selectedModelId: string;
  messages: ReturnType<typeof useChat>["messages"];
  sendMessage: ReturnType<typeof useChat>["sendMessage"];
  status: ReturnType<typeof useChat>["status"];
  regenerate: ReturnType<typeof useChat>["regenerate"];
  setMessages: ReturnType<typeof useChat>["setMessages"];
  input: string;
  setInput: (input: string) => void;
}) => {

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: selectedModelId,
        },
      },
    );
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto relative size-full p-1">
      <div className="flex flex-col h-full">
        <ChatHeader selectedModelId={selectedModelId} Close={Close} />

        <Messages
          messages={messages}
          regenerate={regenerate}
          setInput={setInput}
          status={status}
          selectedModelId={selectedModelId}
        />

        <div className="px-4">
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4"
            globalDrop
            multiple
          >
            <PromptInputBody className="pb-2.5">
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
            </PromptInputBody>

            <div className="absolute bottom-0 left-4 p-3">
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  title="Clear conversation"
                >
                  <RotateCcw size={16}  />
                </Button>
              )}
            </div>

            <div className="absolute bottom-3 right-4 p-2 w-fit flex flex-row justify-end">
              <PromptInputSubmit disabled={!input} status={status} />
            </div>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};
