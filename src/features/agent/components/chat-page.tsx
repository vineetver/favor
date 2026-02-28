"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

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
  Suggestion,
  Suggestions,
} from "@shared/components/ai-elements/suggestion";
import {
  CopyIcon,
  DnaIcon,
  GitCompareArrowsIcon,
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
import { ActivityTimeline } from "./tool-renderers";
import { VizSpecPanel } from "./viz-spec-panel";
import type { AgentPlan, VizSpec, VariantTriageOutput, BioContextOutput } from "../types";
import type { BatchResultEntry } from "../tools/run-batch";
import { generateVizSpec } from "../viz";
import { useAgentChat } from "../hooks/use-agent-chat";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
      case "variantTriage":
        return ["Show the top pathogenic variants", "Bridge to knowledge graph"];
      case "bioContext":
        return ["What are the key intermediates?", "Explore a different path"];
    }
  }

  return ["Tell me more", "What else can you tell me?"];
}

// ---------------------------------------------------------------------------
// Contextual streaming status
// ---------------------------------------------------------------------------

const RS_PATTERN = /rs\d+/i;

function getContextualStatus(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "Searching knowledge graph...";

  const text = lastUser.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .toLowerCase();

  if (RS_PATTERN.test(text)) return "Looking up variant data...";
  if (text.includes("compare")) return "Setting up comparison...";
  if (text.includes("cohort")) return "Preparing cohort analysis...";
  if (text.includes("path") || text.includes("connect")) return "Tracing connections...";
  if (text.includes("enrich")) return "Running enrichment analysis...";
  if (text.includes("drug") || text.includes("target")) return "Exploring drug landscape...";
  return "Searching knowledge graph...";
}

// ---------------------------------------------------------------------------
// Message Renderer
// ---------------------------------------------------------------------------

const ChatMessageRenderer = memo(function ChatMessageRenderer({
  message,
  isLastMessage,
  isStreaming,
  contextualStatus,
  showReasoning,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  contextualStatus: string;
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

  // Stable fingerprint of tool parts — only changes when a tool is added or its
  // state transitions (e.g. input-available → output-available), NOT on every
  // text token during streaming.  This prevents cascading re-renders through
  // vizSpecs → chart components → ResponsiveContainer resize observer loops.
  const toolFingerprint = message.parts
    .filter(isToolUIPart)
    .map((p) => `${getToolName(p)}:${(p as Record<string, unknown>).state}`)
    .join("|");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allToolParts = useMemo(() =>
    message.parts.filter(isToolUIPart).map((p: any) => ({
      type: p.type as string,
      toolCallId: p.toolCallId as string | undefined,
      toolName: getToolName(p) as string,
      state: p.state as string | undefined,
      input: p.input as unknown,
      output: p.output as unknown,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toolFingerprint],
  );
  const hasToolParts = allToolParts.length > 0;

  // Extract plan output, streaming state, and non-plan tool parts — all memoized
  const { planOutput, isPlanStreaming, siblingToolParts } = useMemo(() => {
    let plan: AgentPlan | null = null;
    let planStreaming = false;
    const siblings: typeof allToolParts = [];

    for (const p of allToolParts) {
      const name = (p.toolName ?? "").replace(/^tool-/, "");
      if (name === "planQuery") {
        if (p.state === "output-available" && p.output) plan = p.output as AgentPlan;
        if (p.state === "input-available" || p.state === "input-streaming") planStreaming = true;
      } else {
        siblings.push(p);
      }
    }

    return { planOutput: plan, isPlanStreaming: planStreaming, siblingToolParts: siblings };
  }, [allToolParts]);

  // Extract vizSpecs — memoized to prevent infinite re-render loops in chart/network children
  const vizSpecs = useMemo(() => {
    const SPECIALIST = new Set(["bioContext", "variantTriage"]);
    const SKIP = new Set(["planQuery", "searchEntities", "recallMemories", "saveMemory", "getResultSlice", "listResults", "getGraphSchema", "getCohortSchema", "getEdgeDetail", "runBatch"]);

    return allToolParts.reduce<VizSpec[]>((acc, p, idx) => {
      const name = (p.toolName ?? "").replace(/^tool-/, "");
      if (p.state !== "output-available" || !p.output) return acc;

      if (SPECIALIST.has(name)) {
        const output = p.output as VariantTriageOutput | BioContextOutput;
        if (output.vizSpecs?.length) acc.push(...output.vizSpecs);
      } else if (name === "runBatch") {
        const batch = p.output as { results?: BatchResultEntry[] };
        for (const entry of batch.results ?? []) {
          if (entry.error || !entry.output) continue;
          const viz = generateVizSpec(entry.toolName, entry.output, entry.input ?? {}, acc.length);
          if (viz) acc.push(viz);
        }
      } else if (!SKIP.has(name)) {
        const input = (p.input ?? {}) as Record<string, unknown>;
        const viz = generateVizSpec(name, p.output, input, idx);
        if (viz) acc.push(viz);
      }
      return acc;
    }, []);
  }, [allToolParts]);

  const textSegments = useMemo(
    () =>
      message.parts
        .filter((p): p is Extract<typeof p, { type: "text" }> =>
          p.type === "text" && !!p.text.trim(),
        )
        .map((p, i) => ({ text: p.text, key: `text-${message.id}-${i}` })),
    [message.parts, message.id],
  );

  const hasText = textSegments.length > 0;

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

        {/* Streaming indicator before any tools appear */}
        {isLastMessage && isStreaming && !hasToolParts && textSegments.length === 0 && !hasReasoning && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <Shimmer duration={2}>{contextualStatus}</Shimmer>
          </div>
        )}

        {/* Activity timeline — flat status lines for all tool activity */}
        {hasToolParts && (
          <ActivityTimeline
            plan={planOutput}
            siblingToolParts={siblingToolParts}
            isStreaming={isLastMessage && isStreaming}
            isPlanStreaming={isPlanStreaming}
          />
        )}

        {/* Deterministic visualizations from tool results */}
        {vizSpecs.length > 0 && <VizSpecPanel vizSpecs={vizSpecs} />}

        {/* Final synthesis text */}
        {textSegments.map((seg) => (
          <MessageResponse key={seg.key}>{seg.text}</MessageResponse>
        ))}
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
});

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
                <div className="mx-auto w-full max-w-3xl space-y-6">
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
                        contextualStatus={getContextualStatus(messages)}
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
                      <Suggestions className="mt-1">
                        {getFollowUpSuggestions(messages).map((s) => (
                          <Suggestion
                            key={s}
                            suggestion={s}
                            onClick={send}
                          />
                        ))}
                      </Suggestions>
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
