"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@shared/components/ui/context-menu";
import {
  ClipboardCopyIcon,
  EyeIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import type { NodeKind, TreeAction, TreeNode } from "./types";

// ---------------------------------------------------------------------------
// Action configuration per node kind
// ---------------------------------------------------------------------------

const ACTIONS_BY_KIND: Record<NodeKind, TreeAction[]> = {
  "cohorts-folder": ["copy-path"],
  cohort: ["copy-path", "new-conversation", "delete"],
  schema: ["copy-path", "view-in-chat"],
  sample: ["copy-path", "view-in-chat"],
  "derived-folder": ["copy-path"],
  "runs-folder": ["copy-path"],
  run: ["copy-path", "view-in-chat"],
  "run-viz": ["copy-path"],
  "graph-folder": ["copy-path"],
  "graph-schema": ["copy-path", "view-in-chat"],
};

/** Node kinds that open a resource viewer instead of sending a chat message */
const VIEWABLE_KINDS = new Set<NodeKind>(["schema", "sample"]);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TreeContextMenuProps {
  node: TreeNode;
  onViewInChat?: (path: string) => void;
  onNewConversation?: (cohortId: string) => void;
  onDelete?: (cohortId: string) => void;
  onOpenResource?: (
    kind: "schema" | "sample",
    cohortId: string,
    cohortLabel: string,
  ) => void;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TreeContextMenu({
  node,
  onViewInChat,
  onNewConversation,
  onDelete,
  onOpenResource,
  children,
}: TreeContextMenuProps) {
  const actions = ACTIONS_BY_KIND[node.kind];
  const isViewable = VIEWABLE_KINDS.has(node.kind);

  function handleAction(action: TreeAction) {
    switch (action) {
      case "copy-path":
        navigator.clipboard.writeText(node.path);
        toast.success("Path copied", {
          description: node.path,
          duration: 2000,
        });
        break;
      case "view-in-chat":
        if (isViewable && onOpenResource) {
          // Extract cohort ID from path: "cohort/{id}/schema" or "cohort/{id}/sample"
          const parts = node.path.split("/");
          const cohortId = parts[1] ?? "";
          onOpenResource(
            node.kind as "schema" | "sample",
            cohortId,
            cohortId.slice(0, 8),
          );
        } else {
          onViewInChat?.(`Show me ${node.path}`);
        }
        break;
      case "new-conversation":
        onNewConversation?.(node.id);
        break;
      case "delete":
        onDelete?.(node.id);
        break;
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {actions.includes("copy-path") && (
          <ContextMenuItem onClick={() => handleAction("copy-path")}>
            <ClipboardCopyIcon className="mr-2 size-3.5" />
            Copy Path
          </ContextMenuItem>
        )}

        {actions.includes("view-in-chat") && (
          <ContextMenuItem onClick={() => handleAction("view-in-chat")}>
            {isViewable ? (
              <>
                <EyeIcon className="mr-2 size-3.5" />
                Open
              </>
            ) : (
              <>
                <MessageSquareIcon className="mr-2 size-3.5" />
                View in Chat
              </>
            )}
          </ContextMenuItem>
        )}

        {actions.includes("new-conversation") && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleAction("new-conversation")}>
              <PlusIcon className="mr-2 size-3.5" />
              New Conversation
            </ContextMenuItem>
          </>
        )}

        {actions.includes("delete") && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => handleAction("delete")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="mr-2 size-3.5" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
