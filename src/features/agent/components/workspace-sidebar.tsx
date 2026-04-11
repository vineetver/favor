"use client";

import { deleteCohort } from "@features/batch/api";
import { useCohorts } from "@features/batch/hooks/use-cohorts";
import type { CohortListItem } from "@features/batch/types";
import { cn } from "@infra/utils";
import { QuotaBar } from "@shared/components/quota-bar";
import { Button } from "@shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { useQuotas } from "@shared/hooks/use-quotas";
import {
  ChevronRightIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useSessions } from "../hooks/use-sessions";
import { CohortPromptPicker } from "./cohort-prompt-picker";
import { VariantSubmitPanel } from "./variant-submit-panel";
import {
  RESOURCE_VIEWER_CLOSED,
  ResourceViewer,
  type ResourceViewerState,
  WorkspaceTree,
} from "./workspace-tree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Collapsible section (kept for conversations)
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRightIcon className="size-3 transition-transform duration-200 group-data-[state=open]:rotate-90" />
        <span className="flex-1 text-left">{title}</span>
        {count != null && count > 0 && (
          <span className="size-7 flex items-center justify-center text-[10px] font-medium tabular-nums">
            {count}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceSidebar
// ---------------------------------------------------------------------------

interface WorkspaceSidebarProps {
  onSendMessage: (text: string) => void;
  sessionId: string | null;
  onLoadSession: (id: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function WorkspaceSidebar({
  onSendMessage,
  sessionId,
  onLoadSession,
  onNewChat,
  className,
}: WorkspaceSidebarProps) {
  const [showSubmit, setShowSubmit] = useState(false);

  // ---- Sessions ----
  const {
    sessions,
    isLoading: sessionsLoading,
    deleteSession,
    refetch: refetchSessions,
  } = useSessions();

  // ---- Quotas ----
  const { quotas } = useQuotas();

  // ---- Cohorts (for prompt picker + tree deletion) ----
  const { cohorts, refetch: refetchCohorts } = useCohorts();

  const handleCohortCreated = useCallback(() => {
    refetchCohorts();
  }, [refetchCohorts]);

  const handleCohortRemoved = useCallback(
    (cohortId: string) => {
      deleteCohort(cohortId)
        .then(() => refetchCohorts())
        .catch(() => {});
    },
    [refetchCohorts],
  );

  // ---- Cohort prompt picker ----
  const [selectedCohort, setSelectedCohort] = useState<CohortListItem | null>(
    null,
  );

  const handleNewCohortConversation = useCallback((cohort: CohortListItem) => {
    setSelectedCohort(cohort);
  }, []);

  const handleCohortPromptSend = useCallback(
    (message: string) => {
      onNewChat();
      onSendMessage(message);
      setSelectedCohort(null);
      setShowSubmit(false);
    },
    [onSendMessage, onNewChat],
  );

  const handleAnalyzeCohort = useCallback(
    (cohortId: string) => {
      const cohort = cohorts.find((c) => c.id === cohortId);
      if (cohort) handleNewCohortConversation(cohort);
    },
    [cohorts, handleNewCohortConversation],
  );

  const handleDeleteSession = useCallback(
    (deletedSessionId: string) => {
      deleteSession(deletedSessionId);
      if (deletedSessionId === sessionId) {
        onNewChat();
      }
    },
    [deleteSession, sessionId, onNewChat],
  );

  // ---- Resource viewer (schema / sample) ----
  const [resourceViewer, setResourceViewer] = useState<ResourceViewerState>(
    RESOURCE_VIEWER_CLOSED,
  );

  const handleOpenResource = useCallback(
    (kind: "schema" | "sample", cohortId: string, cohortLabel: string) => {
      setResourceViewer({ open: true, kind, cohortId, cohortLabel });
    },
    [],
  );

  const handleCloseResource = useCallback(() => {
    setResourceViewer(RESOURCE_VIEWER_CLOSED);
  }, []);

  // ---- Tree sends messages via onSendMessage ----
  const handleTreeSendMessage = useCallback(
    (text: string) => {
      onNewChat();
      onSendMessage(text);
    },
    [onSendMessage, onNewChat],
  );

  const isEmpty = sessions.length === 0 && cohorts.length === 0 && !showSubmit;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
          Workspace
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setShowSubmit((v) => !v)}
            title="Upload cohort"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="py-2">
          {/* File explorer tree */}
          <WorkspaceTree
            onSendMessage={handleTreeSendMessage}
            onNewCohortConversation={handleNewCohortConversation}
            onDeleteCohort={handleCohortRemoved}
            onOpenResource={handleOpenResource}
          />

          {/* Conversations */}
          {sessions.length > 0 && (
            <SidebarSection
              title="Conversations"
              count={sessions.length}
              defaultOpen
            >
              <div className="space-y-0.5 px-2 pb-1">
                {sessions.map((s) => {
                  const isActive = s.session_id === sessionId;
                  return (
                    <div
                      key={s.session_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onLoadSession(s.session_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onLoadSession(s.session_id);
                        }
                      }}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <MessageSquareIcon className="size-3.5 shrink-0" />
                      <span className="flex-1 truncate text-[13px]">
                        {s.title || "Untitled"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                        {formatRelativeTime(s.last_activity_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(s.session_id);
                        }}
                        className="shrink-0 rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-accent"
                        title="Delete conversation"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </SidebarSection>
          )}

          {/* Submit Panel */}
          {showSubmit && (
            <div className="px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <VariantSubmitPanel
                onCohortCreated={handleCohortCreated}
                onAnalyzeCohort={handleAnalyzeCohort}
              />
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-foreground">
                No conversations yet
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Start a chat to begin exploring
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quota footer */}
      {quotas.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <QuotaBar
            quotas={quotas}
            filter={["agent_messages_today", "concurrent_cohorts"]}
          />
        </div>
      )}

      {/* Cohort prompt picker dialog */}
      <CohortPromptPicker
        cohort={selectedCohort}
        open={selectedCohort !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCohort(null);
        }}
        onSend={handleCohortPromptSend}
      />

      {/* Resource viewer (schema / sample) */}
      <ResourceViewer state={resourceViewer} onClose={handleCloseResource} />
    </div>
  );
}
