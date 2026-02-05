"use client";

import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import { cn } from "@infra/utils";
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
  X,
  Activity,
  Dna,
} from "lucide-react";
import { memo } from "react";
import {
  type InspectorPanelProps,
  type ExplorerNode,
  type ExplorerEdge,
  type EdgeType,
  EDGE_TYPE_CONFIG,
  NODE_TYPE_COLORS,
} from "./types";

// =============================================================================
// Context-Aware Expansion Options
// =============================================================================

interface ExpansionOption {
  label: string;
  description: string;
  edgeTypes: EdgeType[];
  icon: React.ReactNode;
  color: string;
}

/**
 * Get relevant expansion options based on node type
 */
function getExpansionOptions(nodeType: ExplorerNode["type"]): ExpansionOption[] {
  switch (nodeType) {
    case "Gene":
      return [
        {
          label: "Find Diseases",
          description: "Diseases this gene is implicated in",
          edgeTypes: ["IMPLICATED_IN", "CAUSES", "CURATED_FOR"],
          icon: <HeartPulse className="w-4 h-4" />,
          color: "#ef4444",
        },
        {
          label: "Find Pathways",
          description: "Pathways this gene participates in",
          edgeTypes: ["PARTICIPATES_IN", "PART_OF"],
          icon: <Route className="w-4 h-4" />,
          color: "#8b5cf6",
        },
        {
          label: "Find Phenotypes",
          description: "Phenotypes this gene manifests",
          edgeTypes: ["MANIFESTS_AS"],
          icon: <Activity className="w-4 h-4" />,
          color: "#ec4899",
        },
        {
          label: "Find Targeting Drugs",
          description: "Drugs that target this gene",
          edgeTypes: ["TARGETS", "KNOWN_TO_TARGET", "INTERACTS_WITH_GENE"],
          icon: <Target className="w-4 h-4" />,
          color: "#22c55e",
        },
      ];

    case "Disease":
      return [
        {
          label: "Find Treatments",
          description: "Drugs approved/indicated for this disease",
          edgeTypes: ["APPROVED_FOR", "INDICATED_FOR", "INVESTIGATED_FOR"],
          icon: <Pill className="w-4 h-4" />,
          color: "#14b8a6",
        },
        {
          label: "Find Genes",
          description: "Genes implicated in this disease",
          edgeTypes: ["IMPLICATED_IN", "CAUSES", "CURATED_FOR"],
          icon: <Dna className="w-4 h-4" />,
          color: "#3b82f6",
        },
        {
          label: "Find Phenotypes",
          description: "Phenotypes associated with this disease",
          edgeTypes: ["PRESENTS_WITH"],
          icon: <Activity className="w-4 h-4" />,
          color: "#f43f5e",
        },
      ];

    case "Drug":
      return [
        {
          label: "Find Targets",
          description: "Genes this drug targets",
          edgeTypes: ["TARGETS", "KNOWN_TO_TARGET", "INTERACTS_WITH_GENE"],
          icon: <Target className="w-4 h-4" />,
          color: "#22c55e",
        },
        {
          label: "Find Indications",
          description: "Diseases this drug treats",
          edgeTypes: ["APPROVED_FOR", "INDICATED_FOR", "INVESTIGATED_FOR"],
          icon: <HeartPulse className="w-4 h-4" />,
          color: "#14b8a6",
        },
      ];

    case "Pathway":
      return [
        {
          label: "Find Genes",
          description: "Genes that participate in this pathway",
          edgeTypes: ["PARTICIPATES_IN"],
          icon: <Dna className="w-4 h-4" />,
          color: "#3b82f6",
        },
        {
          label: "Find Related Pathways",
          description: "Parent or child pathways",
          edgeTypes: ["PART_OF", "PATHWAY_CONTAINS"],
          icon: <Route className="w-4 h-4" />,
          color: "#6366f1",
        },
      ];

    case "Phenotype":
      return [
        {
          label: "Find Genes",
          description: "Genes that manifest this phenotype",
          edgeTypes: ["MANIFESTS_AS"],
          icon: <Dna className="w-4 h-4" />,
          color: "#3b82f6",
        },
        {
          label: "Find Diseases",
          description: "Diseases that present with this phenotype",
          edgeTypes: ["PRESENTS_WITH"],
          icon: <HeartPulse className="w-4 h-4" />,
          color: "#ef4444",
        },
      ];

    case "Variant":
      return [
        {
          label: "Find Traits",
          description: "Traits associated with this variant",
          edgeTypes: ["ASSOCIATED_WITH"],
          icon: <Activity className="w-4 h-4" />,
          color: "#eab308",
        },
        {
          label: "Find Genes",
          description: "Genes annotated with this variant",
          edgeTypes: ["ANNOTATED_IN"],
          icon: <Dna className="w-4 h-4" />,
          color: "#3b82f6",
        },
      ];

    case "Trait":
      return [
        {
          label: "Find Variants",
          description: "Variants associated with this trait",
          edgeTypes: ["ASSOCIATED_WITH"],
          icon: <Activity className="w-4 h-4" />,
          color: "#f59e0b",
        },
        {
          label: "Find Diseases",
          description: "Diseases this trait maps to",
          edgeTypes: ["MAPS_TO"],
          icon: <HeartPulse className="w-4 h-4" />,
          color: "#d946ef",
        },
      ];

    default:
      return [];
  }
}

