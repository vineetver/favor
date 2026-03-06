"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  EdgeLabelRenderer,
  BaseEdge,
  getSmoothStepPath,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";

/* -------------------------------------------------------------------------- */
/*  Custom nodes                                                               */
/* -------------------------------------------------------------------------- */

type CoreNodeData = { title: string; subtitle?: string; accent?: boolean };
type ToolNodeData = { title: string; detail?: string };
type LabelData = { label: string };

const handleStyle = { opacity: 0, width: 1, height: 1 } as const;

function CoreNode({ data }: NodeProps<Node<CoreNodeData>>) {
  return (
    <div
      className={`rounded-xl border px-4 py-2.5 shadow-sm ${
        data.accent
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={handleStyle}
      />
      <p className="text-[13px] font-semibold text-foreground leading-tight">
        {data.title}
      </p>
      {data.subtitle && (
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {data.subtitle}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={handleStyle}
      />
    </div>
  );
}

function ToolNode({ data }: NodeProps<Node<ToolNodeData>>) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 shadow-sm min-w-[90px] text-center">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <p className="text-[13px] font-bold text-primary leading-tight">
        {data.title}
      </p>
      {data.detail && (
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {data.detail}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

function SectionLabel({ data }: NodeProps<Node<LabelData>>) {
  return (
    <div className="px-2 py-1">
      <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 select-none">
        {data.label}
      </p>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  core: CoreNode,
  tool: ToolNode,
  sectionLabel: SectionLabel,
};

/* -------------------------------------------------------------------------- */
/*  Custom edge                                                                */
/* -------------------------------------------------------------------------- */

function LabeledEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
    markerEnd,
    label,
  } = props;

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge path={path} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute px-1.5 py-0.5 rounded text-[11px] font-medium text-muted-foreground bg-muted/80 pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = { labeled: LabeledEdge };

/* -------------------------------------------------------------------------- */
/*  Graph definition                                                           */
/* -------------------------------------------------------------------------- */

const LX = 10;
const LEFT = 210; // left edge of content (clear of labels)

const ROW = [0, 90, 220, 320, 440, 550]; // y positions per row

const initialNodes: Node[] = [
  // Section labels — pinned to far left
  {
    id: "lbl-input",
    type: "sectionLabel",
    position: { x: LX, y: ROW[0] + 12 },
    data: { label: "Input" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-brain",
    type: "sectionLabel",
    position: { x: LX, y: ROW[1] + 10 },
    data: { label: "Agent Core" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-tools",
    type: "sectionLabel",
    position: { x: LX, y: ROW[2] + 10 },
    data: { label: "Tool Surface" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-pipeline",
    type: "sectionLabel",
    position: { x: LX, y: ROW[3] + 10 },
    data: { label: "Reliability" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-domains",
    type: "sectionLabel",
    position: { x: LX, y: ROW[4] + 10 },
    data: { label: "Domains" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-output",
    type: "sectionLabel",
    position: { x: LX, y: ROW[5] + 10 },
    data: { label: "Output" },
    draggable: false,
    selectable: false,
  },

  // Input
  {
    id: "query",
    type: "core",
    position: { x: LEFT + 210, y: ROW[0] },
    data: { title: "Natural Language Query", subtitle: "SSE streaming" },
    draggable: false,
    selectable: false,
  },

  // Agent core
  {
    id: "classifier",
    type: "core",
    position: { x: LEFT + 30, y: ROW[1] },
    data: { title: "Query Classifier", subtitle: "Fast-path routing" },
    draggable: false,
    selectable: false,
  },
  {
    id: "loop",
    type: "core",
    position: { x: LEFT + 250, y: ROW[1] },
    data: {
      title: "Tool Loop Agent",
      subtitle: "Max 8 steps, token-budgeted",
      accent: true,
    },
    draggable: false,
    selectable: false,
  },
  {
    id: "stuck",
    type: "core",
    position: { x: LEFT + 500, y: ROW[1] },
    data: { title: "Stuck Detection", subtitle: "Loop + error guard" },
    draggable: false,
    selectable: false,
  },

  // Tools (5 cols, 130px gap)
  // Tools (5 cols, 140px gap)
  {
    id: "t-state",
    type: "tool",
    position: { x: LEFT, y: ROW[2] },
    data: { title: "State", detail: "Workspace snapshot" },
    draggable: false,
    selectable: false,
  },
  {
    id: "t-read",
    type: "tool",
    position: { x: LEFT + 140, y: ROW[2] },
    data: { title: "Read", detail: "Entity + schema" },
    draggable: false,
    selectable: false,
  },
  {
    id: "t-search",
    type: "tool",
    position: { x: LEFT + 280, y: ROW[2] },
    data: { title: "Search", detail: "Multi-scope" },
    draggable: false,
    selectable: false,
  },
  {
    id: "t-run",
    type: "tool",
    position: { x: LEFT + 420, y: ROW[2] },
    data: { title: "Run", detail: "4 domains" },
    draggable: false,
    selectable: false,
  },
  {
    id: "t-ask",
    type: "tool",
    position: { x: LEFT + 560, y: ROW[2] },
    data: { title: "AskUser", detail: "Disambiguation" },
    draggable: false,
    selectable: false,
  },

  // Reliability pipeline (5 cols, 130px gap)
  {
    id: "p-validate",
    type: "core",
    position: { x: LEFT, y: ROW[3] },
    data: { title: "Validate", subtitle: "Zod parse" },
    draggable: false,
    selectable: false,
  },
  {
    id: "p-pregate",
    type: "core",
    position: { x: LEFT + 140, y: ROW[3] },
    data: { title: "Pre-gate", subtitle: "Schema + columns" },
    draggable: false,
    selectable: false,
  },
  {
    id: "p-handler",
    type: "core",
    position: { x: LEFT + 280, y: ROW[3] },
    data: { title: "Execute", subtitle: "API call + trace", accent: true },
    draggable: false,
    selectable: false,
  },
  {
    id: "p-post",
    type: "core",
    position: { x: LEFT + 420, y: ROW[3] },
    data: { title: "Post-process", subtitle: "Recover + enrich" },
    draggable: false,
    selectable: false,
  },
  {
    id: "p-escalate",
    type: "core",
    position: { x: LEFT + 560, y: ROW[3] },
    data: { title: "Escalate", subtitle: "Graduated retry" },
    draggable: false,
    selectable: false,
  },

  // Domains (4 cols, 170px gap)
  {
    id: "d-cohort",
    type: "core",
    position: { x: LEFT + 10, y: ROW[4] },
    data: { title: "Cohort", subtitle: "5 ops" },
    draggable: false,
    selectable: false,
  },
  {
    id: "d-analytics",
    type: "core",
    position: { x: LEFT + 170, y: ROW[4] },
    data: { title: "Analyze", subtitle: "9 ops" },
    draggable: false,
    selectable: false,
  },
  {
    id: "d-graph",
    type: "core",
    position: { x: LEFT + 340, y: ROW[4] },
    data: { title: "Graph", subtitle: "8 modes" },
    draggable: false,
    selectable: false,
  },
  {
    id: "d-workspace",
    type: "core",
    position: { x: LEFT + 500, y: ROW[4] },
    data: { title: "Workspace", subtitle: "4 ops" },
    draggable: false,
    selectable: false,
  },

  // Output (4 cols, 170px gap)
  {
    id: "o-viz",
    type: "core",
    position: { x: LEFT + 20, y: ROW[5] },
    data: { title: "Viz Engine", subtitle: "12 chart types" },
    draggable: false,
    selectable: false,
  },
  {
    id: "o-artifacts",
    type: "core",
    position: { x: LEFT + 180, y: ROW[5] },
    data: { title: "Artifact Store", subtitle: "Compacted refs" },
    draggable: false,
    selectable: false,
  },
  {
    id: "o-state",
    type: "core",
    position: { x: LEFT + 350, y: ROW[5] },
    data: { title: "Session State", subtitle: "Optimistic versioning" },
    draggable: false,
    selectable: false,
  },
  {
    id: "o-memory",
    type: "core",
    position: { x: LEFT + 510, y: ROW[5] },
    data: { title: "Memory", subtitle: "Cross-session" },
    draggable: false,
    selectable: false,
  },
];

const edgeStyle = { stroke: "var(--color-border)", strokeWidth: 1.5 };
const accentStyle = {
  stroke: "var(--color-primary)",
  strokeWidth: 1.5,
  opacity: 0.5,
};
const marker = {
  type: MarkerType.ArrowClosed as const,
  color: "var(--color-border)",
  width: 14,
  height: 14,
};
const accentMarker = {
  type: MarkerType.ArrowClosed as const,
  color: "var(--color-primary)",
  width: 14,
  height: 14,
};

function edge(
  id: string,
  source: string,
  target: string,
  opts?: Partial<Edge>,
): Edge {
  return {
    id,
    source,
    target,
    type: "labeled",
    style: edgeStyle,
    markerEnd: marker,
    animated: false,
    ...opts,
  };
}

const initialEdges: Edge[] = [
  // Input to core
  edge("e-q-cls", "query", "classifier"),
  edge("e-q-loop", "query", "loop"),
  edge("e-loop-stuck", "loop", "stuck", {
    sourceHandle: "right",
    targetHandle: "left",
    style: { ...edgeStyle, strokeDasharray: "4 3" },
    label: "monitors",
  }),

  // Core to tools
  edge("e-loop-state", "loop", "t-state", {
    style: accentStyle,
    markerEnd: accentMarker,
  }),
  edge("e-loop-read", "loop", "t-read", {
    style: accentStyle,
    markerEnd: accentMarker,
  }),
  edge("e-loop-search", "loop", "t-search", {
    style: accentStyle,
    markerEnd: accentMarker,
  }),
  edge("e-loop-run", "loop", "t-run", {
    style: accentStyle,
    markerEnd: accentMarker,
  }),
  edge("e-loop-ask", "loop", "t-ask", {
    style: accentStyle,
    markerEnd: accentMarker,
  }),

  // Run to reliability
  edge("e-run-val", "t-run", "p-validate"),
  edge("e-val-pre", "p-validate", "p-pregate", {
    sourceHandle: "right",
    targetHandle: "left",
  }),
  edge("e-pre-hand", "p-pregate", "p-handler", {
    sourceHandle: "right",
    targetHandle: "left",
  }),
  edge("e-hand-post", "p-handler", "p-post", {
    sourceHandle: "right",
    targetHandle: "left",
  }),
  edge("e-post-esc", "p-post", "p-escalate", {
    sourceHandle: "right",
    targetHandle: "left",
  }),

  // Pipeline to domains
  edge("e-hand-cohort", "p-handler", "d-cohort"),
  edge("e-hand-analytics", "p-handler", "d-analytics"),
  edge("e-hand-graph", "p-handler", "d-graph"),
  edge("e-hand-workspace", "p-handler", "d-workspace"),

  // Domains to output — Cohort, Analytics, and Graph all produce charts + artifacts
  edge("e-cohort-viz", "d-cohort", "o-viz"),
  edge("e-cohort-art", "d-cohort", "o-artifacts"),
  edge("e-analytics-viz", "d-analytics", "o-viz"),
  edge("e-analytics-art", "d-analytics", "o-artifacts"),
  edge("e-graph-viz", "d-graph", "o-viz"),
  edge("e-graph-art", "d-graph", "o-artifacts"),
  edge("e-ws-state", "d-workspace", "o-state"),
  edge("e-ws-mem", "d-workspace", "o-memory"),
];

/* -------------------------------------------------------------------------- */
/*  Diagram wrapper                                                            */
/* -------------------------------------------------------------------------- */

function DiagramInner() {
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);
  return (
    <ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      proOptions={proOptions}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      className="!bg-transparent !cursor-default"
    />
  );
}

export function AgentArchDiagram() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full h-[540px] rounded-xl border border-border bg-muted/30 overflow-hidden">
      {mounted ? (
        <ReactFlowProvider>
          <DiagramInner />
        </ReactFlowProvider>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
