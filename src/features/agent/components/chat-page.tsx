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
  GitCompareArrowsIcon,
  FlaskConicalIcon,
  RouteIcon,
  CrosshairIcon,
  PanelLeftIcon,
  PillIcon,
  PlusIcon,
  Share2Icon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  XIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { AgentErrorBoundary } from "./error-boundary";
import { renderToolOutput, getToolInputSummary } from "./tool-renderers";
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
    text: "What pathways are enriched among the top genes linked to Alzheimer's disease?",
    icon: <Share2Icon className="size-4" />,
  },
  {
    text: "Find shared gene targets between rheumatoid arthritis and lupus — are any druggable?",
    icon: <PillIcon className="size-4" />,
  },
  {
    text: "Assess variant rs121913529 — what gene does it affect and what drugs target it?",
    icon: <CrosshairIcon className="size-4" />,
  },
  {
    text: "How are BRCA1 and PARP1 connected, and what diseases do they share?",
    icon: <RouteIcon className="size-4" />,
  },
  {
    text: "Compare TP53, EGFR, and KRAS — shared pathways, unique disease profiles, and variant burden",
    icon: <GitCompareArrowsIcon className="size-4" />,
  },
  {
    text: "Evaluate rs7412 and rs429358 together — how do their genes connect to lipid disorders?",
    icon: <DnaIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Follow-up suggestions
// ---------------------------------------------------------------------------

function getFollowUpSuggestions(messages: UIMessage[]): string[] {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return [];

  // Find the last tool used
  const toolParts = last.parts.filter((p) => isToolUIPart(p));
  const lastTool = toolParts.at(-1);

  if (lastTool) {
    const name = getToolName(lastTool).replace(/^tool-/, "");
    switch (name) {
      case "searchEntities":
        return ["Tell me more about the top result", "Compare the top results"];
      case "lookupVariant":
        return ["What GWAS associations does it have?", "What gene is this variant in?"];
      case "getEntityContext":
        return ["Find related pathways", "Show disease associations"];
      case "runEnrichment":
        return ["Explain the top enriched term", "What genes overlap?"];
      case "getGeneVariantStats":
        return ["Show pathogenic variants", "What are the GWAS associations?"];
      case "getRankedNeighbors":
        return ["Tell me about the top neighbor", "Find shared neighbors"];
      case "findPaths":
        return ["Explain the shortest path", "Are there alternative connections?"];
      case "getGwasAssociations":
        return ["Which trait has the strongest signal?", "Tell me about the top study"];
      case "compareEntities":
        return ["What do they have in common?", "Show unique connections for each"];
    }
  }

  return ["Tell me more", "What else can you tell me?"];
}

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
      {message.role === "assistant" && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <DnaIcon className="size-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            FAVOR-GPT
          </span>
        </div>
      )}
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
            const inputSummary = getToolInputSummary(toolName, part.input);

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
                    title={inputSummary ?? title}
                  />
                ) : (
                  <ToolHeader
                    type={part.type}
                    state={part.state}
                    title={inputSummary ?? title}
                  />
                )}
                <ToolContent>
                  <ToolInput input={part.input} />
                  {(part.state === "output-available" ||
                    part.state === "output-error") && (
                    <ToolOutput
                      output={part.output}
                      errorText={part.errorText}
                      renderOutput={(out) => renderToolOutput(toolName, out)}
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
          <MessageAction label="Good response" tooltip="Good response">
            <ThumbsUpIcon className="size-3.5" />
          </MessageAction>
          <MessageAction label="Bad response" tooltip="Bad response">
            <ThumbsDownIcon className="size-3.5" />
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
      <div className="flex flex-col items-center gap-8 max-w-2xl w-full px-4">
        <h2 className="text-foreground text-lg font-semibold text-center leading-snug tracking-tight max-w-md">
          Navigate the entire genomic landscape — from variant to phenotype — in seconds.
        </h2>

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
    newChat,
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
          <div className="flex flex-1 items-center gap-2">
            <DnaIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              FAVOR-GPT
            </span>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={newChat}
              className="text-muted-foreground"
            >
              <PlusIcon className="size-4" />
            </Button>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <DnaIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              FAVOR-GPT
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={newChat}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <PlusIcon className="size-4" />
            New Chat
          </Button>
        </div>

        <AgentErrorBoundary fallbackLabel="Chat error">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 pt-6 pb-4">
              {messages.length === 0 ? (
                <EmptyState onSelect={send} />
              ) : (
                <>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatMessageRenderer
                        message={message}
                        isLastMessage={index === messages.length - 1}
                        isStreaming={isStreaming}
                      />
                    </motion.div>
                  ))}

                  {/* Thinking indicator */}
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Message from="assistant">
                        <MessageContent>
                          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <Spinner className="size-4" />
                            <Shimmer duration={2}>Thinking...</Shimmer>
                          </div>
                        </MessageContent>
                      </Message>
                    </motion.div>
                  )}

                  {/* Follow-up suggestions */}
                  {!isStreaming &&
                    !isSubmitted &&
                    messages.length > 0 &&
                    messages.at(-1)?.role === "assistant" && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {getFollowUpSuggestions(messages).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => send(s)}
                            className="rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/25 hover:bg-primary/[0.03] hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
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
