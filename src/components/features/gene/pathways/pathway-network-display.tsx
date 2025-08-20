"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import cytoscape, { Core, ElementsDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import dagre from "cytoscape-dagre";
import cola from "cytoscape-cola";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { PathwayInteraction, PathwayGenes } from "@/lib/gene/pathways/api";
import { PATHWAY_SOURCES } from "@/lib/gene/pathways/constants";

// Register layout extensions
if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
  cytoscape.use(dagre);
  cytoscape.use(cola);
}

interface PathwayNetworkVisualizationProps {
  interactions: PathwayInteraction[];
  genes: PathwayGenes[];
  sourceInfo: {
    name: string;
    description: string;
    color: string;
    icon?: string;
  };
  onPathwaySelect: (pathway: string | null) => void;
  selectedPathway: string | null;
  onNodeSelect?: (node: string | null) => void;
  selectedNode?: string | null;
  pathwayData?: any;
  selectedSource?: string;
  onSourceSelect?: (source: string) => void;
}

// Cytoscape layout configurations
const LAYOUT_OPTIONS = {
  "cose-bilkent": {
    name: "cose-bilkent",
    quality: "default",
    nodeDimensionsIncludeLabels: true,
    randomize: false,
    packComponents: true,
    nodeRepulsion: 4500,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    animate: "end",
    animationDuration: 1000,
  },
  cola: {
    name: "cola",
    animate: true,
    animationDuration: 1000,
    randomize: false,
    maxSimulationTime: 1500,
    ungrabifyWhileSimulating: false,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    edgeLength: 100,
    avoidOverlap: true,
    handleDisconnected: true,
    convergenceThreshold: 0.01,
    nodeSpacing: 10,
  },
  circle: {
    name: "circle",
    fit: true,
    padding: 30,
    radius: 200,
    animate: true,
    animationDuration: 1000,
  },
} as const;

