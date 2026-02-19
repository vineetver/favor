"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

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
  ToolInput,
  ToolOutput,
} from "@shared/components/ai-elements/tool";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
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
  ChevronDownIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@shared/components/ui/select";
import {
  AVAILABLE_SYNTHESIS_MODELS,
  type SynthesisModelId,
} from "../lib/models";
import { motion } from "motion/react";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { AgentErrorBoundary } from "./error-boundary";
import {
  renderToolOutput,
  getToolInputSummary,
  PlanRenderer,
} from "./tool-renderers";
import type { ReportPlanOutput } from "../types";
import { useAgentChat } from "../hooks/use-agent-chat";
import { addStoredCohort } from "../lib/cohort-store";

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
  getConnections: "Direct Connections",
  getEdgeDetail: "Edge Detail",
  graphTraverse: "Graph Traverse",
  getGraphSchema: "Graph Schema",
  variantBatchSummary: "Batch Summary",
  recallMemories: "Recall Memories",
  saveMemory: "Save Memory",
  reportPlan: "Analysis Plan",
  graphExplorer: "Graph Explorer",
  variantAnalyzer: "Variant Analyzer",
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
    text: "Look up variant rs429358 — pathogenicity scores, population frequencies, and GWAS trait associations",
    icon: <CrosshairIcon className="size-4" />,
  },
  {
    text: "What genes does metformin target, and do any overlap with type 2 diabetes risk genes?",
    icon: <PillIcon className="size-4" />,
  },
  {
    text: "How are BRCA1 and PARP1 connected? Trace the shortest paths and shared disease associations.",
    icon: <RouteIcon className="size-4" />,
  },
  {
    text: "Compare TP53, BRCA2, and ATM — shared pathways, disease overlap, and variant burden",
    icon: <GitCompareArrowsIcon className="size-4" />,
  },
  {
    text: "Create a cohort from rs429358, rs7412, rs75932628, rs63750847, rs143332484 — rank by CADD score and summarize by consequence type",
    icon: <DnaIcon className="size-4" />,
  },
];

// ---------------------------------------------------------------------------
// Compact status dot for grouped tool rows
// ---------------------------------------------------------------------------

