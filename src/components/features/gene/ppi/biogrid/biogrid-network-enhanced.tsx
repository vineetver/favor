"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from "react";
import cytoscape, { Core, EventObject } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import cola from "cytoscape-cola";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { BiogridInteraction } from "@/lib/gene/ppi/constants";
import type { BiogridProcessedInteraction } from "@/components/features/gene/ppi/biogrid/biogrid-types";
import {
  transformBiogridData,
  getBiogridUniqueValues,
} from "@/components/features/gene/ppi/biogrid/biogrid-transforms";
import { applyBiogridStyles, BIOGRID_LAYOUT_OPTIONS, biogridCytoscapeBaseStyle, BiogridLayoutType, createBiogridCytoscapeElements } from "@/lib/gene/ppi/biogrid-utils";
import { NetworkData, NetworkEdge, NetworkNode, VISUALIZATION_CONFIG, VisualizationType } from "@/lib/gene/ppi/types";
import { applyLayoutWithAdaptiveZoom } from "@/lib/gene/ppi/network-utils";
import { VisualizationSelector } from "../visualization-selector";
import { ChordWarning } from "../visualizations/chord/chord-warning";


// Lazy import for ChordDiagram to reduce initial bundle size
const ChordDiagram = React.lazy(() =>
  import("../visualizations/chord/chord-diagram").then((module) => ({
    default: module.ChordDiagram,
  })),
);

if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
  cytoscape.use(cola);
}

interface BiogridNetworkEnhancedProps {
  data: BiogridInteraction[];
  onNodeSelect?: (node: string | null) => void;
  selectedNode?: string | null;
  queryGene?: string;
}

const BiogridLegend = memo(() => (
  <div className="hidden md:block absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 space-y-3 shadow-lg max-w-64">
    <div className="text-xs font-semibold text-foreground">
      BioGRID Network Legend
    </div>

    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Nodes
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600 flex-shrink-0"></div>
        <span>Query Gene</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></div>
        <span>Highly Connected</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
        <span>Interacting Gene</span>
      </div>
    </div>

    <div className="space-y-2 pt-1 border-t border-border/50">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Interaction Evidence (Color)
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div
          className="w-6 h-2 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "#111827" }}
        ></div>
        <span>High (5+ studies)</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div
          className="w-6 h-2 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "#4b5563" }}
        ></div>
        <span>Medium (3-4 studies)</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div
          className="w-6 h-2 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "#9ca3af" }}
        ></div>
        <span>Low (2 studies)</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div
          className="w-6 h-2 rounded-sm flex-shrink-0"
          style={{ backgroundColor: "#e5e7eb" }}
        ></div>
        <span>Single Study</span>
      </div>
    </div>

    <div className="space-y-2 pt-1 border-t border-border/50">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Interaction Types (Style)
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="w-8 max-w-8 h-0.5 bg-gray-500 flex-shrink-0"></div>
        <span>Direct Interaction</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div
          className="w-8 max-w-8 h-0.5 flex-shrink-0"
          style={{
            background:
              "repeating-linear-gradient(to right, #6b7280 0px, #6b7280 8px, transparent 8px, transparent 16px)",
          }}
        ></div>
        <span>Physical Association</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div
          className="w-8 max-w-8 h-0.5 flex-shrink-0"
          style={{
            background:
              "repeating-linear-gradient(to right, #6b7280 0px, #6b7280 3px, transparent 3px, transparent 11px)",
          }}
        ></div>
        <span>Complex/Multiple</span>
      </div>
    </div>
  </div>
));

BiogridLegend.displayName = "BiogridLegend";

interface BiogridFiltersProps {
  interactionLimit: number;
  showAllInteractions: boolean;
  onInteractionLimitChange: (value: string) => void;
  filterByMethod: string;
  onMethodChange: (value: string) => void;
  filterByInteractionType: string;
  onTypeChange: (value: string) => void;
  uniqueMethods: string[];
  uniqueInteractionTypes: string[];
  isEmpty?: boolean;
}