export const PathwayNetworkDisplay = React.memo(
  ({
    interactions,
    genes,
    sourceInfo,
    onPathwaySelect,
    selectedPathway,
    onNodeSelect,
    selectedNode: externalSelectedNode,
    pathwayData,
    selectedSource,
    onSourceSelect,
  }: PathwayNetworkVisualizationProps) => {
    const [internalSelectedNode, setInternalSelectedNode] = useState<
      string | null
    >(null);
    const selectedNode = externalSelectedNode ?? internalSelectedNode;
    const [currentLayout, setCurrentLayout] =
      useState<keyof typeof LAYOUT_OPTIONS>("cose-bilkent");
    const [interactionLimit, setInteractionLimit] = useState<number>(25);
    const [showAllInteractions, setShowAllInteractions] =
      useState<boolean>(false);
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<Core | null>(null);
    const isInitialized = useRef<boolean>(false);

    // Transform data to Cytoscape format (only when data actually changes, not selection)
    const cytoscapeElements = useMemo((): ElementsDefinition => {
      const nodes: cytoscape.NodeDefinition[] = [];
      const edges: cytoscape.EdgeDefinition[] = [];
      const nodeMap = new Set<string>();

      // Limit interactions for performance
      const limitedInteractions = showAllInteractions
        ? interactions
        : interactions.slice(0, interactionLimit);

      // First, add all unique genes from both interactions and pathway genes
      const allGenes = new Set<string>();

      // Add genes from limited interactions
      limitedInteractions.forEach((interaction) => {
        allGenes.add(interaction.gene_interactor_a);
        allGenes.add(interaction.gene_interactor_b);
      });

      // Add genes from pathway genes data
      genes.forEach((gene) => {
        allGenes.add(gene.gene_name);
      });

      // Create gene nodes (without selection-dependent styling)
      const geneArray = Array.from(allGenes);
      geneArray.forEach((gene) => {
        const geneInteractions = limitedInteractions.filter(
          (i) => i.gene_interactor_a === gene || i.gene_interactor_b === gene,
        );
        const degree = geneInteractions.length || 1;
        const width = Math.max(60, Math.min(120, gene.length * 8 + 20));
        const height = Math.max(30, Math.min(50, degree * 4 + 20));

        nodes.push({
          data: {
            id: gene,
            label: gene,
            type: "gene",
            degree: degree,
            interactions: geneInteractions,
            pathways: genes
              .filter((g) => g.gene_name === gene)
              .map((g) => g.pathway),
          },
          classes: "gene",
          style: {
            width: width,
            height: height,
            "background-color": "#10b981",
            color: "#ffffff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "11px",
            "font-weight": "bold",
            "border-width": 2,
            "border-color": "#ffffff",
            opacity: 1,
          },
        });
        nodeMap.add(gene);
      });

      // Add gene-gene interaction edges (without selection-dependent styling)
      limitedInteractions.forEach((interaction, index) => {
        const geneA = interaction.gene_interactor_a;
        const geneB = interaction.gene_interactor_b;

        edges.push({
          data: {
            id: `interaction-${geneA}-${geneB}-${index}`,
            source: geneA,
            target: geneB,
            pathway: interaction.pathway,
            method: interaction.method,
            type: "interaction",
          },
          classes: "interaction",
          style: {
            "line-color": "#3b82f6",
            width: 2,
            opacity: 0.8,
            "curve-style": "straight",
          },
        });
      });

      // Create pathway groups based ONLY on actual pathway membership, not interactions
      const pathwayGroups = new Map<
        string,
        {
          fromInteractions: string[];
          fromGenes: PathwayGenes[];
          pathwayMemberGenes: Set<string>; // Only genes that are actual members of this pathway
        }
      >();

      // First, collect pathways from genes data (these are the actual pathway memberships)
      genes.forEach((gene) => {
        const pathway = gene.pathway;
        if (!pathwayGroups.has(pathway)) {
          pathwayGroups.set(pathway, {
            fromInteractions: [],
            fromGenes: [],
            pathwayMemberGenes: new Set(),
          });
        }
        pathwayGroups.get(pathway)!.fromGenes.push(gene);
        pathwayGroups.get(pathway)!.pathwayMemberGenes.add(gene.gene_name);
      });

      // Then collect interaction data for context (but don't add genes to pathways based on this)
      limitedInteractions.forEach((interaction) => {
        const pathway = interaction.pathway;
        if (!pathwayGroups.has(pathway)) {
          pathwayGroups.set(pathway, {
            fromInteractions: [],
            fromGenes: [],
            pathwayMemberGenes: new Set(),
          });
        }
        pathwayGroups
          .get(pathway)!
          .fromInteractions.push(
            interaction.gene_interactor_a,
            interaction.gene_interactor_b,
          );
      });

      // Create pathway nodes (without selection-dependent styling)
      Array.from(pathwayGroups.entries()).forEach(([pathway, pathwayData]) => {
        if (!nodeMap.has(pathway)) {
          const pathwayMemberGenesArray = Array.from(
            pathwayData.pathwayMemberGenes,
          );

          nodes.push({
            data: {
              id: pathway,
              label:
                pathway.length > 15
                  ? pathway.substring(0, 15) + "..."
                  : pathway,
              fullLabel: pathway,
              type: "pathway",
              genes: pathwayData.fromGenes,
              pathwayMemberGenes: pathwayMemberGenesArray,
              hasInteractions: pathwayData.fromInteractions.length > 0,
            },
            classes: "pathway",
            style: {
              width: 80,
              height: 40,
              "background-color": "#8b5cf6",
              color: "#ffffff",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "8px",
              "font-weight": "bold",
              "border-width": 2,
              "border-color": "#ffffff",
              shape: "round-rectangle",
              "text-wrap": "wrap",
              "text-max-width": "70px",
            },
          });
          nodeMap.add(pathway);

          // Add edges ONLY to genes that are actual members of this pathway
          pathwayMemberGenesArray.forEach((geneName) => {
            if (nodeMap.has(geneName)) {
              edges.push({
                data: {
                  id: `pathway-${pathway}-${geneName}`,
                  source: pathway,
                  target: geneName,
                  pathway: pathway,
                  type: "pathway-gene",
                },
                classes: "pathway-gene",
                style: {
                  "line-color": "#8b5cf6",
                  width: 2,
                  opacity: 0.6,
                  "line-style": "dashed",
                  "curve-style": "straight",
                },
              });
            }
          });
        }
      });

      return { nodes, edges };
    }, [interactions, genes, interactionLimit, showAllInteractions]);

    // Initialize Cytoscape
    useEffect(() => {
      if (
        !cyRef.current ||
        typeof window === "undefined" ||
        isInitialized.current
      )
        return;

      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements: cytoscapeElements,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
            },
          },
          {
            selector: "node.gene",
            style: {
              shape: "ellipse",
            },
          },
          {
            selector: "node.pathway",
            style: {
              shape: "round-rectangle",
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-color": "#ef4444",
              "border-width": 3,
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "straight",
            },
          },
        ],
        layout: LAYOUT_OPTIONS[currentLayout],
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autounselectify: false,
      });

      // Apply adaptive zoom based on network size
      cyInstance.current.on("layoutstop", () => {
        if (!cyInstance.current) return;

        const nodeCount = cyInstance.current.nodes().length;
        const edgeCount = cyInstance.current.edges().length;

        cyInstance.current.fit();

        // Adaptive zoom based on network complexity
        let zoomFactor = 0.8; // Default zoom factor

        if (nodeCount < 10 && edgeCount < 20) {
          // Small networks: zoom out less to avoid too much empty space
          zoomFactor = 1.2;
        } else if (nodeCount < 20 && edgeCount < 50) {
          // Medium networks: moderate zoom
          zoomFactor = 1.0;
        } else if (nodeCount < 50 && edgeCount < 100) {
          // Large networks: zoom out more
          zoomFactor = 0.7;
        } else {
          // Very large networks: zoom out significantly
          zoomFactor = 0.5;
        }

        cyInstance.current.zoom(cyInstance.current.zoom() * zoomFactor);
      });

      // Event handlers
      cyInstance.current.on("tap", "node", function (evt) {
        const node = evt.target;
        const nodeData = node.data();

        const newSelectedNode =
          selectedNode === nodeData.id ? null : nodeData.id;

        if (onNodeSelect) {
          onNodeSelect(newSelectedNode);
        } else {
          setInternalSelectedNode(newSelectedNode);
        }

        if (nodeData.type === "pathway") {
          const pathway = nodeData.fullLabel || nodeData.id;
          onPathwaySelect(selectedPathway === pathway ? null : pathway);
        }
      });

      cyInstance.current.on("tap", function (evt) {
        if (evt.target === cyInstance.current) {
          if (onNodeSelect) {
            onNodeSelect(null);
          } else {
            setInternalSelectedNode(null);
          }
        }
      });

      isInitialized.current = true;

      return () => {
        if (cyInstance.current) {
          cyInstance.current.destroy();
          isInitialized.current = false;
        }
      };
    }, [cytoscapeElements]);

    // Update elements when data changes (not selection)
    useEffect(() => {
      if (cyInstance.current && isInitialized.current) {
        cyInstance.current.elements().remove();
        cyInstance.current.add(cytoscapeElements);
        const layout = cyInstance.current.layout(LAYOUT_OPTIONS[currentLayout]);

        layout.on("layoutstop", () => {
          if (!cyInstance.current) return;

          const nodeCount = cyInstance.current.nodes().length;
          const edgeCount = cyInstance.current.edges().length;

          cyInstance.current.fit();

          // Adaptive zoom based on network complexity
          let zoomFactor = 0.8; // Default zoom factor

          if (nodeCount < 10 && edgeCount < 20) {
            // Small networks: zoom out less to avoid too much empty space
            zoomFactor = 1.2;
          } else if (nodeCount < 20 && edgeCount < 50) {
            // Medium networks: moderate zoom
            zoomFactor = 1.0;
          } else if (nodeCount < 50 && edgeCount < 100) {
            // Large networks: zoom out more
            zoomFactor = 0.7;
          } else {
            // Very large networks: zoom out significantly
            zoomFactor = 0.5;
          }

          cyInstance.current.zoom(cyInstance.current.zoom() * zoomFactor);
        });

        layout.run();
      }
    }, [cytoscapeElements, currentLayout]);

    // Update visual styles when selection changes (no re-render of elements)
    useEffect(() => {
      if (!cyInstance.current) return;

      const cy = cyInstance.current;

      // Reset all styles first
      cy.nodes().style({
        "background-color": (node: any) => {
          const nodeData = node.data();
          return nodeData.type === "pathway" ? "#8b5cf6" : "#10b981";
        },
        "border-width": 2,
        "border-color": "#ffffff",
        opacity: (node: any) => {
          const nodeData = node.data();
          if (!selectedPathway) return 1;
          if (nodeData.type === "pathway") {
            return nodeData.fullLabel === selectedPathway ? 1 : 0.6;
          }
          // For genes, check if they belong to selected pathway
          const belongsToPathway =
            nodeData.pathways?.includes(selectedPathway) ||
            nodeData.interactions?.some(
              (i: any) => i.pathway === selectedPathway,
            );
          return belongsToPathway ? 1 : 0.6;
        },
      });

      cy.edges().style({
        "line-color": (edge: any) => {
          const edgeData = edge.data();
          if (!selectedPathway) {
            return edgeData.type === "pathway-gene" ? "#8b5cf6" : "#3b82f6";
          }
          const isHighlighted = edgeData.pathway === selectedPathway;
          if (edgeData.type === "pathway-gene") {
            return isHighlighted ? "#8b5cf6" : "#e5e7eb";
          }
          return isHighlighted ? "#3b82f6" : "#e5e7eb";
        },
        width: (edge: any) => {
          const edgeData = edge.data();
          if (!selectedPathway) return 2;
          const isHighlighted = edgeData.pathway === selectedPathway;
          return isHighlighted ? 2 : 1;
        },
        opacity: (edge: any) => {
          const edgeData = edge.data();
          if (!selectedPathway) {
            return edgeData.type === "pathway-gene" ? 0.6 : 0.8;
          }
          const isHighlighted = edgeData.pathway === selectedPathway;
          if (edgeData.type === "pathway-gene") {
            return isHighlighted ? 0.6 : 0.2;
          }
          return isHighlighted ? 0.8 : 0.3;
        },
      });

      // Apply selected node styles
      if (selectedNode) {
        const selectedNodeElement = cy.getElementById(selectedNode);
        if (selectedNodeElement.length > 0) {
          selectedNodeElement.style({
            "background-color": "#ef4444",
            "border-color": "#dc2626",
            "border-width": 3,
          });

          // Highlight connected edges
          const connectedEdges = selectedNodeElement.connectedEdges();
          connectedEdges.style({
            "line-color": "#ef4444",
            width: 3,
            opacity: 1,
          });
        }
      }

      // Apply selected pathway styles
      if (selectedPathway) {
        const selectedPathwayElement = cy.getElementById(selectedPathway);
        if (selectedPathwayElement.length > 0) {
          selectedPathwayElement.style({
            "background-color": "#3b82f6",
          });
        }
      }
    }, [selectedNode, selectedPathway]);

    const handleReset = useCallback(() => {
      if (onNodeSelect) {
        onNodeSelect(null);
      } else {
        setInternalSelectedNode(null);
      }
      onPathwaySelect(null);
      if (cyInstance.current) {
        cyInstance.current.fit();
      }
    }, [onPathwaySelect, onNodeSelect]);

    const handleZoomIn = useCallback(() => {
      if (cyInstance.current) {
        cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
      }
    }, []);

    const handleZoomOut = useCallback(() => {
      if (cyInstance.current) {
        cyInstance.current.zoom(cyInstance.current.zoom() * 0.8);
      }
    }, []);

    const handleFit = useCallback(() => {
      if (cyInstance.current) {
        cyInstance.current.fit();
      }
    }, []);

    const handleLayoutChange = useCallback(
      (layout: keyof typeof LAYOUT_OPTIONS) => {
        setCurrentLayout(layout);
        if (cyInstance.current) {
          cyInstance.current.layout(LAYOUT_OPTIONS[layout]).run();
        }
      },
      [],
    );

    if (cytoscapeElements.nodes.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No network data available for visualization
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden grid grid-cols-1">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <span className="text-lg">{sourceInfo.name} Network</span>
                <Badge
                  variant="outline"
                  className="text-xs font-medium hidden sm:inline-flex"
                >
                  {cytoscapeElements.nodes.length} nodes,{" "}
                  {cytoscapeElements.edges.length} edges
                </Badge>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-medium sm:hidden"
              >
                {cytoscapeElements.nodes.length}n,{" "}
                {cytoscapeElements.edges.length}e
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Select
                value={
                  showAllInteractions ? "all" : interactionLimit.toString()
                }
                onValueChange={(value) => {
                  if (value === "all") {
                    setShowAllInteractions(true);
                  } else {
                    setShowAllInteractions(false);
                    setInteractionLimit(Number(value));
                  }
                }}
              >
                <SelectTrigger className="w-20 sm:w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={currentLayout}
                onValueChange={(value) =>
                  handleLayoutChange(value as keyof typeof LAYOUT_OPTIONS)
                }
              >
                <SelectTrigger className="w-24 sm:w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(LAYOUT_OPTIONS).map((layout) => (
                    <SelectItem key={layout} value={layout}>
                      {layout.charAt(0).toUpperCase() + layout.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 relative">
          <div
            ref={cyRef}
            style={{ height: 450, width: "100%" }}
            className="bg-gray-50"
          />

          {/* Enhanced Legend */}
          <div className="absolute top-4 left-4 bg-background/90 border rounded-lg p-3 space-y-2 shadow-sm max-w-48">
            <div className="text-xs font-medium">Legend</div>

            {/* Nodes */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Pathways</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Genes</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Selected</span>
              </div>
            </div>

            {/* Edges */}
            <div className="space-y-1 pt-2 border-t">
              <div className="text-xs font-medium">Connections</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>Gene interactions</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-purple-500"></div>
                <span>Pathway membership</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t">
              Click genes/pathways to highlight connections
            </div>
          </div>

          {/* Node Information Panel */}
          {selectedNode &&
            (() => {
              const nodeData = cytoscapeElements.nodes.find(
                (n) => n.data.id === selectedNode,
              )?.data;
              if (!nodeData) return null;

              if (nodeData.type === "gene") {
                const geneInteractions = nodeData.interactions || [];
                const genePathways = nodeData.pathways || [];
                const relationshipTypes = new Map<string, number>();

                geneInteractions.forEach((interaction: any) => {
                  const method = interaction.method || "Unknown";
                  relationshipTypes.set(
                    method,
                    (relationshipTypes.get(method) || 0) + 1,
                  );
                });

                return (
                  <div className="absolute bottom-4 right-4 bg-background border rounded-lg p-4 max-w-sm shadow-lg">
                    <div className="text-sm font-semibold mb-2">
                      Gene: {selectedNode}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {geneInteractions.length} interaction
                      {geneInteractions.length !== 1 ? "s" : ""} •{" "}
                      {genePathways.length} pathway
                      {genePathways.length !== 1 ? "s" : ""}
                    </div>

                    {genePathways.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium mb-2">
                          Associated Pathways
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {genePathways
                            .slice(0, 5)
                            .map((pathway: string, index: number) => (
                              <span
                                key={index}
                                className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                              >
                                {pathway.length > 20
                                  ? pathway.substring(0, 20) + "..."
                                  : pathway}
                              </span>
                            ))}
                          {genePathways.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{genePathways.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {relationshipTypes.size > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2">
                          Interaction Methods
                        </div>
                        <div className="space-y-1">
                          {Array.from(relationshipTypes.entries()).map(
                            ([method, count]) => (
                              <div
                                key={method}
                                className="flex items-center gap-2"
                              >
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <div className="text-xs">
                                  <span className="font-medium">{method}:</span>
                                  <span className="text-muted-foreground ml-1">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (nodeData.type === "pathway") {
                const pathwayMemberGenes = nodeData.pathwayMemberGenes || [];
                return (
                  <div className="absolute bottom-4 right-4 bg-background border rounded-lg p-4 max-w-sm shadow-lg">
                    <div className="text-sm font-semibold mb-2">
                      Pathway: {nodeData.fullLabel || nodeData.id}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {pathwayMemberGenes.length} member gene
                      {pathwayMemberGenes.length !== 1 ? "s" : ""}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Filtering genes and interactions in this pathway
                    </div>

                    {pathwayMemberGenes.length > 0 &&
                      pathwayMemberGenes.length <= 10 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium mb-1">
                            Member Genes:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {pathwayMemberGenes
                              .slice(0, 10)
                              .map((geneName: string, index: number) => (
                                <span
                                  key={index}
                                  className="text-xs bg-muted px-2 py-1 rounded font-mono"
                                >
                                  {geneName}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                );
              }

              return null;
            })()}
        </CardContent>
      </Card>
    );
  },
);