function StatusDot({ state }: { state: string }) {
  if (state === "output-available") {
    return <span className="size-2 rounded-full bg-emerald-500 shrink-0" />;
  }
  if (state === "output-error") {
    return <span className="size-2 rounded-full bg-destructive shrink-0" />;
  }
  if (state === "input-available" || state === "input-streaming") {
    return (
      <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
    );
  }
  return <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Compact tool activity group — renders N tool calls in one container
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolActivityGroup({ tools }: { tools: Array<{ part: any; index: number }> }) {
  return (
    <div className="not-prose rounded-lg border border-border/80 bg-card overflow-hidden">
      {tools.map(({ part }, ti) => {
        const toolName = getToolName(part);
        const cleanName = toolName.replace(/^tool-/, "");
        const inputSummary = getToolInputSummary(toolName, part.input);
        const title = getToolTitle(part.type);
        const isError = part.state === "output-error";

        return (
          <Collapsible key={part.toolCallId} defaultOpen={isError}>
            <CollapsibleTrigger className="group/row flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-accent/40 border-b border-border/40 last:border-b-0">
              <StatusDot state={part.state} />
              <span className="flex-1 text-left truncate font-medium text-muted-foreground">
                {inputSummary ?? title}
              </span>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/row:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-b border-border/40 last:border-b-0">
              <div className="space-y-3 bg-muted/20 p-3">
                <ToolInput input={part.input} />
                {(part.state === "output-available" ||
                  part.state === "output-error") && (
                  <ToolOutput
                    output={part.output}
                    errorText={part.errorText}
                    renderOutput={(out) => renderToolOutput(toolName, out)}
                  />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Part grouping — clusters consecutive tool parts together
// ---------------------------------------------------------------------------

type MessageSegment =
  | { kind: "text"; text: string; key: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { kind: "plan"; part: any; key: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { kind: "tools"; parts: Array<{ part: any; index: number }>; key: string };

function segmentMessageParts(message: UIMessage): MessageSegment[] {
  const segments: MessageSegment[] = [];

  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];

    if (part.type === "text") {
      if (part.text.trim()) {
        segments.push({ kind: "text", text: part.text, key: `text-${message.id}-${i}` });
      }
      continue;
    }

    if (part.type === "reasoning") continue;

    if (isToolUIPart(part)) {
      const name = getToolName(part).replace(/^tool-/, "");

      if (name === "reportPlan" && (part as { output?: unknown }).output) {
        segments.push({ kind: "plan", part, key: `plan-${(part as { toolCallId?: string }).toolCallId}` });
        continue;
      }

      // Append to existing tool group or start a new one
      const last = segments.at(-1);
      if (last?.kind === "tools") {
        last.parts.push({ part, index: i });
      } else {
        segments.push({
          kind: "tools",
          parts: [{ part, index: i }],
          key: `tg-${(part as { toolCallId?: string }).toolCallId}`,
        });
      }
    }
  }

  return segments;
}

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
        return ["Get detailed context on the top result", "Compare the top results"];
      case "lookupVariant":
        return ["Show GWAS trait associations for this variant", "What pathogenicity scores does it have?"];
      case "getEntityContext":
        return ["What pathways is this gene in?", "Find ranked disease associations"];
      case "runEnrichment":
        return ["Explain the top enriched term", "Which genes drive the enrichment?"];
      case "getGeneVariantStats":
        return ["Show the most pathogenic variants by CADD", "Create a cohort from these variants"];
      case "getRankedNeighbors":
        return ["Run enrichment on the top genes", "Tell me about the top-ranked result"];
      case "findPaths":
        return ["What diseases do they share?", "Are there alternative connections?"];
      case "getGwasAssociations":
        return ["Which trait has the strongest signal?", "Look up the gene this variant affects"];
      case "compareEntities":
        return ["Run pathway enrichment on the shared genes", "Show variant burden for each"];
      case "createCohort":
        return ["Rank variants by CADD score", "Summarize by clinical significance"];
      case "analyzeCohort":
        return ["Filter to pathogenic variants only", "Which genes carry the most variants?"];
      case "graphExplorer":
        return ["What are the key intermediates?", "Explore a different path"];
      case "variantAnalyzer":
        return ["Show the top pathogenic variants", "Bridge to knowledge graph"];
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
  showReasoning,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  showReasoning: boolean;
}) {
  // Consolidate reasoning parts into a single block
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const hasReasoning = showReasoning && reasoningParts.length > 0;

  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    showReasoning && isLastMessage && isStreaming && lastPart?.type === "reasoning";

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

  // Pre-compute sibling tool parts for PlanRenderer.
  // Only include tools AFTER the reportPlan part — resolve-phase tools
  // (searchEntities, recallMemories) that run in parallel with the plan
  // shouldn't affect plan step status.
  const reportPlanIndex = message.parts.findIndex(
    (p) =>
      isToolUIPart(p) &&
      getToolName(p).replace(/^tool-/, "") === "reportPlan",
  );
  const siblingToolParts = message.parts
    .filter(
      (p, i) =>
        (reportPlanIndex === -1 || i > reportPlanIndex) &&
        isToolUIPart(p) &&
        getToolName(p).replace(/^tool-/, "") !== "reportPlan",
    )
    .map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tp = p as any;
      return {
        type: tp.type as string,
        toolCallId: tp.toolCallId as string | undefined,
        toolName: getToolName(tp),
        state: tp.state as string | undefined,
      };
    });

  const segments = segmentMessageParts(message);

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

        {/* Show activity indicator when streaming but no visible content yet */}
        {isLastMessage && isStreaming && segments.length === 0 && !hasReasoning && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <Shimmer duration={2}>Analyzing query...</Shimmer>
          </div>
        )}

        {segments.map((seg) => {
          if (seg.kind === "text") {
            return (
              <MessageResponse key={seg.key}>{seg.text}</MessageResponse>
            );
          }

          if (seg.kind === "plan") {
            return (
              <PlanRenderer
                key={seg.key}
                plan={seg.part.output as ReportPlanOutput}
                siblingToolParts={siblingToolParts}
              />
            );
          }

          if (seg.kind === "tools") {
            return (
              <ToolActivityGroup key={seg.key} tools={seg.parts} />
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
      <div className="flex flex-col items-center gap-10 w-full max-w-4xl px-4">
        <h2 className="text-foreground text-lg font-semibold text-center leading-snug tracking-tight max-w-md">
          Navigate the entire genomic landscape — from variant to phenotype — in seconds.
        </h2>

        {/* Suggested prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              type="button"
              onClick={() => onSelect(prompt.text)}
              className="group/card flex items-start gap-3.5 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-[13px] leading-relaxed text-muted-foreground transition-all duration-200 hover:border-primary/25 hover:bg-primary/[0.03] hover:text-foreground hover:shadow-sm"
            >
              <span className="mt-0.5 shrink-0 rounded-xl bg-muted p-2 text-muted-foreground/60 transition-colors group-hover/card:bg-primary/10 group-hover/card:text-primary">
                {prompt.icon}
              </span>
              <span>{prompt.text}</span>
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
    sessionId,
    synthesisModel,
    setSynthesisModel,
    pastedVariantCount,
    submit,
    send,
    onPaste,
    createCohortFromPaste,
    dismissPaste,
    newChat,
    loadSession,
  } = useAgentChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Defer Radix Select rendering to avoid hydration mismatch (server/client ID divergence)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Track which cohort IDs we've already persisted to sidebar
  const persistedCohortIds = useRef(new Set<string>());

  // Auto-persist agent-created cohorts to the sidebar
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (
          isToolUIPart(part) &&
          getToolName(part).replace(/^tool-/, "") === "createCohort" &&
          part.state === "output-available" &&
          part.output &&
          typeof part.output === "object" &&
          "cohortId" in (part.output as Record<string, unknown>)
        ) {
          const out = part.output as {
            cohortId: string;
            variantCount: number;
            summary?: string;
          };
          if (!persistedCohortIds.current.has(out.cohortId)) {
            persistedCohortIds.current.add(out.cohortId);
            addStoredCohort({
              cohortId: out.cohortId,
              label: `Cohort (${out.variantCount.toLocaleString()} variants)`,
              variantCount: out.variantCount,
              source: "agent",
              createdAt: new Date().toISOString(),
              sessionIds: sessionId ? [sessionId] : [],
            });
          }
        }
      }
    }
  }, [messages, sessionId]);

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
            <WorkspaceSidebar
              onSendMessage={handleSidebarMessage}
              sessionId={sessionId}
              onLoadSession={loadSession}
              onNewChat={newChat}
            />
          </AgentErrorBoundary>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[300px] shrink-0 flex-col bg-muted/40 border-r border-border">
        <AgentErrorBoundary fallbackLabel="Sidebar error">
          <WorkspaceSidebar
              onSendMessage={handleSidebarMessage}
              sessionId={sessionId}
              onLoadSession={loadSession}
              onNewChat={newChat}
            />
        </AgentErrorBoundary>
      </aside>

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col min-w-0 bg-background">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border lg:hidden">
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
        <div className="hidden lg:flex items-center justify-between px-6 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <DnaIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              FAVOR-GPT
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mounted ? (
              <Select
                value={synthesisModel}
                onValueChange={(v) => setSynthesisModel(v as SynthesisModelId)}
              >
                <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-2 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground focus:ring-0">
                  <span>
                    {AVAILABLE_SYNTHESIS_MODELS.find(
                      (m) => m.id === synthesisModel,
                    )?.label ?? "Fast"}
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={4}>
                  {AVAILABLE_SYNTHESIS_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.label}
                      <span className="ml-1.5 text-muted-foreground">
                        {m.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="h-7 px-2 text-[11px] font-medium text-muted-foreground inline-flex items-center">
                {AVAILABLE_SYNTHESIS_MODELS.find(
                  (m) => m.id === synthesisModel,
                )?.label ?? "Fast"}
              </span>
            )}
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
        </div>

        <AgentErrorBoundary fallbackLabel="Chat error">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 pb-4">
              {messages.length === 0 ? (
                <EmptyState onSelect={send} />
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message, index) => (
                    <motion.div
                      key={message.id || `msg-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatMessageRenderer
                        message={message}
                        isLastMessage={index === messages.length - 1}
                        isStreaming={isStreaming}
                        showReasoning={synthesisModel === "thinking"}
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
                </div>
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
