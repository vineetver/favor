"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { useCallback, useState } from "react";

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
  PanelLeftIcon,
  XIcon,
} from "lucide-react";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { AgentErrorBoundary } from "./error-boundary";
import { useAgentChat } from "../hooks/use-agent-chat";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
    (p) => p.type === "text" && p.text.trim(),
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {hasReasoning && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text.trim()) return null;
            return (
              <MessageResponse key={`text-${message.id}-${i}`}>
                {part.text}
              </MessageResponse>
            );
          }

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
      <div className="flex flex-col items-center gap-10 max-w-2xl w-full px-4">
        {/* Branding */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-primary/[0.03]" />
            <div className="absolute -inset-5 rounded-full bg-primary/[0.06]" />
            <div className="relative rounded-2xl bg-primary/10 p-4 shadow-sm shadow-primary/5">
              <DnaIcon className="size-7 text-primary" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
              FAVOR-GPT
            </h1>
            <p className="text-muted-foreground text-[13px] text-center leading-relaxed max-w-sm">
              Explore genes, variants, diseases, drugs, and pathways through an
              AI-powered genomic knowledge graph.
            </p>
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              type="button"
              onClick={() => onSelect(prompt.text)}
              className="group/card flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 text-left text-[13px] text-muted-foreground transition-all duration-200 hover:border-primary/25 hover:bg-primary/[0.03] hover:text-foreground hover:shadow-sm"
            >
              <span className="shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground/60 transition-colors group-hover/card:bg-primary/10 group-hover/card:text-primary">
                {prompt.icon}
              </span>
              <span className="leading-snug">{prompt.text}</span>
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
  const {
    messages,
    status,
    isStreaming,
    isSubmitted,
    pastedVariantCount,
    submit,
    send,
    onPaste,
    createCohortFromPaste,
    dismissPaste,
  } = useAgentChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarMessage = useCallback(
    (text: string) => {
      send(text);
      setSidebarOpen(false);
    },
    [send],
  );

  return (
    <div className="flex h-full w-full">
      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Workspace</SheetTitle>
          <AgentErrorBoundary fallbackLabel="Sidebar error">
            <WorkspaceSidebar onSendMessage={handleSidebarMessage} />
          </AgentErrorBoundary>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[300px] shrink-0 flex-col bg-muted/50 border-r border-border">
        <AgentErrorBoundary fallbackLabel="Sidebar error">
          <WorkspaceSidebar onSendMessage={handleSidebarMessage} />
        </AgentErrorBoundary>
      </aside>

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col min-w-0 bg-background">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <DnaIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              FAVOR-GPT
            </span>
          </div>
        </div>

        <AgentErrorBoundary fallbackLabel="Chat error">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 pt-6 pb-4">
              {messages.length === 0 ? (
                <EmptyState onSelect={send} />
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

                  {/* Thinking indicator */}
                  {isSubmitted && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <Spinner className="size-4" />
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
        </AgentErrorBoundary>

        {/* Fade gradient above input */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background from-25% via-background/70 via-55% to-transparent" />

        {/* Input area */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-5 pt-1">
          <div className="mx-auto max-w-3xl">
            {/* Paste detection chip */}
            {pastedVariantCount > 0 && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
                <DnaIcon className="size-3.5 shrink-0 text-primary" />
                <span className="flex-1">
                  Variant list detected ({pastedVariantCount.toLocaleString()}{" "}
                  variants).
                </span>
                <button
                  type="button"
                  onClick={createCohortFromPaste}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create cohort
                </button>
                <button
                  type="button"
                  onClick={dismissPaste}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            )}

            <PromptInput
              onSubmit={submit}
              className="[&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:shadow-[0_2px_12px_rgba(0,0,0,0.08)] [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-card"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Ask about genes, variants, diseases, drugs..."
                  disabled={isSubmitted}
                  onPaste={onPaste}
                  className="min-h-12"
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-[11px] text-muted-foreground/50 select-none">
                  Press Enter to send
                </span>
                <PromptInputSubmit status={status} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}
