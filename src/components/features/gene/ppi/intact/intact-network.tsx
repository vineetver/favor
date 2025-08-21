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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { IntactInteraction } from "@/lib/gene/ppi/constants";
import {
  transformIntactData,
  getIntactUniqueValues,
  getIntactUniqueExpansionMethods,
  getIntactUniqueBiologicalRoles,
} from "./intact-transforms";
import { applyIntactStyles, createIntactCytoscapeElements, INTACT_LAYOUT_OPTIONS, intactCytoscapeBaseStyle, IntactLayoutType } from "@/lib/gene/ppi/intact-utils";

if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
  cytoscape.use(dagre);
  cytoscape.use(cola);
}

interface IntactNetworkProps {
  data: IntactInteraction[];
  onNodeSelect?: (node: string | null) => void;
  selectedNode?: string | null;
  queryGene?: string;
}

export const IntactNetwork = React.memo(
  ({
    data,
    onNodeSelect,
    selectedNode: externalSelectedNode,
    queryGene,
  }: IntactNetworkProps) => {
    const [internalSelectedNode, setInternalSelectedNode] = useState<
      string | null
    >(null);
    const selectedNode = externalSelectedNode ?? internalSelectedNode;
    const [currentLayout, setCurrentLayout] =
      useState<IntactLayoutType>("cose-bilkent");
    const [interactionLimit, setInteractionLimit] = useState<number>(50);
    const [showAllInteractions, setShowAllInteractions] =
      useState<boolean>(false);
    const [filterByMethod, setFilterByMethod] = useState<string>("all");
    const [filterByInteractionType, setFilterByInteractionType] =
      useState<string>("all");
    const [filterByExpansionMethod, setFilterByExpansionMethod] =
      useState<string>("all");
    const [filterByBiologicalRole, setFilterByBiologicalRole] =
      useState<string>("all");
    const [showNegativeInteractions] = useState<boolean>(true);
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<Core | null>(null);
    const isInitialized = useRef<boolean>(false);

    const transformedData = useMemo(() => transformIntactData(data), [data]);

    const uniqueMethods = useMemo(
      () => getIntactUniqueValues(transformedData, (i) => i.method),
      [transformedData],
    );

    const uniqueInteractionTypes = useMemo(
      () => getIntactUniqueValues(transformedData, (i) => i.interaction_type),
      [transformedData],
    );

    const uniqueExpansionMethods = useMemo(
      () => getIntactUniqueExpansionMethods(transformedData),
      [transformedData],
    );

    const uniqueBiologicalRoles = useMemo(
      () => getIntactUniqueBiologicalRoles(transformedData),
      [transformedData],
    );

    const cytoscapeElements = useMemo(
      () =>
        createIntactCytoscapeElements(
          transformedData,
          interactionLimit,
          showAllInteractions,
          filterByMethod,
          filterByInteractionType,
          filterByExpansionMethod,
          filterByBiologicalRole,
          showNegativeInteractions,
          queryGene,
        ),
      [
        transformedData,
        interactionLimit,
        showAllInteractions,
        filterByMethod,
        filterByInteractionType,
        filterByExpansionMethod,
        filterByBiologicalRole,
        showNegativeInteractions,
        queryGene,
      ],
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
        style: intactCytoscapeBaseStyle,
        layout: INTACT_LAYOUT_OPTIONS[currentLayout],
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autounselectify: false,
      });

      cyInstance.current.on("layoutstop", () => {
        if (!cyInstance.current) return;

        cyInstance.current.fit();
        const nodeCount = cyInstance.current.nodes().length;
        if (nodeCount < 10) {
          cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
        } else if (nodeCount > 30) {
          cyInstance.current.zoom(cyInstance.current.zoom() * 0.7);
        }
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
        const layout = cyInstance.current.layout(
          INTACT_LAYOUT_OPTIONS[currentLayout],
        );

        layout.on("layoutstop", () => {
          if (!cyInstance.current) return;

          cyInstance.current.fit();
          const nodeCount = cyInstance.current.nodes().length;
          if (nodeCount < 10) {
            cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
          } else if (nodeCount > 30) {
            cyInstance.current.zoom(cyInstance.current.zoom() * 0.7);
          }
        });

        layout.run();
      }
    }, [cytoscapeElements, currentLayout]);

    useEffect(() => {
      if (cyInstance.current) {
        applyIntactStyles(cyInstance.current, selectedNode);
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

    const handleLayoutChange = useCallback((layout: IntactLayoutType) => {
      setCurrentLayout(layout);
      if (cyInstance.current) {
        cyInstance.current.layout(INTACT_LAYOUT_OPTIONS[layout]).run();
      }
    }, []);

    if (cytoscapeElements.nodes.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No IntAct network data available for visualization
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
                <span className="text-lg">IntAct Network</span>
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

            <div className="flex items-center gap-1.5 flex-wrap font-normal">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Layout:
                </span>
                <Select
                  value={currentLayout}
                  onValueChange={(value) =>
                    handleLayoutChange(value as IntactLayoutType)
                  }
                >
                  <SelectTrigger className="w-24 sm:w-28 text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(INTACT_LAYOUT_OPTIONS).map((layout) => (
                      <SelectItem key={layout} value={layout}>
                        {layout.charAt(0).toUpperCase() + layout.slice(1)}
                      </SelectItem>
                    ))}
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
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="intact-interaction-limit"
                    className="text-xs text-muted-foreground"
                  >
                    Interaction Limit
                  </Label>
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
                    <SelectTrigger
                      id="intact-interaction-limit"
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
                      htmlFor="intact-detection-method"
                      className="text-xs text-muted-foreground"
                    >
                      Detection Method
                    </Label>
                    <Select
                      value={filterByMethod}
                      onValueChange={setFilterByMethod}
                    >
                      <SelectTrigger
                        id="intact-detection-method"
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
                      htmlFor="intact-interaction-type"
                      className="text-xs text-muted-foreground"
                    >
                      Interaction Type
                    </Label>
                    <Select
                      value={filterByInteractionType}
                      onValueChange={setFilterByInteractionType}
                    >
                      <SelectTrigger
                        id="intact-interaction-type"
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

                {uniqueExpansionMethods.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="intact-expansion-method"
                      className="text-xs text-muted-foreground"
                    >
                      Expansion Method
                    </Label>
                    <Select
                      value={filterByExpansionMethod}
                      onValueChange={setFilterByExpansionMethod}
                    >
                      <SelectTrigger
                        id="intact-expansion-method"
                        className="w-32 sm:w-36 h-8 text-xs"
                      >
                        <SelectValue placeholder="Expansion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Expansions</SelectItem>
                        {uniqueExpansionMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {uniqueBiologicalRoles.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="intact-biological-role"
                      className="text-xs text-muted-foreground"
                    >
                      Biological Role
                    </Label>
                    <Select
                      value={filterByBiologicalRole}
                      onValueChange={setFilterByBiologicalRole}
                    >
                      <SelectTrigger
                        id="intact-biological-role"
                        className="w-28 sm:w-32 h-8 text-xs"
                      >
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueBiologicalRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
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

          <div className="absolute top-4 left-4 bg-background/95 border rounded-lg p-3 space-y-2 shadow-lg max-w-56 hidden sm:block">
            <div className="text-xs font-semibold">IntAct Network Legend</div>

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
                Interaction Types
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-0.5 bg-blue-800"></div>
                <span>Direct Interaction</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-0.5 bg-green-800 border-dashed border-t-2 border-green-800"
                  style={{
                    background: "none",
                    borderTop: "2px dashed #166534",
                  }}
                ></div>
                <span>Physical Association</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-0.5 bg-purple-800 border-dotted border-t-2 border-purple-800"
                  style={{
                    background: "none",
                    borderTop: "2px dotted #9333ea",
                  }}
                ></div>
                <span>Spoke Expansion</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-0.5 bg-red-600"></div>
                <span>Negative Interaction</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t">
              • Literature curated • Experimental evidence • Expansion method
              support • Biological role annotation
            </div>
          </div>

          {selectedNode &&
            (() => {
              const nodeData = cytoscapeElements.nodes.find(
                (n) => n.data.id === selectedNode,
              )?.data;
              if (!nodeData) return null;

              const geneInteractions = nodeData.interactions || [];
              const methods = (nodeData.methods || []) as string[];
              const interactionTypes = (nodeData.interactionTypes ||
                []) as string[];
              const expansionMethods = (nodeData.expansionMethods || []).filter(
                Boolean,
              ) as string[];
              const biologicalRoles = (nodeData.biologicalRoles || []).filter(
                Boolean,
              ) as string[];
              const experimentalRoles = (
                nodeData.experimentalRoles || []
              ).filter(Boolean) as string[];
              const hostOrganisms = (nodeData.hostOrganisms || []).filter(
                Boolean,
              ) as string[];
              const hasNegativeInteractions =
                nodeData.hasNegativeInteractions || false;
              const isQueryGene = nodeData.isQueryGene;

              const partners = Array.from(
                new Set(
                  geneInteractions.map((i: any) =>
                    i.gene_a === selectedNode ? i.gene_b : i.gene_a,
                  ),
                ),
              ) as string[];

              const publications = Array.from(
                new Set(
                  geneInteractions
                    .map((i: any) => i.publication)
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
                      {hasNegativeInteractions && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="text-xs">
                              Negative
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Has negative/inhibitory interactions</p>
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
