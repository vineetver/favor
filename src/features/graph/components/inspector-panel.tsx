"use client";

import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
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
import { memo } from "react";
import type { InspectorPanelProps } from "../types/props";
import type { ExplorerNode, ExplorerEdge } from "../types/node";
import type { ExpansionConfig } from "../config/expansion";
import { EDGE_TYPE_CONFIG } from "../types/edge";
import { NODE_TYPE_COLORS } from "../config/styling";
import { NODE_EXPANSION_CONFIG } from "../config/expansion";

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
// Node Detail Component
// =============================================================================

interface NodeDetailProps {
  node: ExplorerNode;
  onExpand: (nodeId: string, expansion?: ExpansionConfig) => void;
  onRemove: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
}

function NodeDetail({ node, onExpand, onRemove, onFindPaths, isExpanding }: NodeDetailProps) {
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
    </div>
  );
}

// =============================================================================
// Edge Detail Component
// =============================================================================

interface EdgeDetailProps {
  edge: ExplorerEdge;
  getNode: (id: string) => ExplorerNode | undefined;
}

function EdgeDetail({ edge, getNode }: EdgeDetailProps) {
  const config = EDGE_TYPE_CONFIG[edge.type];
  const sourceNode = getNode(edge.sourceId);
  const targetNode = getNode(edge.targetId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config?.color ?? "#94a3b8" }}
          />
          <span className="text-sm font-medium text-foreground">
            {config?.label ?? edge.type}
          </span>
        </div>

        {/* Edge Direction */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            {sourceNode?.label ?? edge.sourceId}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {targetNode?.label ?? edge.targetId}
          </span>
        </div>
      </div>

      {/* Evidence Stats */}
      <div className="grid grid-cols-2 gap-2">
        {edge.numSources !== undefined && (
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <Database className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-blue-700">{edge.numSources}</div>
            <div className="text-xs text-blue-600">Sources</div>
          </div>
        )}
        {edge.numExperiments !== undefined && (
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <Beaker className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-emerald-700">{edge.numExperiments}</div>
            <div className="text-xs text-emerald-600">Experiments</div>
          </div>
        )}
      </div>

      {/* Evidence Sources */}
      {edge.evidence?.sources && edge.evidence.sources.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Data Sources
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {edge.evidence.sources.map((source, i) => (
              <span
                key={`${source}-${i}`}
                className="px-2 py-0.5 bg-muted text-foreground text-xs rounded"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PubMed IDs */}
      {edge.evidence?.pubmedIds && edge.evidence.pubmedIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Publications
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {edge.evidence.pubmedIds.slice(0, 5).map((pmid) => (
              <ExternalLink
                key={pmid}
                href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100"
              >
                PMID:{pmid}
              </ExternalLink>
            ))}
            {edge.evidence.pubmedIds.length > 5 && (
              <span className="px-2 py-0.5 text-muted-foreground text-xs">
                +{edge.evidence.pubmedIds.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Detection Methods */}
      {edge.evidence?.detectionMethods && edge.evidence.detectionMethods.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Detection Methods
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {edge.evidence.detectionMethods.slice(0, 5).map((method, i) => (
              <span
                key={`${method}-${i}`}
                className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded"
              >
                {method}
              </span>
            ))}
          </div>
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
  onExpandNode,
  onRemoveNode,
  onFindPaths,
  isExpanding,
}: InspectorPanelProps) {
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
          onExpand={onExpandNode}
          onRemove={onRemoveNode}
          onFindPaths={onFindPaths}
          isExpanding={isExpanding}
        />
      )}

      {selection.type === "edge" && (
        <EdgeDetail edge={selection.edge} getNode={getNode} />
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
