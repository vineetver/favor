"use client";

import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Beaker,
  Expand,
  HeartPulse,
  Link2,
  Loader2,
  Network,
  Pill,
  Route,
  Target,
  Trash2,
  Activity,
  Dna,
  AlertTriangle,
  Microscope,
} from "lucide-react";
import { memo, useState } from "react";
import type { InspectorPanelProps } from "../types/props";
import type { ExplorerNode, ExplorerEdge } from "../types/node";
import type { ProvenanceEvent } from "../types/provenance";
import type { ExpansionConfig } from "../config/expansion";
import type { EdgeType } from "../types/edge";
import type { ConnectionsDrilldownData, ConnectionsEdgeGroup, ConnectionsStatus } from "../types/connections";
import { EDGE_TYPE_CONFIG, getEdgeDatabase } from "../types/edge";
import { NODE_TYPE_COLORS } from "../config/styling";
import { NODE_EXPANSION_CONFIG } from "../config/expansion";
import { hasVariantTrail } from "../config/variant-trail";
import { VariantTrailResults } from "./variant-trail-results";

// =============================================================================
// Icon Map for Expansion Configs
// =============================================================================

const EXPANSION_ICONS: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-4 h-4" />,
  "pill": <Pill className="w-4 h-4" />,
  "route": <Route className="w-4 h-4" />,
  "activity": <Activity className="w-4 h-4" />,
  "target": <Target className="w-4 h-4" />,
  "dna": <Dna className="w-4 h-4" />,
  "network": <Network className="w-4 h-4" />,
  "alert-triangle": <AlertTriangle className="w-4 h-4" />,
  "microscope": <Microscope className="w-4 h-4" />,
  "bar-chart": <Activity className="w-4 h-4" />,
  "tag": <Activity className="w-4 h-4" />,
  "book-open": <Database className="w-4 h-4" />,
  "beaker": <Beaker className="w-4 h-4" />,
};

// =============================================================================
// Provenance Display
// =============================================================================

function ProvenanceDisplay({ events }: { events: ProvenanceEvent[] }) {
  if (events.length === 0) return null;
  const latest = events[events.length - 1];

  return (
    <p className="text-[11px] text-muted-foreground text-right">
      added by {latest.label}
    </p>
  );
}

// =============================================================================
// Schema-aware Edge Field Rendering
// =============================================================================

/** Fields to skip (already rendered structurally or internal) */
const SKIP_FIELDS = new Set([
  "num_sources", "num_experiments", "src_symbol", "dst_symbol",
  "confidence_scores", "pubmed_ids", "pmids", "detection_methods",
]);

/** Fields that are PubMed IDs */
const PUBMED_FIELDS = new Set([
  "pmids", "pubmed_ids", "evidence_pmids", "citation_id", "pmid", "pubmed_id",
]);

/** Fields that are URLs */
const URL_FIELDS = new Set(["report_url", "url"]);

/** Fields that are scores — render with emphasis */
const SCORE_FIELDS = new Set([
  "overall_score", "total_score", "combined_score", "score", "confidence",
  "max_l2g_score", "feature_score", "target_score", "ot_mi_score",
  "profile_evidence_score", "max_evidence_score", "max_pathogenicity",
  "pathogenicity", "llr", "frequency",
  "p_value_mlog", "best_p_value", "min_p_value", "p_value",
  "or_beta", "risk_allele_freq",
  "best_p_value_mlog", "best_or_beta",
]);

/** Snake_case to readable label */
function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .replace(/\bIds\b/g, "IDs")
    .replace(/\bPmid\b/g, "PMID")
    .replace(/\bPgx\b/g, "PGx")
    .replace(/\bOt\b/g, "OT")
    .replace(/\bMi\b/g, "MI")
    .replace(/\bNct\b/g, "NCT")
    .replace(/\bL2g\b/g, "L2G")
    .replace(/\bGo\b/g, "GO");
}

/** Format a numeric value for display */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  return value.toFixed(3);
}

