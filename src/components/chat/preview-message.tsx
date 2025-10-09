"use client";

import { useChat } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo, Fragment } from "react";
import type { UIMessage } from "ai";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/ai-elements/markdown";
import { sanitizeText } from "@/lib/chatbot/utils";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ToolBarChart } from "./tool-bar-chart";

type PreviewMessageProps = {
  message: UIMessage;
  isLoading: boolean;
  regenerate: ReturnType<typeof useChat>["regenerate"];
  selectedModelId: string;
};

const PurePreviewMessage = ({
  message,
  isLoading,
  regenerate,
  selectedModelId,
}: PreviewMessageProps) => {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex w-full flex-col gap-2">
        {message.parts?.map((part, index) => {
          const key = `message-${message.id}-part-${index}`;

          if (part.type === "text") {
            return (
              <Fragment key={key}>
                <Message from={message.role}>
                  <MessageContent>
                    <Markdown>{sanitizeText(part.text)}</Markdown>
                  </MessageContent>
                </Message>
              </Fragment>
            );
          }

          if (part.type === "reasoning" && part.text?.trim()) {
            return (
              <Reasoning
                key={key}
                className="w-full"
                isStreaming={
                  isLoading &&
                  index === message.parts.length - 1
                }
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }

          if (part.type === "tool-barChart") {
            const toolPart = part as any;
            const toolState = (toolPart.state || "input-available") as "output-available" | "input-streaming" | "input-available" | "output-error";
            return (
              <ToolBarChart
                key={key}
                toolCallId={toolPart.toolCallId}
                state={toolState}
                input={toolPart.input}
                output={toolPart.output}
              />
            );
          }

          if (part.type?.startsWith("tool-")) {
            const toolPart = part as any;
            return (
              <Tool key={key} defaultOpen={false}>
                <ToolHeader type={part.type} state={toolPart.state || "input-available"} />
                <ToolContent>
                  {toolPart.input && <ToolInput input={toolPart.input} />}
                  {(toolPart.state === "output-available" ||
                    toolPart.state === "output-error") && (
                    <ToolOutput
                      output={
                        toolPart.output && typeof toolPart.output === "object" ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs font-medium text-muted-foreground mb-2">
                              View Raw Data
                            </summary>
                            <pre className="text-xs overflow-x-auto bg-muted/50 p-2 rounded">
                              <code>{JSON.stringify(toolPart.output, null, 2)}</code>
                            </pre>
                          </details>
                        ) : (
                          <Markdown>{String(toolPart.output || "")}</Markdown>
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
        })}

        {message.role === "assistant" && (
          <Actions className="mt-2">
            <Action onClick={() => regenerate({ body: { model: selectedModelId } })} label="Retry">
              <RefreshCcwIcon className="size-3" />
            </Action>
            <Action
              onClick={() => {
                const textParts = message.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("\n\n");
                navigator.clipboard.writeText(textParts);
              }}
              label="Copy"
            >
              <CopyIcon className="size-3" />
            </Action>
          </Actions>
        )}
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }
  if (!equal(prevProps.message.parts, nextProps.message.parts)) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }

  return true;
});