// =============================================================================
// Node Detail Component
// =============================================================================

interface NodeDetailProps {
  node: ExplorerNode;
  onExpand: (nodeId: string, edgeTypes?: EdgeType[]) => void;
  onRemove: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
}

function NodeDetail({ node, onExpand, onRemove, onFindPaths, isExpanding }: NodeDetailProps) {
  const colors = NODE_TYPE_COLORS[node.type] ?? { background: "#e2e8f0", border: "#94a3b8", text: "#334155" };
  const expansionOptions = getExpansionOptions(node.type);

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
        <h3 className="text-lg font-semibold text-slate-900">{node.label}</h3>
        <p className="text-xs font-mono text-slate-500">{node.id}</p>
      </div>

      {/* Stats */}
      {(node.degree !== undefined || node.hubScore !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {node.degree !== undefined && (
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <Network className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <div className="text-lg font-semibold text-slate-900">{node.degree}</div>
              <div className="text-xs text-slate-500">Connections</div>
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
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Explore Relationships
          </h4>
          <div className="space-y-1.5">
            {expansionOptions.map((option) => (
              <button
                key={option.label}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white text-left hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onExpand(node.id, option.edgeTypes)}
                disabled={isExpanding}
              >
                <div
                  className="mt-0.5 p-1 rounded"
                  style={{ backgroundColor: `${option.color}15`, color: option.color }}
                >
                  {isExpanding ? <Loader2 className="w-4 h-4 animate-spin" /> : option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{option.label}</div>
                  <div className="text-xs text-slate-500 truncate">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General Actions */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
          <span className="text-sm font-medium text-slate-700">
            {config?.label ?? edge.type}
          </span>
        </div>

        {/* Edge Direction */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-900">
            {sourceNode?.label ?? edge.sourceId}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">
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
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Data Sources
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {edge.evidence.sources.map((source, i) => (
              <span
                key={`${source}-${i}`}
                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded"
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
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
              <span className="px-2 py-0.5 text-slate-400 text-xs">
                +{edge.evidence.pubmedIds.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Detection Methods */}
      {edge.evidence?.detectionMethods && edge.evidence.detectionMethods.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Detection Methods
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {edge.evidence.detectionMethods.slice(0, 5).map((method, i) => (
              <span
                key={`${method}-${i}`}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
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
        <h3 className="text-lg font-semibold text-slate-900">
          {nodes.length} nodes selected
        </h3>
        <p className="text-sm text-slate-500">
          Compare nodes or find shared connections
        </p>
      </div>

      {/* Selected Nodes List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Selected Nodes
        </h4>
        <div className="space-y-1.5">
          {nodes.map((node) => {
            const colors = NODE_TYPE_COLORS[node.type];
            return (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {node.label}
                </span>
                <span className="text-xs text-slate-500">{node.type}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
  onClose,
  isExpanding,
}: InspectorPanelProps) {
  // Don't render if nothing selected
  if (selection.type === "none") {
    return null;
  }

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-medium text-slate-700">Inspector</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
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
      </div>
    </div>
  );
}

export const InspectorPanel = memo(InspectorPanelInner);