/** Render a single field value */
function FieldValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  // PubMed IDs
  if (PUBMED_FIELDS.has(fieldKey)) {
    const ids = Array.isArray(value) ? value : [value];
    const pmids = ids.map(String).filter(Boolean);
    if (pmids.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {pmids.slice(0, 5).map((pmid) => (
          <ExternalLink
            key={pmid}
            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
            className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100"
          >
            PMID:{pmid}
          </ExternalLink>
        ))}
        {pmids.length > 5 && (
          <span className="text-xs text-muted-foreground">+{pmids.length - 5} more</span>
        )}
      </div>
    );
  }

  // URLs
  if (URL_FIELDS.has(fieldKey) && typeof value === "string") {
    return (
      <ExternalLink href={value} className="text-xs text-indigo-600 hover:underline truncate">
        {value}
      </ExternalLink>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${value ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  // Score fields
  if (SCORE_FIELDS.has(fieldKey) && typeof value === "number") {
    return (
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {formatNumber(value)}
      </span>
    );
  }

  // Number
  if (typeof value === "number") {
    return <span className="text-sm text-foreground tabular-nums">{formatNumber(value)}</span>;
  }

  // String arrays
  if (Array.isArray(value)) {
    const items = value.map(String).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 8).map((item, i) => (
          <span key={`${item}-${i}`} className="px-1.5 py-0.5 bg-muted text-foreground text-xs rounded">
            {item}
          </span>
        ))}
        {items.length > 8 && (
          <span className="text-xs text-muted-foreground">+{items.length - 8} more</span>
        )}
      </div>
    );
  }

  // Objects
  if (typeof value === "object") {
    return (
      <pre className="text-xs text-muted-foreground bg-muted rounded p-1.5 overflow-x-auto max-h-24">
        {JSON.stringify(value, null, 1)}
      </pre>
    );
  }

  // Default string
  return <span className="text-sm text-foreground break-words">{String(value)}</span>;
}

