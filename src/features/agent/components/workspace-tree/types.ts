// ---------------------------------------------------------------------------
// Tree node types for the workspace file explorer
// ---------------------------------------------------------------------------

export type NodeKind =
  | "cohorts-folder"
  | "cohort"
  | "schema"
  | "sample"
  | "derived-folder"
  | "runs-folder"
  | "run"
  | "run-viz"
  | "graph-folder"
  | "graph-schema";

interface TreeNodeBase {
  kind: NodeKind;
  /** Unique React key */
  id: string;
  /** Display name */
  label: string;
  /** Workspace path for the Read tool DSL (e.g. "cohort/{id}/schema") */
  path: string;
  /** Nesting depth for indentation */
  depth: number;
}

export interface FolderNode extends TreeNodeBase {
  /** Resolved children or "lazy" = fetch on expand */
  children: TreeNode[] | "lazy";
  /** Optional badge count */
  childCount?: number;
}

export interface LeafNode extends TreeNodeBase {
  children?: undefined;
}

export type TreeNode = FolderNode | LeafNode;

export function isFolder(node: TreeNode): node is FolderNode {
  return "children" in node && node.children !== undefined;
}

// ---------------------------------------------------------------------------
// Context menu actions
// ---------------------------------------------------------------------------

export type TreeAction =
  | "copy-path"
  | "view-in-chat"
  | "new-conversation"
  | "delete"
  | "export";
