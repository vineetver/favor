"use client";

import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useState } from "react";
import type { AgentUIMessage } from "../agent";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@shared/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@shared/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@shared/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@shared/components/ai-elements/reasoning";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@shared/components/ai-elements/prompt-input";
import { Shimmer } from "@shared/components/ai-elements/shimmer";
import { Spinner } from "@shared/components/ui/spinner";
import { Button } from "@shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  CopyIcon,
  DnaIcon,
  SearchIcon,
  GitCompareArrowsIcon,
  FlaskConicalIcon,
  RouteIcon,
  CrosshairIcon,
  MenuIcon,
} from "lucide-react";
import { WorkspaceSidebar } from "./workspace-sidebar";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const transport = new DefaultChatTransport({ api: "/api/chat" });

const TOOL_TITLES: Record<string, string> = {
  searchEntities: "Search Entities",
  getEntityContext: "Entity Context",
  compareEntities: "Compare Entities",
  getRankedNeighbors: "Ranked Neighbors",
  runEnrichment: "Enrichment Analysis",
  findPaths: "Find Paths",
  getSharedNeighbors: "Shared Neighbors",
  lookupVariant: "Variant Lookup",
  getGeneVariantStats: "Gene Variant Stats",
  getGwasAssociations: "GWAS Associations",
  createCohort: "Create Cohort",
  analyzeCohort: "Analyze Cohort",
  graphTraverse: "Graph Traverse",
  variantBatchSummary: "Batch Summary",
};

function getToolTitle(type: string): string {
  const name = type.replace(/^tool-/, "");
  return TOOL_TITLES[name] ?? name.replace(/([A-Z])/g, " $1").trim();
}

const SUGGESTED_PROMPTS = [
  {
    text: "Tell me about the BRCA1 gene",
    icon: <DnaIcon className="size-4" />,
  },
  {
    text: "What genes are associated with Type 2 Diabetes?",
    icon: <SearchIcon className="size-4" />,
  },
  {
    text: "Look up variant rs7412",
    icon: <CrosshairIcon className="size-4" />,
  },
  {
    text: "Compare BRCA1 and TP53",
    icon: <GitCompareArrowsIcon className="size-4" />,
  },
  {
    text: "What pathways is EGFR involved in?",
    icon: <RouteIcon className="size-4" />,
  },
  {
    text: "Find drugs that target ALK",
    icon: <FlaskConicalIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Message Renderer
// ---------------------------------------------------------------------------

function ChatMessageRenderer({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) {
  // Consolidate reasoning parts into a single block
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;

  // Check if reasoning is currently streaming
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  const handleCopy = useCallback(() => {
    const textContent = message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n\n");
    navigator.clipboard.writeText(textContent);
  }, [message.parts]);

  const hasText = message.parts.some(
    (p) => p.type === "text" && p.text.trim()
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Reasoning block (consolidated from all reasoning parts) */}
        {hasReasoning && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* Message parts */}
        {message.parts.map((part, i) => {
          // Text parts → rendered as markdown
          if (part.type === "text") {
            if (!part.text.trim()) return null;
            return (
              <MessageResponse key={`text-${message.id}-${i}`}>
                {part.text}
              </MessageResponse>
            );
          }

          // Skip reasoning — already rendered above
          if (part.type === "reasoning") return null;

          // Tool parts → collapsible tool card
          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            const title = getToolTitle(part.type);

            return (
              <Tool
                key={part.toolCallId}
                defaultOpen={part.state === "output-error"}
              >
                {part.type === "dynamic-tool" ? (
                  <ToolHeader
                    type="dynamic-tool"
                    state={part.state}
                    toolName={toolName}
                    title={title}
                  />
                ) : (
                  <ToolHeader
                    type={part.type}
                    state={part.state}
                    title={title}
                  />
                )}
                <ToolContent>
                  <ToolInput input={part.input} />
                  {(part.state === "output-available" ||
                    part.state === "output-error") && (
                    <ToolOutput
                      output={part.output}
                      errorText={part.errorText}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          }

          return null;
        })}
      </MessageContent>

      {/* Actions toolbar for assistant messages with text content */}
      {message.role === "assistant" && hasText && !isStreaming && (
        <MessageActions>
          <MessageAction
            label="Copy"
            tooltip="Copy to clipboard"
            onClick={handleCopy}
          >
            <CopyIcon className="size-3.5" />
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <ConversationEmptyState>
      <div className="flex flex-col items-center gap-8 max-w-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-4">
            <DnaIcon className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            FAVOR-GPT
          </h1>
          <p className="text-muted-foreground text-sm text-center leading-relaxed max-w-md">
            AI-powered genomic knowledge graph exploration. Ask about genes,
            variants, diseases, drugs, pathways, and their relationships.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              type="button"
              onClick={() => onSelect(prompt.text)}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:border-border/80 hover:shadow-sm"
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground/60">
                {prompt.icon}
              </span>
              <span className="leading-relaxed">{prompt.text}</span>
            </button>
          ))}
        </div>
      </div>
    </ConversationEmptyState>
  );
}

// ---------------------------------------------------------------------------
// Chat Page
// ---------------------------------------------------------------------------

export function ChatPage() {
  const { messages, sendMessage, status } = useChat<AgentUIMessage>({
    transport,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text?.trim()) return;
      sendMessage({ text: message.text });
    },
    [sendMessage],
  );

  const handlePromptSelect = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage],
  );

  const handleSidebarMessage = useCallback(
    (text: string) => {
      sendMessage({ text });
      setSidebarOpen(false);
    },
    [sendMessage],
  );

  return (
    <div className="flex h-full w-full">
      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Workspace</SheetTitle>
          <WorkspaceSidebar onSendMessage={handleSidebarMessage} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-card">
        <WorkspaceSidebar onSendMessage={handleSidebarMessage} />
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header with menu toggle */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <DnaIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              FAVOR-GPT
            </span>
          </div>
        </div>

        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4">
            {messages.length === 0 ? (
              <EmptyState onSelect={handlePromptSelect} />
            ) : (
              <>
                {messages.map((message, index) => (
                  <ChatMessageRenderer
                    key={message.id}
                    message={message}
                    isLastMessage={index === messages.length - 1}
                    isStreaming={isStreaming}
                  />
                ))}

                {/* Thinking indicator while waiting for first token */}
                {isSubmitted && (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex items-center gap-2 text-sm">
                        <Spinner className="size-4 text-muted-foreground" />
                        <Shimmer duration={2}>Thinking...</Shimmer>
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input area */}
        <div className="border-t border-border bg-background px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Ask about genes, variants, diseases, drugs..."
                  disabled={isSubmitted}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <div />
                <PromptInputSubmit status={status} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}
