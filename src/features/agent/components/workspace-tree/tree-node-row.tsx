"use client";

import {
  ActivityIcon,
  BarChart3Icon,
  ChevronRightIcon,
  FileBarChart2Icon,
  FlaskConicalIcon,
  FolderIcon,
  FolderOpenIcon,
  GitBranchIcon,
  Loader2Icon,
  RowsIcon,
  Share2Icon,
  TablePropertiesIcon,
} from "lucide-react";
import { cn } from "@infra/utils";
import type { NodeKind, TreeNode } from "./types";
import { isFolder } from "./types";

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<NodeKind, React.ElementType> = {
  "cohorts-folder": FlaskConicalIcon,
  cohort: FolderIcon,
  schema: TablePropertiesIcon,
  sample: RowsIcon,
  "derived-folder": GitBranchIcon,
  "runs-folder": ActivityIcon,
  run: FileBarChart2Icon,
  "run-viz": BarChart3Icon,
  "graph-folder": Share2Icon,
  "graph-schema": TablePropertiesIcon,
};

function getIcon(kind: NodeKind, isExpanded: boolean): React.ElementType {
  if (kind === "cohort" && isExpanded) return FolderOpenIcon;
  return ICON_MAP[kind];
}

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

/** Non-terminal cohort statuses that indicate processing */
const PROCESSING_STATUSES = new Set([
  "queued",
  "running",
  "materializing",
  "validating",
]);

// ---------------------------------------------------------------------------
// TreeNodeRow
// ---------------------------------------------------------------------------

interface TreeNodeRowProps {
  node: TreeNode;
  isExpanded: boolean;
  isProcessing?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

export function TreeNodeRow({
  node,
  isExpanded,
  isProcessing,
  onToggle,
  onClick,
}: TreeNodeRowProps) {
  const folder = isFolder(node);
  const Icon = getIcon(node.kind, isExpanded);
  const isTopLevel = node.depth === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (folder && onToggle) onToggle();
        else if (onClick) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (folder && onToggle) onToggle();
          else if (onClick) onClick();
        }
      }}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-[13px] transition-colors cursor-pointer select-none",
        isTopLevel
          ? "font-medium text-muted-foreground hover:text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      style={{ paddingLeft: node.depth * 12 + 8 }}
    >
      {/* Chevron for folders */}
      {folder ? (
        <ChevronRightIcon
          className={cn(
            "size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150",
            isExpanded && "rotate-90",
          )}
        />
      ) : (
        <span className="size-3 shrink-0" />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          node.kind === "cohorts-folder" || node.kind === "cohort"
            ? "text-primary"
            : "text-muted-foreground/60",
        )}
      />

      {/* Label */}
      <span className="flex-1 truncate">{node.label}</span>

      {/* Status indicator */}
      {isProcessing && (
        <Loader2Icon className="size-3 shrink-0 animate-spin text-amber-500" />
      )}

      {/* Child count badge for folders */}
      {folder && node.childCount != null && node.childCount > 0 && !isTopLevel && (
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
          {node.childCount}
        </span>
      )}
    </div>
  );
}

export { PROCESSING_STATUSES };
