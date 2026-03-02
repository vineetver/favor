"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
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
  PanelLeftIcon,
  PlusIcon,
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
import { EmptyState } from "./empty-state";
import { VizSpecPanel } from "./viz-spec-panel";
import type { AgentPlan, VizSpec, VariantTriageOutput, BioContextOutput } from "../types";
import { isArtifactRef } from "../lib/compact-message";
import { generateVizSpecs } from "../viz";
import { useAgentChat } from "../hooks/use-agent-chat";

// ---------------------------------------------------------------------------
// Follow-up suggestions
// ---------------------------------------------------------------------------

function getFollowUpSuggestions(messages: UIMessage[]): string[] {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return [];

  const toolParts = last.parts.filter((p) => isToolUIPart(p));
  const lastTool = toolParts.at(-1);

  if (lastTool) {
    const name = getToolName(lastTool).replace(/^tool-/, "");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (lastTool as any).args as Record<string, unknown> | undefined;

    switch (name) {
      case "Run": {
        const command = args?.command as string | undefined;
        const mode = args?.mode as string | undefined;
        if (command === "explore" && mode === "neighbors")
          return ["Run enrichment on the top genes", "Tell me about the top-ranked result"];
        if (command === "explore" && mode === "compare")
          return ["Run enrichment on the shared genes", "Show unique associations for each"];
        if (command === "explore" && mode === "enrich")
          return ["Which genes drive the top enriched term?", "Explore the most significant pathway"];
        if (command === "traverse" && mode === "chain")
          return ["Explore the next hop", "Summarize the chain"];
        if (command === "traverse" && mode === "paths")
          return ["What diseases do they share?", "Are there alternative connections?"];
        if (command === "query")
          return ["Refine this pattern", "Show details for the top matches"];
        if (command === "rows")
          return ["Filter to pathogenic variants only", "Group by clinical significance"];
        if (command === "groupby")
          return ["Drill into the largest group", "Visualize this distribution"];
        if (command === "create_cohort")
          return ["Show me the cohort schema", "Rank variants by CADD score"];
        if (command === "derive")
          return ["Summarize the derived cohort", "Compare with the parent"];
        if (command === "prioritize" || command === "compute")
          return ["Explore the top-ranked genes in the graph", "Export these results"];
        if (command === "analytics")
          return ["Visualize the results", "What do these results mean?"];
        return ["Tell me more about these results", "What else can we explore?"];
      }
      case "Search":
        return ["Get details on the top result", "Search for something related"];
      case "Read":
        return ["What does this data tell us?", "Summarize the key findings"];
      case "State":
        return ["What can I do with the active cohort?", "Show me available analyses"];
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

  // Extract vizSpecs — prefer persisted _vizSpecs from compacted messages,
  // fall back to generating from tool outputs (live streaming or legacy messages).
  // IMPORTANT: `message` must NOT be a dependency here — it changes on every
  // streaming token, which would produce a new vizSpecs array on every render,
  // bypassing VizSpecPanel memo and triggering Recharts ResizeObserver loops.
  const persistedVizSpecs = useMemo(
    () => (message as unknown as Record<string, unknown>)._vizSpecs as VizSpec[] | undefined,
    // message.id is stable for the lifetime of a message — _vizSpecs is set once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message.id],
  );

  const vizSpecs = useMemo(() => {
    if (persistedVizSpecs?.length) return persistedVizSpecs;

    const SPECIALIST = new Set(["bioContext", "variantTriage"]);
    const SKIP = new Set(["planQuery", "searchEntities", "recalMemories", "saveMemory", "getResultSlice", "listResults", "getGraphSchema", "getCohortSchema", "getEdgeDetail", "runBatch"]);

    return allToolParts.reduce<VizSpec[]>((acc, p, idx) => {
      const name = (p.toolName ?? "").replace(/^tool-/, "");
      if (p.state !== "output-available" || !p.output) return acc;

      // Skip artifact refs — no data to generate from
      if (isArtifactRef(p.output)) return acc;

      if (SPECIALIST.has(name)) {
        const output = p.output as VariantTriageOutput | BioContextOutput;
        if (output.vizSpecs?.length) acc.push(...output.vizSpecs);
      } else if (name === "runBatch") {
        const batch = p.output as { results?: Array<{ toolName: string; input?: Record<string, unknown>; output?: unknown; error?: boolean }> };
        for (const entry of batch.results ?? []) {
          if (entry.error || !entry.output) continue;
          const vizResults = generateVizSpecs(entry.toolName, entry.output, entry.input ?? {}, acc.length);
          acc.push(...vizResults);
        }
      } else if (!SKIP.has(name)) {
        const input = (p.input ?? {}) as Record<string, unknown>;
        const vizResults = generateVizSpecs(name, p.output, input, idx);
        acc.push(...vizResults);
      }
      return acc;
    }, []);
  }, [allToolParts, persistedVizSpecs]);

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