const BiogridFilters = memo(
  ({
    interactionLimit,
    showAllInteractions,
    onInteractionLimitChange,
    filterByMethod,
    onMethodChange,
    filterByInteractionType,
    onTypeChange,
    uniqueMethods,
    uniqueInteractionTypes,
    isEmpty = false,
  }: BiogridFiltersProps) => (
    <div className="border-t pt-3 mt-2">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-muted-foreground">
          Data Filters
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={
                isEmpty ? "interaction-limit-empty" : "interaction-limit"
              }
              className="text-xs text-muted-foreground"
            >
              Interaction Limit
            </Label>
            <Select
              value={showAllInteractions ? "all" : interactionLimit.toString()}
              onValueChange={onInteractionLimitChange}
            >
              <SelectTrigger
                id={isEmpty ? "interaction-limit-empty" : "interaction-limit"}
                className="w-20 sm:w-24 h-8 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {uniqueMethods.length > 1 && (
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={
                  isEmpty ? "detection-method-empty" : "detection-method"
                }
                className="text-xs text-muted-foreground"
              >
                Detection Method
              </Label>
              <Select value={filterByMethod} onValueChange={onMethodChange}>
                <SelectTrigger
                  id={isEmpty ? "detection-method-empty" : "detection-method"}
                  className="w-32 sm:w-36 h-8 text-xs"
                >
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {uniqueMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {uniqueInteractionTypes.length > 1 && (
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={
                  isEmpty ? "interaction-type-empty" : "interaction-type"
                }
                className="text-xs text-muted-foreground"
              >
                Interaction Type
              </Label>
              <Select
                value={filterByInteractionType}
                onValueChange={onTypeChange}
              >
                <SelectTrigger
                  id={isEmpty ? "interaction-type-empty" : "interaction-type"}
                  className="w-28 sm:w-32 h-8 text-xs"
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueInteractionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  ),
);

BiogridFilters.displayName = "BiogridFilters";

export const BiogridNetworkEnhanced = React.memo(
  ({
    data,
    onNodeSelect,
    selectedNode: externalSelectedNode,
    queryGene,
  }: BiogridNetworkEnhancedProps) => {
    const [internalSelectedNode, setInternalSelectedNode] = useState<
      string | null
    >(null);
    const selectedNode = externalSelectedNode ?? internalSelectedNode;
    const [currentLayout, setCurrentLayout] =
      useState<BiogridLayoutType>("cose-bilkent");
    const [currentView, setCurrentView] =
      useState<VisualizationType>("network");
    const [showChordWarning, setShowChordWarning] = useState<boolean>(false);
    const [interactionLimit, setInteractionLimit] = useState<number>(50);
    const [showAllInteractions, setShowAllInteractions] =
      useState<boolean>(false);
    const [filterByMethod, setFilterByMethod] = useState<string>("all");
    const [filterByInteractionType, setFilterByInteractionType] =
      useState<string>("all");
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<Core | null>(null);
    const isInitialized = useRef<boolean>(false);
    const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const layoutOperationRef = useRef<(() => void) | null>(null);
    const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingFilterUpdates = useRef<{
      interactionLimit?: number;
      showAllInteractions?: boolean;
      filterByMethod?: string;
      filterByInteractionType?: string;
    }>({});

    const networkData = useMemo(() => transformBiogridData(data), [data]);

    const uniqueMethods = useMemo(
      () =>
        getBiogridUniqueValues(
          networkData,
          (i: BiogridProcessedInteraction) => i.method,
        ),
      [networkData],
    );

    const uniqueInteractionTypes = useMemo(
      () =>
        getBiogridUniqueValues(
          networkData,
          (i: BiogridProcessedInteraction) => i.interaction_type,
        ),
      [networkData],
    );

    const filterState = useMemo(
      () => ({
        interactionLimit,
        showAllInteractions,
        filterByMethod,
        filterByInteractionType,
        queryGene,
      }),
      [
        interactionLimit,
        showAllInteractions,
        filterByMethod,
        filterByInteractionType,
        queryGene,
      ],
    );

    const memoizedLayoutOptions = useMemo(
      () => BIOGRID_LAYOUT_OPTIONS[currentLayout],
      [currentLayout],
    );

    const filteredNetworkData = useMemo(() => {
      const hasMethodFilter = filterState.filterByMethod !== "all";
      const hasTypeFilter = filterState.filterByInteractionType !== "all";

      if (!hasMethodFilter && !hasTypeFilter) {
        return { data: networkData, isRelaxed: false };
      }

      let filtered = networkData;

      if (hasMethodFilter) {
        filtered = filtered.filter((i: BiogridProcessedInteraction) => {
          const methodMatches = i.method
            ? i.method
                .split(";")
                .map((m) => m.trim())
                .includes(filterState.filterByMethod)
            : false;
          return methodMatches;
        });
      }

      if (hasTypeFilter) {
        filtered = filtered.filter((i: BiogridProcessedInteraction) => {
          const typeMatches = i.interaction_type
            ? i.interaction_type
                .split(";")
                .map((t) => t.trim())
                .includes(filterState.filterByInteractionType)
            : false;
          return typeMatches;
        });
      }

      const isRelaxed =
        filtered.length === 0 && (hasMethodFilter || hasTypeFilter);
      if (isRelaxed) {
        console.info("Filters relaxed to show available data");
        return { data: networkData, isRelaxed: true };
      }

      return { data: filtered, isRelaxed: false };
    }, [networkData, filterState]);

    const cytoscapeElements = useMemo(() => {
      return createBiogridCytoscapeElements(
        filteredNetworkData.data,
        filterState.interactionLimit,
        filterState.showAllInteractions,
        filterState.filterByMethod,
        filterState.filterByInteractionType,
        filterState.queryGene,
      );
    }, [filteredNetworkData.data, filterState]);

    const isRelaxed = filteredNetworkData.isRelaxed;

    // Transform cytoscape elements to NetworkData format for the visualization system
    const transformedNetworkData = useMemo((): NetworkData => {
      const nodes: NetworkNode[] = cytoscapeElements.nodes.map((node) => ({
        id: node.data.id || `node-${node.data.id}`,
        label: node.data.label || node.data.id || "Unknown",
        degree: node.data.degree || 0,
        isQueryGene: node.data.isQueryGene || false,
        interactions: node.data.interactions || [],
        methods: node.data.methods || [],
        interactionTypes: node.data.interactionTypes || [],
      }));

      const edges: NetworkEdge[] = cytoscapeElements.edges.map((edge) => ({
        id: edge.data.id || `edge-${edge.data.source}-${edge.data.target}`,
        source: edge.data.source || "unknown",
        target: edge.data.target || "unknown",
        weight: edge.data.weight || 1,
        studyCount: edge.data.studyCount || 1,
        interactionType: edge.data.interactionType || "direct",
        method: edge.data.method || "unknown",
      }));

      return { nodes, edges };
    }, [cytoscapeElements]);

    // Lazy computation for chord diagram matrix (only when needed)
    const chordDiagramData = useMemo(() => {
      if (currentView !== "chord") {
        return { matrix: [], labels: [], nodeData: {}, edges: [] };
      }

      const nodeMap = new Map(
        transformedNetworkData.nodes.map((node, index) => [node.id, index]),
      );
      const matrix: number[][] = Array(transformedNetworkData.nodes.length)
        .fill(null)
        .map(() => Array(transformedNetworkData.nodes.length).fill(0));

      transformedNetworkData.edges.forEach((edge) => {
        const sourceIndex = nodeMap.get(edge.source);
        const targetIndex = nodeMap.get(edge.target);

        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const weight = edge.weight || edge.studyCount || 1;
          matrix[sourceIndex][targetIndex] = weight;
          matrix[targetIndex][sourceIndex] = weight;
        }
      });

      return {
        matrix,
        labels: transformedNetworkData.nodes.map(
          (node) => node.label || node.id,
        ),
        nodeData: transformedNetworkData.nodes.reduce(
          (acc, node) => {
            acc[node.id] = node;
            return acc;
          },
          {} as Record<string, any>,
        ),
        edges: transformedNetworkData.edges,
      };
    }, [transformedNetworkData, currentView]);

    // Cytoscape-specific logic (only for network view)
    useEffect(() => {
      if (
        currentView !== "network" ||
        !cyRef.current ||
        typeof window === "undefined" ||
        isInitialized.current
      )
        return;

      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements: cytoscapeElements,
        style: biogridCytoscapeBaseStyle,
        layout: memoizedLayoutOptions,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autounselectify: false,
      });

      const handleLayoutStop = () => {
        if (cyInstance.current) {
          applyLayoutWithAdaptiveZoom(cyInstance.current);
        }
      };

      const handleNodeTap = (evt: EventObject) => {
        const node = evt.target;
        const nodeData = node.data();

        const newSelectedNode =
          selectedNode === nodeData.id ? null : nodeData.id;

        if (onNodeSelect) {
          onNodeSelect(newSelectedNode);
        } else {
          setInternalSelectedNode(newSelectedNode);
        }
      };

      const handleBackgroundTap = (evt: EventObject) => {
        if (
          evt.target === cyInstance.current ||
          evt.target === cyInstance.current?.container()
        ) {
          if (onNodeSelect) {
            onNodeSelect(null);
          } else {
            setInternalSelectedNode(null);
          }
        }
      };

      cyInstance.current.on("layoutstop", handleLayoutStop);
      cyInstance.current.on("tap", "node", handleNodeTap);
      cyInstance.current.on("tap", handleBackgroundTap);

      isInitialized.current = true;

      return () => {
        // Comprehensive cleanup for memory management
        if (cyInstance.current) {
          // Remove all event listeners first
          cyInstance.current.off("layoutstop", handleLayoutStop);
          cyInstance.current.off("tap", "node", handleNodeTap);
          cyInstance.current.off("tap", handleBackgroundTap);

          // Clear all elements before destroying to prevent memory leaks
          try {
            cyInstance.current.elements().remove();
            cyInstance.current.destroy();
          } catch (error) {
            console.warn("Error during Cytoscape cleanup:", error);
          }

          cyInstance.current = null;
          isInitialized.current = false;
        }

        // Clear all pending operations
        if (layoutTimeoutRef.current) {
          clearTimeout(layoutTimeoutRef.current);
          layoutTimeoutRef.current = null;
        }
        if (filterTimeoutRef.current) {
          clearTimeout(filterTimeoutRef.current);
          filterTimeoutRef.current = null;
        }

        // Clear pending operations and data
        layoutOperationRef.current = null;
        pendingFilterUpdates.current = {};
      };
    }, [currentView, cytoscapeElements, onNodeSelect]);

    // Reset cytoscape when switching back to network view
    useEffect(() => {
      if (currentView === "network") {
        isInitialized.current = false;
      }
    }, [currentView]);

    const runLayoutOperation = useCallback((operation: () => void) => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }

      layoutOperationRef.current = operation;

      layoutTimeoutRef.current = setTimeout(() => {
        if (layoutOperationRef.current) {
          layoutOperationRef.current();
          layoutOperationRef.current = null;
        }
      }, 150); // Increased for better performance with large datasets
    }, []);

    const applyPendingFilterUpdates = useCallback(() => {
      const updates = pendingFilterUpdates.current;

      if (updates.interactionLimit !== undefined) {
        setInteractionLimit(updates.interactionLimit);
      }
      if (updates.showAllInteractions !== undefined) {
        setShowAllInteractions(updates.showAllInteractions);
      }
      if (updates.filterByMethod !== undefined) {
        setFilterByMethod(updates.filterByMethod);
      }
      if (updates.filterByInteractionType !== undefined) {
        setFilterByInteractionType(updates.filterByInteractionType);
      }

      pendingFilterUpdates.current = {};
    }, []);

    const runFilterOperation = useCallback(
      (filterUpdates: {
        interactionLimit?: number;
        showAllInteractions?: boolean;
        filterByMethod?: string;
        filterByInteractionType?: string;
      }) => {
        if (filterTimeoutRef.current) {
          clearTimeout(filterTimeoutRef.current);
        }

        // Accumulate pending updates
        pendingFilterUpdates.current = {
          ...pendingFilterUpdates.current,
          ...filterUpdates,
        };

        filterTimeoutRef.current = setTimeout(() => {
          React.startTransition(() => {
            applyPendingFilterUpdates();
          });
        }, 300); // Longer debounce for data filtering operations
      },
      [applyPendingFilterUpdates],
    );

    useEffect(() => {
      if (
        cyInstance.current &&
        isInitialized.current &&
        currentView === "network"
      ) {
        runLayoutOperation(() => {
          if (!cyInstance.current) return;

          try {
            // Use json() for efficient bulk updates instead of remove/add
            const currentJson = cyInstance.current.json();
            const newJson = {
              ...currentJson,
              elements: cytoscapeElements,
            };

            cyInstance.current.json(newJson);

            applyBiogridStyles(cyInstance.current, selectedNode);

            const layout = cyInstance.current.layout(memoizedLayoutOptions);
            layout.on("layoutstop", () => {
              if (cyInstance.current) {
                applyLayoutWithAdaptiveZoom(cyInstance.current);
              }
            });

            layout.run();
          } catch (error) {
            console.error("Layout update error:", error);
          }
        });
      }
    }, [cytoscapeElements, currentLayout, runLayoutOperation, currentView]);

    useEffect(() => {
      if (cyInstance.current && currentView === "network") {
        applyBiogridStyles(cyInstance.current, selectedNode);
      }
    }, [selectedNode, currentView]);

    // Component unmount cleanup
    useEffect(() => {
      return () => {
        // Clear any remaining timeouts on unmount
        if (layoutTimeoutRef.current) {
          clearTimeout(layoutTimeoutRef.current);
        }
        if (filterTimeoutRef.current) {
          clearTimeout(filterTimeoutRef.current);
        }

        // Clear pending operations
        layoutOperationRef.current = null;
        pendingFilterUpdates.current = {};
      };
    }, []);

    const handleReset = useCallback(() => {
      if (onNodeSelect) {
        onNodeSelect(null);
      } else {
        setInternalSelectedNode(null);
      }
      if (cyInstance.current && currentView === "network") {
        cyInstance.current.fit();
      }
    }, [onNodeSelect, currentView]);

    const handleZoomIn = useCallback(() => {
      if (cyInstance.current && currentView === "network") {
        cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
      }
    }, [currentView]);

    const handleZoomOut = useCallback(() => {
      if (cyInstance.current && currentView === "network") {
        cyInstance.current.zoom(cyInstance.current.zoom() * 0.8);
      }
    }, [currentView]);

    const handleFit = useCallback(() => {
      if (cyInstance.current && currentView === "network") {
        cyInstance.current.fit();
      }
    }, [currentView]);

    const handleInteractionLimitChange = useCallback(
      (value: string) => {
        if (value === "all") {
          runFilterOperation({ showAllInteractions: true });
        } else {
          runFilterOperation({
            showAllInteractions: false,
            interactionLimit: Number(value),
          });
        }
      },
      [runFilterOperation],
    );

    const handleMethodChange = useCallback(
      (value: string) => {
        runFilterOperation({ filterByMethod: value });
      },
      [runFilterOperation],
    );

    const handleTypeChange = useCallback(
      (value: string) => {
        runFilterOperation({ filterByInteractionType: value });
      },
      [runFilterOperation],
    );

    const stableNodeSelectHandler = useCallback(
      (node: string | null) => {
        if (onNodeSelect) {
          onNodeSelect(node);
        } else {
          setInternalSelectedNode(node);
        }
      },
      [onNodeSelect],
    );

    const handleLayoutChange = useCallback(
      (layout: BiogridLayoutType) => {
        setCurrentLayout(layout);
        if (cyInstance.current && currentView === "network") {
          runLayoutOperation(() => {
            if (!cyInstance.current) return;

            try {
              cyInstance.current.nodes().ungrabify();

              const newLayout = cyInstance.current.layout(
                BIOGRID_LAYOUT_OPTIONS[layout],
              );
              newLayout.on("layoutstop", () => {
                if (cyInstance.current) {
                  applyLayoutWithAdaptiveZoom(cyInstance.current);
                  cyInstance.current.nodes().grabify();
                }
              });

              newLayout.run();
            } catch (error) {
              console.error("Layout change error:", error);
            }
          });
        }
      },
      [runLayoutOperation, currentView],
    );

    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No BioGRID network data available for visualization
            </div>
          </CardContent>
        </Card>
      );
    }

    if (cytoscapeElements.nodes.length === 0) {
      return (
        <Card className="overflow-hidden grid grid-cols-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start">
                <div className="flex items-center gap-3">
                  <span className="text-lg">BioGRID Network</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium hidden sm:inline-flex"
                  >
                    0 nodes, 0 edges
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-medium sm:hidden"
                >
                  0n, 0e
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap font-normal">
                <VisualizationSelector
                  currentView={currentView}
                  onViewChange={(view) => {
                    if (
                      view === "chord" &&
                      cytoscapeElements.nodes.length >
                        VISUALIZATION_CONFIG.CHORD_MAX_NODES
                    ) {
                      setShowChordWarning(true);
                    }
                    setCurrentView(view);
                  }}
                  nodeCount={cytoscapeElements.nodes.length}
                  id="biogrid-view-empty"
                />

                <div className="h-4 w-px bg-border hidden sm:block" />

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Layout:
                  </span>
                  <Select
                    value={currentLayout}
                    onValueChange={(value) =>
                      handleLayoutChange(value as BiogridLayoutType)
                    }
                  >
                    <SelectTrigger className="w-24 sm:w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(BIOGRID_LAYOUT_OPTIONS).map((layout) => {
                        const displayName =
                          layout === "cose-bilkent"
                            ? "Cose-Bilkent"
                            : layout === "cola"
                              ? "Cola"
                              : layout === "circle"
                                ? "Circle"
                                : layout.charAt(0).toUpperCase() +
                                  layout.slice(1);
                        return (
                          <SelectItem key={layout} value={layout}>
                            {displayName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-4 w-px bg-border hidden sm:block" />

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleFit}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardTitle>

            <BiogridFilters
              interactionLimit={interactionLimit}
              showAllInteractions={showAllInteractions}
              onInteractionLimitChange={handleInteractionLimitChange}
              filterByMethod={filterByMethod}
              onMethodChange={handleMethodChange}
              filterByInteractionType={filterByInteractionType}
              onTypeChange={handleTypeChange}
              uniqueMethods={uniqueMethods}
              uniqueInteractionTypes={uniqueInteractionTypes}
              isEmpty={true}
            />
          </CardHeader>

          <CardContent className="p-12 text-center">
            <div className="space-y-3">
              <div className="text-muted-foreground">
                No interactions match the selected filters
              </div>
              <div className="text-sm text-muted-foreground">
                Try adjusting your filter settings or selecting "All" for
                methods and types
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    React.startTransition(() => {
                      setFilterByMethod("all");
                      setFilterByInteractionType("all");
                    });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden grid grid-cols-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <span className="text-lg">BioGRID Network</span>
                <Badge
                  variant="outline"
                  className="text-xs font-medium hidden sm:inline-flex"
                >
                  {cytoscapeElements.nodes.length} nodes,{" "}
                  {cytoscapeElements.edges.length} edges
                </Badge>
                {isRelaxed && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium bg-amber-100 text-amber-800 border-amber-200"
                  >
                    Filters Relaxed
                  </Badge>
                )}
              </div>
              <Badge
                variant="outline"
                className="text-xs font-medium sm:hidden"
              >
                {cytoscapeElements.nodes.length}n,{" "}
                {cytoscapeElements.edges.length}e
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap font-normal">
              <VisualizationSelector
                currentView={currentView}
                onViewChange={(view) => {
                  if (
                    view === "chord" &&
                    cytoscapeElements.nodes.length >
                      VISUALIZATION_CONFIG.CHORD_MAX_NODES
                  ) {
                    setShowChordWarning(true);
                  }
                  setCurrentView(view);
                }}
                nodeCount={cytoscapeElements.nodes.length}
                id="biogrid-view"
              />

              <div className="h-4 w-px bg-border hidden sm:block" />

              {currentView === "network" && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Layout:
                    </span>
                    <Select
                      value={currentLayout}
                      onValueChange={(value) =>
                        handleLayoutChange(value as BiogridLayoutType)
                      }
                    >
                      <SelectTrigger className="w-24 sm:w-28 text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(BIOGRID_LAYOUT_OPTIONS).map((layout) => {
                          const displayName =
                            layout === "cose-bilkent"
                              ? "Cose-Bilkent"
                              : layout === "cola"
                                ? "Cola"
                                : layout === "circle"
                                  ? "Circle"
                                  : layout.charAt(0).toUpperCase() +
                                    layout.slice(1);
                          return (
                            <SelectItem key={layout} value={layout}>
                              {displayName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-4 w-px bg-border hidden sm:block" />

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleZoomIn}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleZoomOut}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleFit}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardTitle>

          <BiogridFilters
            interactionLimit={interactionLimit}
            showAllInteractions={showAllInteractions}
            onInteractionLimitChange={handleInteractionLimitChange}
            filterByMethod={filterByMethod}
            onMethodChange={handleMethodChange}
            filterByInteractionType={filterByInteractionType}
            onTypeChange={handleTypeChange}
            uniqueMethods={uniqueMethods}
            uniqueInteractionTypes={uniqueInteractionTypes}
          />
        </CardHeader>

        <CardContent className="p-0 relative">
          {currentView === "network" ? (
            <>
              <div
                ref={cyRef}
                style={{ height: 650, width: "100%" }}
                className="bg-gray-50"
              />

              <BiogridLegend />
            </>
          ) : showChordWarning &&
            cytoscapeElements.nodes.length >
              VISUALIZATION_CONFIG.CHORD_MAX_NODES ? (
            <ChordWarning
              nodeCount={cytoscapeElements.nodes.length}
              onSwitchToNetwork={() => {
                setCurrentView("network");
                setShowChordWarning(false);
              }}
              onProceedAnyway={() => {
                setShowChordWarning(false);
              }}
            />
          ) : (
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-[550px] w-full">
                  <div className="text-center space-y-2">
                    <div className="text-muted-foreground">
                      Loading chord diagram...
                    </div>
                    <div className="w-6 h-6 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              }
            >
              <ChordDiagram
                data={chordDiagramData}
                selectedNode={selectedNode}
                onNodeSelect={stableNodeSelectHandler}
                queryGene={queryGene}
                width={600}
                height={550}
              />
            </React.Suspense>
          )}

          {selectedNode &&
            (() => {
              const nodeData = cytoscapeElements.nodes.find(
                (n) => n.data.id === selectedNode,
              )?.data;
              if (!nodeData) return null;

              const geneInteractions = (nodeData.interactions ||
                []) as BiogridProcessedInteraction[];
              const methods = (nodeData.methods || []) as string[];
              const interactionTypes = (nodeData.interactionTypes ||
                []) as string[];
              const isQueryGene = nodeData.isQueryGene;

              const partners = Array.from(
                new Set(
                  geneInteractions.map((i: BiogridProcessedInteraction) =>
                    i.gene_a === selectedNode ? i.gene_b : i.gene_a,
                  ),
                ),
              ) as string[];

              const publications = Array.from(
                new Set(
                  geneInteractions
                    .map((i: BiogridProcessedInteraction) => i.publication)
                    .filter(Boolean),
                ),
              ) as string[];

              return (
                <TooltipProvider>
                  <div className="absolute bottom-4 right-4 w-64 bg-background border rounded-lg p-4 max-w-sm shadow-lg max-h-80 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-sm font-semibold">
                        {selectedNode}
                      </div>
                      {isQueryGene ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="text-xs">
                              Query Gene
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The main gene being analyzed</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : nodeData.degree >= 5 ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-100 text-amber-800 border-amber-200"
                            >
                              Highly Connected
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Gene with many protein interactions (hub protein)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              Normal Interactor
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Gene with standard interaction connectivity</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    <div className="space-y-3">
                      {interactionTypes.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
                            Interaction Types
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {interactionTypes.map((type: string) => (
                              <div
                                key={type}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {type}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {methods.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
                            Detection Methods
                          </div>
                          <div className="space-y-1">
                            {methods.map((method: string) => (
                              <div
                                key={method}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="truncate">{method}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {partners.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
                            Partners ({partners.length})
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {partners.slice(0, 5).map((partner: string) => (
                              <div
                                key={partner}
                                className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                              >
                                {partner}
                              </div>
                            ))}
                            {partners.length > 5 && (
                              <div className="text-xs text-muted-foreground px-2 py-1">
                                +{partners.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {publications.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
                            Key Publications ({publications.length})
                          </div>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {publications.slice(0, 10).map((pub: string) => (
                              <div
                                key={pub}
                                className="text-xs text-muted-foreground truncate"
                              >
                                {pub}
                              </div>
                            ))}
                            {publications.length > 10 && (
                              <div className="text-xs text-muted-foreground">
                                +{publications.length - 10} more publications
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              );
            })()}
        </CardContent>
      </Card>
    );
  },
);
