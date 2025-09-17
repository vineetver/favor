"use client";

import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Action, Actions } from "@/components/ai-elements/actions";
import { ComponentType, Fragment, useState } from "react";
import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { CopyIcon, RefreshCcwIcon, RotateCcw, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Markdown } from "../ai-elements/markdown";
import { sanitizeText } from "@/lib/chatbot/utils";
import { ChatHeader } from "./chat-header";
import { Message, MessageContent } from "../ai-elements/message";
import { Greeting } from "./greeting";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { ChartRenderer } from "./chart-renderer";
import { ChatSDKError } from "@/lib/chatbot/errors";
import { toast } from "../ui/toast";

export const Chat = ({
  Close,
  selectedModelId,
}: {
  Close: ComponentType<{ onClick?: () => void }>;
  selectedModelId: string;
}) => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, regenerate, setMessages } = useChat(
    {
      onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
    }
  );

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
  
  console.log(messages)
  return (
    <div className="max-w-4xl mx-auto relative size-full p-1">
      <div className="flex flex-col h-full">
        <ChatHeader selectedModelId={selectedModelId} Close={Close} />

        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 && <Greeting setInput={setInput} />}
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Markdown>{sanitizeText(part.text)}</Markdown>
                            </MessageContent>
                          </Message>
                          {message.role === "assistant" && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );
                    case "reasoning":
                      return part.text?.trim() ? (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      ) : null;
                    default:
                      if (part.type?.startsWith('tool-')) {
                          const toolPart = part as any;
                          const defaultOpen = false;

                          return (
                            <Tool defaultOpen={defaultOpen}>
                              <ToolHeader type={part.type} state={toolPart.state || 'input-available'} />
                              <ToolContent>
                                {toolPart.input && (
                                  <ToolInput input={toolPart.input} />
                                )}
                                {(toolPart.state === 'output-available' || toolPart.state === 'output-error') && (
                                  <ToolOutput
                                    output={
                                      toolPart.output && typeof toolPart.output === 'object' ? (
                                        <>
                                          <details className="cursor-pointer">
                                            <summary className="text-xs font-medium text-muted-foreground mb-2">
                                              View Raw Data
                                            </summary>
                                            <pre className="text-xs overflow-x-auto bg-muted/50 p-2 rounded">
                                              <code>{JSON.stringify(toolPart.output, null, 2)}</code>
                                            </pre>
                                          </details>
                                        </>
                                      ) : (
                                        <Markdown>{String(toolPart.output || '')}</Markdown>
                                      )
                                    }
                                    errorText={toolPart.errorText}
                                  />
                                )}
                              </ToolContent>
                            </Tool>
                          );
                        }
                      return null;
                  }
                })}

                {/* Handle chart data from tool outputs */}
                {message.role === 'assistant' && message.parts?.map((part, index) => {
                  if (part.type?.startsWith('tool-') && (part as any).output?.type === 'chart') {
                    const toolPart = part as any;
                    return (
                      <ChartRenderer
                        key={`${message.id}-chart-${index}`}
                        type={toolPart.output.type}
                        chartType={toolPart.output.chartType}
                        data={toolPart.output.data}
                        config={toolPart.output.config}
                        metadata={toolPart.output.metadata}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="px-4 py-3">
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

            <div className="absolute bottom-3 left-4 p-3">
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Clear conversation"
                >
                  <RotateCcw size={16}  />
                </Button>
              )}
            </div>

            <div className="absolute bottom-3 right-4 p-2 w-fit flex flex-row justify-end">
              <PromptInputSubmit disabled={!input && !status} status={status} />
            </div>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};
