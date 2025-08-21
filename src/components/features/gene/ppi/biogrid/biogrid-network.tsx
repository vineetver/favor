"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
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
import { applyLayoutWithAdaptiveZoom } from "@/lib/gene/ppi/network-utils";
import {
  createBiogridCytoscapeElements,
  applyBiogridStyles,
  biogridCytoscapeBaseStyle,
  BIOGRID_LAYOUT_OPTIONS,
  BiogridLayoutType,
} from "@/lib/gene/ppi/biogrid-utils";

if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
  cytoscape.use(cola);
}

interface BiogridNetworkProps {
  data: BiogridInteraction[];
  onNodeSelect?: (node: string | null) => void;
  selectedNode?: string | null;
  queryGene?: string;
}

export const BiogridNetwork = React.memo(
  ({
    data,
    onNodeSelect,
    selectedNode: externalSelectedNode,
    queryGene,
  }: BiogridNetworkProps) => {
    const [internalSelectedNode, setInternalSelectedNode] = useState<
      string | null
    >(null);
    const selectedNode = externalSelectedNode ?? internalSelectedNode;
    const [currentLayout, setCurrentLayout] =
      useState<BiogridLayoutType>("cose-bilkent");
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

    const memoizedLayoutOptions = useMemo(
      () => BIOGRID_LAYOUT_OPTIONS[currentLayout],
      [currentLayout],
    );

    const { cytoscapeElements, isRelaxed } = useMemo(() => {
      const result = createBiogridCytoscapeElements(
        networkData,
        interactionLimit,
        showAllInteractions,
        filterByMethod,
        filterByInteractionType,
        queryGene,
      );

      const hasMethodFilter = filterByMethod !== "all";
      const hasTypeFilter = filterByInteractionType !== "all";

      let relaxed = false;
      if (hasMethodFilter && hasTypeFilter && result.nodes.length > 0) {
        const interactionsMatchingBoth = networkData.filter(
          (i: BiogridProcessedInteraction) => {
            const methodMatches = i.method
              ? i.method
                  .split(";")
                  .map((m) => m.trim())
                  .includes(filterByMethod)
              : false;
            const typeMatches = i.interaction_type
              ? i.interaction_type
                  .split(";")
                  .map((t) => t.trim())
                  .includes(filterByInteractionType)
              : false;
            return methodMatches && typeMatches;
          },
        );

        relaxed = interactionsMatchingBoth.length === 0;

        if (relaxed) {
          console.info("Filters relaxed to show available data");
        }
      }

      return { cytoscapeElements: result, isRelaxed: relaxed };
    }, [
      networkData,
      interactionLimit,
      showAllInteractions,
      filterByMethod,
      filterByInteractionType,
      queryGene,
    ]);

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
        if (cyInstance.current) {
          cyInstance.current.off("layoutstop", handleLayoutStop);
          cyInstance.current.off("tap", "node", handleNodeTap);
          cyInstance.current.off("tap", handleBackgroundTap);
          cyInstance.current.destroy();
          cyInstance.current = null;
          isInitialized.current = false;
        }
        if (layoutTimeoutRef.current) {
          clearTimeout(layoutTimeoutRef.current);
          layoutTimeoutRef.current = null;
        }
      };
    }, []);

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
      }, 100);
    }, []);

    useEffect(() => {
      if (cyInstance.current && isInitialized.current) {
        runLayoutOperation(() => {
          if (!cyInstance.current) return;

          try {
            cyInstance.current.elements().remove();
            cyInstance.current.add(cytoscapeElements);

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
    }, [cytoscapeElements, currentLayout, runLayoutOperation]);

    useEffect(() => {
      if (cyInstance.current) {
        applyBiogridStyles(cyInstance.current, selectedNode);
      }
    }, [selectedNode]);

    const handleReset = useCallback(() => {
      if (onNodeSelect) {
        onNodeSelect(null);
      } else {
        setInternalSelectedNode(null);
      }
      if (cyInstance.current) {
        cyInstance.current.fit();
      }
    }, [onNodeSelect]);

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
      (layout: BiogridLayoutType) => {
        setCurrentLayout(layout);
        if (cyInstance.current) {
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
      [runLayoutOperation],
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

            <div className="border-t pt-3 mt-2">
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Data Filters
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="interaction-limit-empty"
                      className="text-xs text-muted-foreground"
                    >
                      Interaction Limit
                    </Label>
                    <Select
                      value={
                        showAllInteractions
                          ? "all"
                          : interactionLimit.toString()
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
                      <SelectTrigger
                        id="interaction-limit-empty"
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
                        htmlFor="detection-method-empty"
                        className="text-xs text-muted-foreground"
                      >
                        Detection Method
                      </Label>
                      <Select
                        value={filterByMethod}
                        onValueChange={(value) =>
                          React.startTransition(() => setFilterByMethod(value))
                        }
                      >
                        <SelectTrigger
                          id="detection-method-empty"
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
                        htmlFor="interaction-type-empty"
                        className="text-xs text-muted-foreground"
                      >
                        Interaction Type
                      </Label>
                      <Select
                        value={filterByInteractionType}
                        onValueChange={(value) =>
                          React.startTransition(() =>
                            setFilterByInteractionType(value),
                          )
                        }
                      >
                        <SelectTrigger
                          id="interaction-type-empty"
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
            </div>
          </CardTitle>

          <div className="border-t pt-3 mt-2">
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium text-muted-foreground">
                Data Filters
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="interaction-limit"
                    className="text-xs text-muted-foreground"
                  >
                    Interaction Limit
                  </Label>
                  <Select
                    value={
                      showAllInteractions ? "all" : interactionLimit.toString()
                    }
                    onValueChange={(value) => {
                      React.startTransition(() => {
                        if (value === "all") {
                          setShowAllInteractions(true);
                        } else {
                          setShowAllInteractions(false);
                          setInteractionLimit(Number(value));
                        }
                      });
                    }}
                  >
                    <SelectTrigger
                      id="interaction-limit"
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
                      htmlFor="detection-method"
                      className="text-xs text-muted-foreground"
                    >
                      Detection Method
                    </Label>
                    <Select
                      value={filterByMethod}
                      onValueChange={(value) =>
                        React.startTransition(() => setFilterByMethod(value))
                      }
                    >
                      <SelectTrigger
                        id="detection-method"
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
                      htmlFor="interaction-type"
                      className="text-xs text-muted-foreground"
                    >
                      Interaction Type
                    </Label>
                    <Select
                      value={filterByInteractionType}
                      onValueChange={(value) =>
                        React.startTransition(() =>
                          setFilterByInteractionType(value),
                        )
                      }
                    >
                      <SelectTrigger
                        id="interaction-type"
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
        </CardHeader>

        <CardContent className="p-0 relative">
          <div
            ref={cyRef}
            style={{ height: 600, width: "100%" }}
            className="bg-gray-50"
          />

          <div className="hidden md:block absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 space-y-3 shadow-lg max-w-64">
            <div className="text-xs font-semibold text-foreground">
              BioGRID Network Legend
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Nodes
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600 flex-shrink-0"></div>
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
                Interaction Types
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="w-8 max-w-8 h-0.5 bg-blue-500 flex-shrink-0"></div>
                <span>Direct Interaction</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div
                  className="w-8 max-w-8 h-0.5 flex-shrink-0"
                  style={{
                    background:
                      "repeating-linear-gradient(to right, #3b82f6 0px, #3b82f6 8px, transparent 8px, transparent 16px)",
                  }}
                ></div>
                <span>Physical Association</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div
                  className="w-8 max-w-8 h-0.5 flex-shrink-0"
                  style={{
                    background:
                      "repeating-linear-gradient(to right, #3b82f6 0px, #3b82f6 3px, transparent 3px, transparent 11px)",
                  }}
                ></div>
                <span>Complex/Multiple</span>
              </div>
            </div>
          </div>

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
