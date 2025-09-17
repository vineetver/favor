"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import cytoscape, { Core } from "cytoscape";
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
import type { HuriInteraction } from "@/lib/gene/ppi/constants";
import {
  applyCytoscapeStyles,
  calculateAdaptiveZoom,
  createCytoscapeElements,
  cytoscapeBaseStyle,
  LAYOUT_OPTIONS,
  LayoutType,
} from "@/lib/gene/ppi/network-utils";
import {
  transformHuriToUnified,
  transformToNetworkData,
} from "../data-transforms";

if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
  cytoscape.use(dagre);
  cytoscape.use(cola);
}

interface HuriNetworkProps {
  data: HuriInteraction[];
  onNodeSelect?: (node: string | null) => void;
  selectedNode?: string | null;
}

export const HuriNetwork = React.memo(
  ({
    data,
    onNodeSelect,
    selectedNode: externalSelectedNode,
  }: HuriNetworkProps) => {
    const [internalSelectedNode, setInternalSelectedNode] = useState<
      string | null
    >(null);
    const selectedNode = externalSelectedNode ?? internalSelectedNode;
    const [currentLayout, setCurrentLayout] =
      useState<LayoutType>("cose-bilkent");
    const [interactionLimit, setInteractionLimit] = useState<number>(50);
    const [showAllInteractions, setShowAllInteractions] =
      useState<boolean>(false);
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<Core | null>(null);
    const isInitialized = useRef<boolean>(false);

    const transformedData = useMemo(
      () => transformHuriToUnified(data, "HuRI"),
      [data],
    );

    const networkData = useMemo(
      () => transformToNetworkData(transformedData),
      [transformedData],
    );

    const cytoscapeElements = useMemo(
      () =>
        createCytoscapeElements(
          networkData,
          interactionLimit,
          showAllInteractions,
          "all",
          "all",
        ),
      [networkData, interactionLimit, showAllInteractions],
    );

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
        style: cytoscapeBaseStyle,
        layout: LAYOUT_OPTIONS[currentLayout],
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autounselectify: false,
      });

      cyInstance.current.on("layoutstop", () => {
        if (!cyInstance.current) return;

        const nodeCount = cyInstance.current.nodes().length;
        const edgeCount = cyInstance.current.edges().length;

        cyInstance.current.fit();
        const zoomFactor = calculateAdaptiveZoom(nodeCount, edgeCount);
        cyInstance.current.zoom(cyInstance.current.zoom() * zoomFactor);
      });

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
          const zoomFactor = calculateAdaptiveZoom(nodeCount, edgeCount);
          cyInstance.current.zoom(cyInstance.current.zoom() * zoomFactor);
        });

        layout.run();
      }
    }, [cytoscapeElements, currentLayout]);

    useEffect(() => {
      if (cyInstance.current) {
        applyCytoscapeStyles(cyInstance.current, selectedNode);
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

    const handleLayoutChange = useCallback((layout: LayoutType) => {
      setCurrentLayout(layout);
      if (cyInstance.current) {
        cyInstance.current.layout(LAYOUT_OPTIONS[layout]).run();
      }
    }, []);

    if (cytoscapeElements.nodes.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No HuRI network data available for visualization
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
                <span className="text-lg">HuRI Network</span>
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
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={currentLayout}
                onValueChange={(value) =>
                  handleLayoutChange(value as LayoutType)
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

          <div className="absolute top-4 left-4 bg-background/95 border rounded-lg p-3 space-y-2 shadow-lg max-w-56">
            <div className="text-xs font-semibold">HuRI Network Legend</div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Gene Types
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600"></div>
                <span>Query Gene (hub)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Highly Connected</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Interacting Genes</span>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">
                Interaction Features
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-0.5 bg-green-600 border-dashed border-t-2 border-green-600"
                  style={{
                    background: "none",
                    borderTop: "2px dashed #059669",
                  }}
                ></div>
                <span>Physical Association</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-1 bg-purple-500"></div>
                <span>Y2H Method</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t">
              • High-quality binary interactions • Yeast Two-Hybrid assays •
              Human reference standard
            </div>
          </div>

          {selectedNode &&
            (() => {
              const nodeData = cytoscapeElements.nodes.find(
                (n) => n.data.id === selectedNode,
              )?.data;
              if (!nodeData) return null;

              const geneInteractions = nodeData.interactions || [];
              const isQueryGene = nodeData.isQueryGene;

              const partners = Array.from(
                new Set(
                  geneInteractions.map((i: any) =>
                    i.gene_interactor_a === selectedNode
                      ? i.gene_interactor_b
                      : i.gene_interactor_a,
                  ),
                ),
              ) as string[];

              return (
                <div className="absolute bottom-4 right-4 bg-background border rounded-lg p-4 max-w-sm shadow-lg max-h-80 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isQueryGene
                          ? "bg-red-500"
                          : nodeData.degree > 2
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                    ></div>
                    <div className="text-sm font-semibold">{selectedNode}</div>
                    {isQueryGene && (
                      <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Query Gene
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-muted-foreground">Degree</div>
                        <div className="font-medium">{nodeData.degree}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Partners</div>
                        <div className="font-medium">{partners.length}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-2">
                        Detection Method
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span>Yeast Two-Hybrid (Y2H)</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-2">
                        Interaction Type
                      </div>
                      <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded inline-block">
                        Physical Association
                      </div>
                    </div>

                    {partners.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2">
                          Partners ({partners.length})
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {partners.slice(0, 8).map((partner: string) => (
                            <div
                              key={partner}
                              className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                            >
                              {partner}
                            </div>
                          ))}
                          {partners.length > 8 && (
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              +{partners.length - 8} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </CardContent>
      </Card>
    );
  },
);