/** Render all fields from an edge's `fields` dict */
function EdgeFields({ fields }: { fields: Record<string, unknown> }) {
  const entries = Object.entries(fields).filter(
    ([key, value]) =>
      !SKIP_FIELDS.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );

  if (entries.length === 0) return null;

  // Sort: scores first, then pubmed, then rest
  entries.sort(([a], [b]) => {
    const aScore = SCORE_FIELDS.has(a) ? 0 : PUBMED_FIELDS.has(a) ? 2 : 1;
    const bScore = SCORE_FIELDS.has(b) ? 0 : PUBMED_FIELDS.has(b) ? 2 : 1;
    return aScore - bScore;
  });

  return (
    <div className="space-y-2.5">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-0.5">
          <div className="text-xs font-medium text-muted-foreground">{fieldLabel(key)}</div>
          <FieldValue fieldKey={key} value={value} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Single Edge Instance (collapsible within RelationshipGroup)
// =============================================================================

function EdgeInstance({
  edge,
  provenance,
  defaultOpen,
  insideGroup,
}: {
  edge: ExplorerEdge;
  provenance: ProvenanceEvent[];
  defaultOpen: boolean;
  /** When true, renders compact header (no type label — parent group already shows it) */
  insideGroup?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = EDGE_TYPE_CONFIG[edge.type];
  const hasFields = edge.fields && Object.keys(edge.fields).length > 0;
  const hasEvidence = edge.evidence?.sources?.length || edge.evidence?.pubmedIds?.length || edge.evidence?.detectionMethods?.length;
  const hasContent = hasFields || hasEvidence || edge.numSources !== undefined || edge.numExperiments !== undefined;

  return (
    <div className={insideGroup ? "border border-border/60 rounded-md overflow-hidden" : "border border-border rounded-lg overflow-hidden"}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
        onClick={() => setOpen(!open)}
      >
        {!insideGroup && (
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: config?.color ?? "#94a3b8" }}
          />
        )}
        {insideGroup ? (
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {getEdgeDatabase(edge.type)}
            {edge.numSources !== undefined ? ` \u00b7 ${edge.numSources} sources` : ""}
          </span>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground flex-1 truncate">
              {config?.label ?? edge.type}
            </span>
            <span className="px-1.5 py-0.5 bg-muted text-xs text-muted-foreground rounded shrink-0">
              {getEdgeDatabase(edge.type)}
            </span>
          </>
        )}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border">
          {config?.description && (
            <p className="text-xs text-muted-foreground pt-2">{config.description}</p>
          )}

          {/* Quick stats */}
          {(edge.numSources !== undefined || edge.numExperiments !== undefined) && (
            <div className="flex gap-3 pt-1">
              {edge.numSources !== undefined && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Database className="w-3 h-3 text-blue-600" />
                  <span className="font-medium text-foreground">{edge.numSources}</span>
                  <span className="text-muted-foreground">sources</span>
                </div>
              )}
              {edge.numExperiments !== undefined && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Beaker className="w-3 h-3 text-emerald-600" />
                  <span className="font-medium text-foreground">{edge.numExperiments}</span>
                  <span className="text-muted-foreground">experiments</span>
                </div>
              )}
            </div>
          )}

          {/* Schema-driven fields */}
          {edge.fields && Object.keys(edge.fields).length > 0 && (
            <EdgeFields fields={edge.fields} />
          )}

          {/* Legacy evidence (from subgraph API with includeProps) */}
          {edge.evidence?.sources && edge.evidence.sources.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Data Sources</div>
              <div className="flex flex-wrap gap-1">
                {edge.evidence.sources.map((source, i) => (
                  <span key={`${source}-${i}`} className="px-1.5 py-0.5 bg-muted text-foreground text-xs rounded">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {edge.evidence?.pubmedIds && edge.evidence.pubmedIds.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Publications</div>
              <div className="flex flex-wrap gap-1">
                {edge.evidence.pubmedIds.slice(0, 5).map((pmid) => (
                  <ExternalLink
                    key={pmid}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                    className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100"
                  >
                    PMID:{pmid}
                  </ExternalLink>
                ))}
                {edge.evidence.pubmedIds.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{edge.evidence.pubmedIds.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {edge.evidence?.detectionMethods && edge.evidence.detectionMethods.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Detection Methods</div>
              <div className="flex flex-wrap gap-1">
                {edge.evidence.detectionMethods.slice(0, 5).map((method, i) => (
                  <span key={`${method}-${i}`} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!hasContent && (
            <p className="text-xs text-muted-foreground pt-1 italic">No additional data available</p>
          )}

          {provenance.length > 0 && (
            <ProvenanceDisplay events={provenance} />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Relationship Type Group (collapsible group within connections drilldown)
// =============================================================================

interface RelationshipTypeGroupProps {
  group: ConnectionsEdgeGroup;
  selectedEdgeId: string;
  getProvenance: (id: string) => ProvenanceEvent[];
  onLoadMore?: (edgeType: EdgeType) => void;
}

function RelationshipTypeGroup({
  group,
  selectedEdgeId,
  getProvenance,
  onLoadMore,
}: RelationshipTypeGroupProps) {
  const config = EDGE_TYPE_CONFIG[group.type];
  const containsSelected = group.edges.some((e) => e.id === selectedEdgeId);
  const [open, setOpen] = useState(containsSelected);
  const remaining = group.totalCount - group.edges.length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-accent transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: config?.color ?? "#94a3b8" }}
        />
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {config?.label ?? group.type}
        </span>
        {!group.hasLocalEdges && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded shrink-0">
            from database
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-muted text-xs text-muted-foreground rounded tabular-nums shrink-0">
          {group.totalCount}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {group.direction === "in" ? "\u2190" : "\u2192"}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
          {group.edges.map((e) => (
            <EdgeInstance
              key={e.id}
              edge={e}
              provenance={getProvenance(e.id)}
              defaultOpen={e.id === selectedEdgeId}
              insideGroup
            />
          ))}

          {/* Load more button */}
          {group.nextCursor && onLoadMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => onLoadMore(group.type)}
              disabled={group.pageStatus === "loading"}
            >
              {group.pageStatus === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : null}
              Load more{remaining > 0 ? ` (${remaining} remaining)` : ""}
            </Button>
          )}

          {group.pageStatus === "error" && (
            <p className="text-xs text-amber-600 text-center">
              Failed to load more. Try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Edge Detail — RelationshipGroup (all edges between a pair)
// =============================================================================

interface EdgeDetailProps {
  edge: ExplorerEdge;
  allEdges: ExplorerEdge[];
  getNode: (id: string) => ExplorerNode | undefined;
  getProvenance: (id: string) => ProvenanceEvent[];
  connectionsData?: ConnectionsDrilldownData | null;
  connectionsStatus?: ConnectionsStatus;
  connectionsError?: string | null;
  onLoadMoreEdges?: (edgeType: EdgeType) => void;
  onRetryConnections?: () => void;
}

function EdgeDetail({
  edge,
  allEdges,
  getNode,
  getProvenance,
  connectionsData,
  connectionsStatus,
  connectionsError,
  onLoadMoreEdges,
  onRetryConnections,
}: EdgeDetailProps) {
  const sourceNode = getNode(edge.sourceId);
  const targetNode = getNode(edge.targetId);
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Use grouped view when connections data is available
  const useGroupedView = connectionsData && connectionsData.groups.length > 0;
  const totalRelationships = useGroupedView
    ? connectionsData.groups.reduce((sum, g) => sum + g.totalCount, 0)
    : allEdges.length;

  return (
    <div className="space-y-4">
      {/* Pair header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground truncate">
            {sourceNode?.label ?? edge.sourceId}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground truncate">
            {targetNode?.label ?? edge.targetId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {totalRelationships === 1
              ? "1 relationship"
              : `${totalRelationships} relationships between this pair`}
          </p>
          {connectionsStatus === "loading" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading all relationships...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {connectionsStatus === "error" && connectionsError && !errorDismissed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 flex-1">{connectionsError}</span>
          <div className="flex items-center gap-1 shrink-0">
            {onRetryConnections && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-700 hover:text-amber-800"
                onClick={onRetryConnections}
              >
                Retry
              </Button>
            )}
            <button
              className="text-amber-500 hover:text-amber-700"
              onClick={() => setErrorDismissed(true)}
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* Grouped view (connections drilldown) */}
      {useGroupedView ? (
        <div className="space-y-2">
          {connectionsData.groups.map((group) => (
            <RelationshipTypeGroup
              key={group.type}
              group={group}
              selectedEdgeId={edge.id}
              getProvenance={getProvenance}
              onLoadMore={onLoadMoreEdges}
            />
          ))}
        </div>
      ) : (
        /* Flat view (fallback when no connections data) */
        <div className="space-y-2">
          {allEdges.map((e) => (
            <EdgeInstance
              key={e.id}
              edge={e}
              provenance={getProvenance(e.id)}
              defaultOpen={e.id === edge.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Node Detail Component
// =============================================================================

interface NodeDetailProps {
  node: ExplorerNode;
  provenance: ProvenanceEvent[];
  onExpand: (nodeId: string, expansion?: ExpansionConfig) => void;
  onRemove: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
  onRunVariantTrail?: (nodeId: string) => void;
}

function NodeDetail({ node, provenance, onExpand, onRemove, onFindPaths, isExpanding, onRunVariantTrail }: NodeDetailProps) {
  const colors = NODE_TYPE_COLORS[node.type] ?? { background: "#e2e8f0", border: "#94a3b8", text: "#334155" };
  const expansionOptions = NODE_EXPANSION_CONFIG[node.type] ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: colors.border }}
          />
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: colors.background, color: colors.text }}
          >
            {node.type}
          </span>
          {node.isSeed && (
            <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium">
              Seed
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{node.label}</h3>
        <p className="text-xs font-mono text-muted-foreground">{node.id}</p>
      </div>

      {/* Stats */}
      {(node.degree !== undefined || node.hubScore !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {node.degree !== undefined && (
            <div className="bg-muted rounded-lg p-3 text-center">
              <Network className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-semibold text-foreground">{node.degree}</div>
              <div className="text-xs text-muted-foreground">Connections</div>
            </div>
          )}
          {node.hubScore !== undefined && (
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Beaker className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-amber-700">
                {(node.hubScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-amber-600">Hub Score</div>
            </div>
          )}
        </div>
      )}

      {/* External Links */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          External Resources
        </h4>
        <div className="flex flex-wrap gap-2">
          {node.type === "Gene" && (
            <>
              <ExternalLink
                href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${node.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Ensembl
              </ExternalLink>
              <ExternalLink
                href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${node.label}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                GeneCards
              </ExternalLink>
            </>
          )}
          {node.type === "Disease" && (
            <ExternalLink
              href={`https://monarchinitiative.org/${node.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              Monarch Initiative
            </ExternalLink>
          )}
          {node.type === "Pathway" && (
            <ExternalLink
              href={`https://reactome.org/PathwayBrowser/#/${node.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              Reactome
            </ExternalLink>
          )}
          {node.type === "Drug" && (
            <ExternalLink
              href={`https://www.drugbank.com/drugs/${node.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              DrugBank
            </ExternalLink>
          )}
        </div>
      </div>

      {/* Route to Variants */}
      {hasVariantTrail(node.type) && onRunVariantTrail && (
        <div className="pt-2 border-t border-border">
          <button
            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-left hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onRunVariantTrail(node.id)}
            disabled={isExpanding}
          >
            <div className="p-1 rounded bg-primary/10 text-primary">
              {isExpanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">Route to Variants</div>
              <div className="text-xs text-muted-foreground">Find variant evidence from this node</div>
            </div>
          </button>
        </div>
      )}

      {/* Context-Aware Expansion Options */}
      {expansionOptions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explore Relationships
          </h4>
          <div className="space-y-1.5">
            {expansionOptions.map((option) => (
              <button
                key={option.label}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background text-left hover:border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onExpand(node.id, option)}
                disabled={isExpanding}
              >
                <div
                  className="mt-0.5 p-1 rounded"
                  style={{ backgroundColor: `${option.color}15`, color: option.color }}
                >
                  {isExpanding ? <Loader2 className="w-4 h-4 animate-spin" /> : (EXPANSION_ICONS[option.icon] ?? <Expand className="w-4 h-4" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h4>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onExpand(node.id)}
            disabled={isExpanding}
          >
            {isExpanding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Expand className="w-4 h-4 mr-2" />
            )}
            Expand All Neighbors
          </Button>
          {!node.isSeed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRemove(node.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove from Graph
            </Button>
          )}
        </div>
      </div>

      {/* Provenance */}
      {provenance.length > 0 && (
        <div className="pt-2 border-t border-border">
          <ProvenanceDisplay events={provenance} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Multi-Select Detail Component
// =============================================================================

interface MultiSelectDetailProps {
  nodeIds: Set<string>;
  getNode: (id: string) => ExplorerNode | undefined;
  onFindPaths: (fromId: string, toId: string) => void;
}

function MultiSelectDetail({ nodeIds, getNode, onFindPaths }: MultiSelectDetailProps) {
  const nodes = Array.from(nodeIds)
    .map((id) => getNode(id))
    .filter((n): n is ExplorerNode => n !== undefined);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {nodes.length} nodes selected
        </h3>
        <p className="text-sm text-muted-foreground">
          Compare nodes or find shared connections
        </p>
      </div>

      {/* Selected Nodes List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Selected Nodes
        </h4>
        <div className="space-y-1.5">
          {nodes.map((node) => {
            const colors = NODE_TYPE_COLORS[node.type];
            return (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 bg-muted rounded"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {node.label}
                </span>
                <span className="text-xs text-muted-foreground">{node.type}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h4>
        {nodes.length === 2 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onFindPaths(nodes[0].id, nodes[1].id)}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Find Paths Between Nodes
          </Button>
        )}
        {nodes.length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled
          >
            <Network className="w-4 h-4 mr-2" />
            Find Shared Neighbors (Coming Soon)
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function InspectorPanelInner({
  selection,
  getNode,
  getEdge,
  getProvenance,
  getEdgesBetween,
  onExpandNode,
  onRemoveNode,
  onFindPaths,
  isExpanding,
  onRunVariantTrail,
  activeTrailResult,
  onClearTrailResult,
  onSelectTrailVariant,
  connectionsData,
  connectionsStatus,
  connectionsError,
  onLoadMoreEdges,
  onRetryConnections,
}: InspectorPanelProps) {
  // Show trail results when active and matches selected node
  if (
    activeTrailResult &&
    selection.type === "node" &&
    activeTrailResult.seedNodeId === selection.nodeId &&
    onClearTrailResult
  ) {
    return (
      <VariantTrailResults
        result={activeTrailResult}
        onBack={onClearTrailResult}
        onSelectNode={(node) => {
          onClearTrailResult();
          onSelectTrailVariant?.(node);
        }}
      />
    );
  }

  if (selection.type === "none") {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Click a node or edge to inspect it.
      </div>
    );
  }

  return (
    <>
      {selection.type === "node" && (
        <NodeDetail
          node={selection.node}
          provenance={getProvenance(selection.nodeId)}
          onExpand={onExpandNode}
          onRemove={onRemoveNode}
          onFindPaths={onFindPaths}
          isExpanding={isExpanding}
          onRunVariantTrail={onRunVariantTrail}
        />
      )}

      {selection.type === "edge" && (
        <EdgeDetail
          edge={selection.edge}
          allEdges={getEdgesBetween(selection.edge.sourceId, selection.edge.targetId)}
          getNode={getNode}
          getProvenance={getProvenance}
          connectionsData={connectionsData}
          connectionsStatus={connectionsStatus}
          connectionsError={connectionsError}
          onLoadMoreEdges={onLoadMoreEdges}
          onRetryConnections={onRetryConnections}
        />
      )}

      {selection.type === "multi" && (
        <MultiSelectDetail
          nodeIds={selection.nodeIds}
          getNode={getNode}
          onFindPaths={onFindPaths}
        />
      )}
    </>
  );
}

export const InspectorPanel = memo(InspectorPanelInner);
