"use client";

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  type EdgeTypes,
  getSmoothStepPath,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/base.css";

/* -------------------------------------------------------------------------- */
/*  Custom nodes                                                               */
/* -------------------------------------------------------------------------- */

type ServiceNodeData = { title: string; subtitle?: string };
type DataNodeData = { title: string; stat?: string };
type LayerLabelData = { label: string };

const handleStyle = { opacity: 0, width: 1, height: 1 } as const;

function ServiceNode({ data }: NodeProps<Node<ServiceNodeData>>) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
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

function DataNode({ data }: NodeProps<Node<DataNodeData>>) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <p className="text-[13px] font-semibold text-foreground leading-tight">
        {data.title}
      </p>
      {data.stat && (
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {data.stat}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

function LayerLabel({ data }: NodeProps<Node<LayerLabelData>>) {
  return (
    <div className="px-2 py-1">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/60 select-none">
        {data.label}
      </p>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  data: DataNode,
  layerLabel: LayerLabel,
};

/* -------------------------------------------------------------------------- */
/*  Custom edge with styled label                                              */
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
            className="absolute px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground bg-muted/80 pointer-events-none"
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

const CX = 520;
const LX = 20;

const initialNodes: Node[] = [
  // Layer labels
  {
    id: "lbl-client",
    type: "layerLabel",
    position: { x: LX, y: 20 },
    data: { label: "Client" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-api",
    type: "layerLabel",
    position: { x: LX, y: 140 },
    data: { label: "API" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-workers",
    type: "layerLabel",
    position: { x: LX, y: 320 },
    data: { label: "Workers" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-storage",
    type: "layerLabel",
    position: { x: LX, y: 490 },
    data: { label: "Storage" },
    draggable: false,
    selectable: false,
  },
  {
    id: "lbl-engines",
    type: "layerLabel",
    position: { x: LX, y: 640 },
    data: { label: "Engines" },
    draggable: false,
    selectable: false,
  },

  // Client
  {
    id: "nextjs",
    type: "service",
    position: { x: CX - 80, y: 5 },
    data: { title: "Next.js App", subtitle: "React · SSR" },
    draggable: false,
    selectable: false,
  },

  // API
  {
    id: "rust-api",
    type: "service",
    position: { x: CX - 200, y: 125 },
    data: { title: "Rust API", subtitle: "Axum · Tokio" },
    draggable: false,
    selectable: false,
  },
  {
    id: "nats",
    type: "service",
    position: { x: CX + 100, y: 125 },
    data: { title: "NATS JetStream", subtitle: "Async dispatch" },
    draggable: false,
    selectable: false,
  },

  // Workers
  {
    id: "worker-batch",
    type: "service",
    position: { x: CX - 340, y: 305 },
    data: { title: "Batch Annotation" },
    draggable: false,
    selectable: false,
  },
  {
    id: "worker-analytics",
    type: "service",
    position: { x: CX - 100, y: 305 },
    data: { title: "Cohort Analytics" },
    draggable: false,
    selectable: false,
  },
  {
    id: "worker-ai",
    type: "service",
    position: { x: CX + 140, y: 305 },
    data: { title: "AI Summarization" },
    draggable: false,
    selectable: false,
  },

  // Storage
  {
    id: "s3",
    type: "data",
    position: { x: CX - 80, y: 475 },
    data: { title: "S3 Data Lake", stat: "Source of truth" },
    draggable: false,
    selectable: false,
  },

  // Engines
  {
    id: "rocksdb",
    type: "data",
    position: { x: 100, y: 630 },
    data: { title: "RocksDB", stat: "Key-value lookups" },
    draggable: false,
    selectable: false,
  },
  {
    id: "clickhouse",
    type: "data",
    position: { x: 300, y: 630 },
    data: { title: "ClickHouse", stat: "Columnar analytics" },
    draggable: false,
    selectable: false,
  },
  {
    id: "postgres",
    type: "data",
    position: { x: 500, y: 630 },
    data: { title: "PostgreSQL", stat: "Transactions" },
    draggable: false,
    selectable: false,
  },
  {
    id: "kuzu",
    type: "data",
    position: { x: 700, y: 630 },
    data: { title: "Kuzu", stat: "Graph traversal" },
    draggable: false,
    selectable: false,
  },
  {
    id: "elasticsearch",
    type: "data",
    position: { x: 900, y: 630 },
    data: { title: "Elasticsearch", stat: "Full-text search" },
    draggable: false,
    selectable: false,
  },
];

const edgeStyle = { stroke: "var(--color-border)", strokeWidth: 1.8 };
const marker = {
  type: MarkerType.ArrowClosed as const,
  color: "var(--color-border)",
  width: 18,
  height: 18,
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
  edge("e-next-api", "nextjs", "rust-api", { label: "REST / SSE" }),
  edge("e-api-nats", "rust-api", "nats", {
    sourceHandle: "right",
    targetHandle: "left",
    label: "publishes",
    animated: true,
  }),
  edge("e-nats-batch", "nats", "worker-batch", { animated: true }),
  edge("e-nats-analytics", "nats", "worker-analytics", { animated: true }),
  edge("e-nats-ai", "nats", "worker-ai", { animated: true }),
  edge("e-batch-s3", "worker-batch", "s3", { label: "writes" }),
  edge("e-analytics-s3", "worker-analytics", "s3"),
  edge("e-ai-s3", "worker-ai", "s3"),
  edge("e-api-pg", "rust-api", "postgres", {
    style: { ...edgeStyle, strokeDasharray: "6 3" },
  }),
  edge("e-s3-rocks", "s3", "rocksdb", { label: "sync" }),
  edge("e-s3-ch", "s3", "clickhouse"),
  edge("e-s3-pg", "s3", "postgres"),
  edge("e-s3-kuzu", "s3", "kuzu"),
  edge("e-s3-es", "s3", "elasticsearch"),
];

/* -------------------------------------------------------------------------- */
/*  Diagram wrapper — fully static, no interaction                             */
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
      fitViewOptions={{ padding: 0.12 }}
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

export function SystemArchDiagram() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full aspect-[16/11] min-h-[520px] rounded-xl border border-border bg-muted/30 overflow-hidden">
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
