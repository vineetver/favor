"use client";

import { Skeleton } from "@shared/components/ui/skeleton";
import type { FolderNode, TreeNode } from "./types";
import { TreeNodeRow, PROCESSING_STATUSES } from "./tree-node-row";
import { TreeContextMenu } from "./tree-context-menu";
import { useCohortChildren } from "./use-cohort-children";

// ---------------------------------------------------------------------------
// Lazy folder for cohort children (derived + runs)
// ---------------------------------------------------------------------------

function LazyFolder({
  parentCohortId,
  node,
  expanded,
  onToggle,
  callbacks,
}: {
  parentCohortId: string;
  node: FolderNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  callbacks: TreeCallbacks;
}) {
  const isExpanded = expanded.has(node.id);
  const { derivedNodes, runNodes, isLoading } = useCohortChildren({
    cohortId: parentCohortId,
    isExpanded,
    baseDepth: node.depth + 1,
  });

  const resolvedChildren =
    node.kind === "derived-folder" ? derivedNodes : runNodes;

  return (
    <div>
      <TreeContextMenu node={node} {...callbacks}>
        <div>
          <TreeNodeRow
            node={node}
            isExpanded={isExpanded}
            onToggle={() => onToggle(node.id)}
          />
        </div>
      </TreeContextMenu>

      {isExpanded && (
        <div>
          {isLoading ? (
            <div className="space-y-1 py-1" style={{ paddingLeft: (node.depth + 1) * 12 + 8 }}>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ) : resolvedChildren.length === 0 ? (
            <p
              className="py-1 text-[11px] text-muted-foreground/50 italic"
              style={{ paddingLeft: (node.depth + 1) * 12 + 8 }}
            >
              empty
            </p>
          ) : (
            <TreeBranch
              nodes={resolvedChildren}
              expanded={expanded}
              onToggle={onToggle}
              callbacks={callbacks}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursive branch renderer
// ---------------------------------------------------------------------------

export interface TreeCallbacks {
  onViewInChat?: (message: string) => void;
  onNewConversation?: (cohortId: string) => void;
  onDelete?: (cohortId: string) => void;
  /** Open the resource viewer for schema/sample leaves */
  onOpenResource?: (kind: "schema" | "sample", cohortId: string, cohortLabel: string) => void;
}

interface TreeBranchProps {
  nodes: TreeNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  callbacks: TreeCallbacks;
  /** Cohort ID for resolving lazy folders — only relevant for cohort children */
  parentCohortId?: string;
}

export function TreeBranch({
  nodes,
  expanded,
  onToggle,
  callbacks,
  parentCohortId,
}: TreeBranchProps) {
  return (
    <>
      {nodes.map((node) => {
        const folder =
          "children" in node && node.children !== undefined;

        // Lazy folder: needs data fetching
        if (
          folder &&
          node.children === "lazy" &&
          parentCohortId
        ) {
          return (
            <LazyFolder
              key={node.id}
              parentCohortId={parentCohortId}
              node={node as FolderNode}
              expanded={expanded}
              onToggle={onToggle}
              callbacks={callbacks}
            />
          );
        }

        // Regular folder with resolved children
        if (folder && Array.isArray(node.children)) {
          const isExpanded = expanded.has(node.id);

          // Detect processing status for cohort nodes
          const isProcessing =
            node.kind === "cohort" && false; // Handled by parent via status

          return (
            <div key={node.id}>
              <TreeContextMenu node={node} {...callbacks}>
                <div>
                  <TreeNodeRow
                    node={node}
                    isExpanded={isExpanded}
                    isProcessing={isProcessing}
                    onToggle={() => onToggle(node.id)}
                  />
                </div>
              </TreeContextMenu>

              {isExpanded && (
                <TreeBranch
                  nodes={node.children}
                  expanded={expanded}
                  onToggle={onToggle}
                  callbacks={callbacks}
                  parentCohortId={
                    node.kind === "cohort" ? node.id : parentCohortId
                  }
                />
              )}
            </div>
          );
        }

        // Leaf node
        return (
          <TreeContextMenu key={node.id} node={node} {...callbacks}>
            <div>
              <TreeNodeRow
                node={node}
                isExpanded={false}
                onClick={() => {
                  // schema/sample leaves open the resource viewer directly
                  if (
                    (node.kind === "schema" || node.kind === "sample") &&
                    parentCohortId &&
                    callbacks.onOpenResource
                  ) {
                    // Find label from the node's path: "cohort/{id}/schema"
                    const label = node.path.split("/").slice(0, 2).join("/");
                    callbacks.onOpenResource(node.kind, parentCohortId, label);
                  } else {
                    callbacks.onViewInChat?.(`Show me ${node.path}`);
                  }
                }}
              />
            </div>
          </TreeContextMenu>
        );
      })}
    </>
  );
}
