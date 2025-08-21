"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  memo,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { ChordDiagramProps, ChordArc } from "./chord-types";
import { createChordLayout, getChordColors, getDefaultChordConfig, getNodeAtPosition } from "@/lib/gene/ppi/chord-utils";


const ChordLegend = memo(() => (
  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-900">
        Chord Diagram Legend
      </p>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">Gene Types</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">Query Gene</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-700">Highly Connected</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">Regular Gene</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">
          Interaction Evidence
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-2 rounded-sm"
              style={{ backgroundColor: "#111827" }}
            ></div>
            <span className="text-gray-700">High (5+ studies)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-2 rounded-sm"
              style={{ backgroundColor: "#4b5563" }}
            ></div>
            <span className="text-gray-700">Medium (3-4 studies)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-2 rounded-sm"
              style={{ backgroundColor: "#9ca3af" }}
            ></div>
            <span className="text-gray-700">Low (2 studies)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-2 rounded-sm"
              style={{ backgroundColor: "#e5e7eb" }}
            ></div>
            <span className="text-gray-700">Single Study</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

ChordLegend.displayName = "ChordLegend";

export function ChordDiagram({
  data,
  selectedNode,
  onNodeSelect,
  queryGene,
  width = 600,
  height = 600,
}: ChordDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredRibbon, setHoveredRibbon] = useState<{
    source: number;
    target: number;
  } | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  // Entrance animation
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const { chords, arcGenerator, ribbonGenerator, config, arcs } =
    useMemo(() => {
      const config = getDefaultChordConfig(width, height);
      config.colors = getChordColors(data.nodeData, queryGene);

      const layout = createChordLayout(data, config);

      const arcs: ChordArc[] = layout.chords.groups.map((group, index) => ({
        index,
        startAngle: group.startAngle,
        endAngle: group.endAngle,
        value: group.value,
        label: data.labels[index],
        nodeData: data.nodeData[Object.keys(data.nodeData)[index]],
      }));

      return {
        ...layout,
        config,
        arcs,
      };
    }, [data, width, height, queryGene]);

  const centerX = width / 2;
  const centerY = height / 2;

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const newSelectedNode = selectedNode === nodeId ? null : nodeId;
      onNodeSelect?.(newSelectedNode);
    },
    [selectedNode, onNodeSelect],
  );

  const handleSvgClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const clickedNode = getNodeAtPosition(
        x,
        y,
        centerX,
        centerY,
        arcs,
        config.outerRadius,
      );

      if (clickedNode) {
        handleNodeClick(clickedNode);
      } else if (event.target === event.currentTarget) {
        onNodeSelect?.(null);
      }
    },
    [centerX, centerY, arcs, config.outerRadius, handleNodeClick, onNodeSelect],
  );

  // Simple hover handling - no jittering since we filter duplicate ribbons
  const handleRibbonMouseEnter = useCallback(
    (source: number, target: number) => {
      setHoveredRibbon({ source, target });
    },
    [],
  );

  const handleRibbonMouseLeave = useCallback(() => {
    setHoveredRibbon(null);
  }, []);

  const getArcColor = (
    index: number,
    isSelected: boolean,
    isHovered: boolean,
  ) => {
    const nodeId = Object.keys(data.nodeData)[index];
    const nodeData = data.nodeData[nodeId];

    // Simple, clear color scheme
    if (nodeData?.isQueryGene) {
      if (isSelected) return "#dc2626"; // red-600
      if (isHovered) return "#ef4444"; // red-500
      return "#dc2626";
    }

    if (nodeData?.degree >= 5) {
      if (isSelected) return "#d97706"; // amber-600
      if (isHovered) return "#f59e0b"; // amber-500
      return selectedNode && !isSelected ? "#d9770640" : "#d97706";
    }

    // Regular nodes - all blue
    const baseColor = "#3b82f6"; // blue-500

    if (isSelected) return "#2563eb"; // blue-600
    if (isHovered) return "#3b82f6"; // blue-500
    if (selectedNode && !isSelected) return "#3b82f630"; // blue with opacity
    return baseColor;
  };

  const getRibbonStyle = (
    sourceIndex: number,
    targetIndex: number,
    connectionStrength: number,
    edgeData?: any,
  ) => {
    const isSourceSelected =
      selectedNode === Object.keys(data.nodeData)[sourceIndex];
    const isTargetSelected =
      selectedNode === Object.keys(data.nodeData)[targetIndex];
    const isConnectedRibbon = isSourceSelected || isTargetSelected;
    const isRibbonHovered =
      hoveredRibbon?.source === sourceIndex &&
      hoveredRibbon?.target === targetIndex;

    // Get interaction data for intensity encoding
    const studyCount = edgeData?.studyCount || 1;
    const weight = edgeData?.weight || connectionStrength || 1;

    // Gray color palette for ribbons - different shades based on interaction strength/type
    let baseColor = "#6b7280"; // Default: gray-500 for medium strength

    // Encode interaction strength and study count in high contrast gray intensity
    if (studyCount >= 5 || weight >= 5) {
      baseColor = "#111827"; // Very dark gray for high confidence/strength
    } else if (studyCount >= 3 || weight >= 3) {
      baseColor = "#4b5563"; // Medium-dark gray for medium confidence
    } else if (studyCount >= 2 || weight >= 2) {
      baseColor = "#9ca3af"; // Light gray for lower confidence
    } else {
      baseColor = "#e5e7eb"; // Very light gray for minimal evidence
    }

    // Enhanced highlighting logic for node selection
    if (isRibbonHovered) {
      // Subtle hover enhancement - just slightly darker than base
      if (studyCount >= 5 || weight >= 5) {
        baseColor = "#1e293b"; // Slightly darker than very dark
      } else if (studyCount >= 3 || weight >= 3) {
        baseColor = "#374151"; // Slightly darker than medium-dark
      } else if (studyCount >= 2 || weight >= 2) {
        baseColor = "#6b7280"; // Slightly darker than light
      } else {
        baseColor = "#9ca3af"; // Slightly darker than very light
      }
    } else if (isConnectedRibbon) {
      // Bold highlighting for connected ribbons when node is selected
      if (studyCount >= 5 || weight >= 5) {
        baseColor = "#0f172a"; // Extra dark for high confidence connected
      } else if (studyCount >= 3 || weight >= 3) {
        baseColor = "#1e293b"; // Dark slate for medium confidence connected
      } else if (studyCount >= 2 || weight >= 2) {
        baseColor = "#334155"; // Medium slate for lower confidence connected
      } else {
        baseColor = "#475569"; // Light slate for minimal evidence connected
      }
    } else if (selectedNode && !isConnectedRibbon) {
      // Very dimmed when other nodes selected but this ribbon is not connected
      baseColor = baseColor + "20"; // Much more transparent
    }

    return {
      fill: baseColor,
      stroke: isRibbonHovered
        ? "#f8fafc"
        : isConnectedRibbon
          ? "#e2e8f0"
          : "none",
      strokeWidth: isRibbonHovered ? 0.5 : isConnectedRibbon ? 1 : 0,
    };
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50" />

      <TooltipProvider>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="cursor-pointer drop-shadow-lg relative z-10"
          onClick={handleSvgClick}
          style={{
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.07))",
          }}
        >
          <defs>
            <radialGradient id="chord-center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          <circle
            cx={centerX}
            cy={centerY}
            r={config.innerRadius + 15}
            fill="url(#chord-center-glow)"
            opacity={mounted ? animationProgress * 0.4 : 0}
            className="transition-opacity duration-500"
          />

          <g
            transform={`translate(${centerX}, ${centerY})`}
            style={{
              opacity: mounted ? animationProgress : 0,
              transition: "opacity 0.5s ease-out",
            }}
          >
            {/* Render ribbons (connections) - filter out duplicates to prevent jittering */}
            {chords
              .filter((chord) => chord.source.index < chord.target.index)
              .map((chord, i) => {
                const ribbonPath = ribbonGenerator(chord) as unknown as
                  | string
                  | null;
                if (!ribbonPath) return null;

                const isHovered =
                  hoveredRibbon?.source === chord.source.index &&
                  hoveredRibbon?.target === chord.target.index;
                const connectionStrength = Math.max(
                  chord.source.value,
                  chord.target.value,
                );

                // Get edge data for interaction type
                const sourceNodeId = Object.keys(data.nodeData)[
                  chord.source.index
                ];
                const targetNodeId = Object.keys(data.nodeData)[
                  chord.target.index
                ];
                const edgeData = data.edges?.find(
                  (edge: { source: string; target: string }) =>
                    (edge.source === sourceNodeId &&
                      edge.target === targetNodeId) ||
                    (edge.source === targetNodeId &&
                      edge.target === sourceNodeId),
                );

                const ribbonStyle = getRibbonStyle(
                  chord.source.index,
                  chord.target.index,
                  connectionStrength,
                  edgeData,
                );

                // Enhanced opacity calculation for better highlighting
                const isConnectedRibbon =
                  selectedNode === sourceNodeId ||
                  selectedNode === targetNodeId;
                let ribbonOpacity = 0.8;

                if (isHovered) {
                  ribbonOpacity = 1;
                } else if (isConnectedRibbon) {
                  ribbonOpacity = 0.95; // High opacity for connected ribbons
                } else if (selectedNode && !isConnectedRibbon) {
                  ribbonOpacity = 0.2; // Much lower opacity for non-connected when something is selected
                }

                return (
                  <g key={`ribbon-group-${i}`}>
                    <path
                      d={ribbonPath}
                      fill={ribbonStyle.fill}
                      stroke={ribbonStyle.stroke}
                      strokeWidth={ribbonStyle.strokeWidth}
                      className="transition-all duration-300 ease-out pointer-events-none"
                      style={{
                        opacity: ribbonOpacity,
                      }}
                    />

                    {/* Fat invisible hit box for hover detection */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <path
                          d={ribbonPath}
                          fill="transparent"
                          stroke="transparent"
                          strokeWidth="20"
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            handleRibbonMouseEnter(
                              chord.source.index,
                              chord.target.index,
                            )
                          }
                          onMouseLeave={handleRibbonMouseLeave}
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        className="max-w-xs bg-white border border-gray-200 text-gray-900 shadow-lg"
                        sideOffset={5}
                        side="top"
                        isArrow={false}
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-gray-900">
                            {data.labels[chord.source.index]} ↔{" "}
                            {data.labels[chord.target.index]}
                          </p>
                          {edgeData && (
                            <>
                              <p className="text-xs text-gray-600">
                                Study Count: {edgeData.studyCount || 1}
                              </p>
                              <p className="text-xs text-gray-600">
                                Weight: {edgeData.weight || connectionStrength}
                              </p>
                              {edgeData.method && (
                                <p className="text-xs text-gray-600">
                                  Method: {edgeData.method}
                                </p>
                              )}
                              {edgeData.interactionType && (
                                <p className="text-xs text-gray-600">
                                  Type: {edgeData.interactionType}
                                </p>
                              )}
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs border-gray-300 text-gray-700"
                          >
                            {(edgeData?.studyCount || connectionStrength) >= 5
                              ? "High Evidence"
                              : (edgeData?.studyCount || connectionStrength) >=
                                  3
                                ? "Medium Evidence"
                                : (edgeData?.studyCount ||
                                      connectionStrength) >= 2
                                  ? "Low Evidence"
                                  : "Single Study"}
                          </Badge>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </g>
                );
              })}

            {/* Render arcs (nodes) with premium styling */}
            {arcs.map((arcData) => {
              const arcPath = arcGenerator({
                startAngle: arcData.startAngle,
                endAngle: arcData.endAngle,
                innerRadius: config.innerRadius,
                outerRadius: config.outerRadius,
              });

              if (!arcPath) return null;

              const nodeId = arcData.nodeData.id;
              const isSelected = selectedNode === nodeId;
              const isHovered = hoveredNode === nodeId;
              const isQueryGene = arcData.nodeData.isQueryGene;
              const isHighlyConnected = arcData.nodeData.degree >= 5;

              // Calculate label position with better spacing
              const angle = (arcData.startAngle + arcData.endAngle) / 2;
              const labelRadius = config.outerRadius + (isSelected ? 25 : 20);
              const labelX = Math.cos(angle - Math.PI / 2) * labelRadius;
              const labelY = Math.sin(angle - Math.PI / 2) * labelRadius;

              // Calculate outer highlight arc for selected/hovered nodes
              const highlightArcPath =
                isSelected || isHovered
                  ? arcGenerator({
                      startAngle: arcData.startAngle,
                      endAngle: arcData.endAngle,
                      innerRadius: config.outerRadius + 2,
                      outerRadius: config.outerRadius + 6,
                    })
                  : null;

              return (
                <g key={`arc-group-${arcData.index}`}>
                  {highlightArcPath && (
                    <path
                      d={highlightArcPath}
                      fill={getArcColor(arcData.index, isSelected, isHovered)}
                      opacity="0.5"
                      className="pointer-events-none transition-all duration-200"
                    />
                  )}

                  <path
                    d={arcPath}
                    fill={getArcColor(arcData.index, isSelected, isHovered)}
                    stroke={
                      isSelected ? "#ffffff" : isHovered ? "#e2e8f0" : "none"
                    }
                    strokeWidth={isSelected ? 2 : isHovered ? 1 : 0}
                    className="transition-all duration-200 ease-out pointer-events-none"
                  />

                  {/* Fat invisible hit box for node hover detection */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <path
                        d={arcPath}
                        fill="transparent"
                        stroke="transparent"
                        strokeWidth="15"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredNode(nodeId)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNodeClick(nodeId);
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      className="max-w-sm bg-white border border-gray-200 text-gray-900 shadow-lg"
                      sideOffset={5}
                      side="top"
                      isArrow={false}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">
                            {arcData.label}
                          </p>
                          {isQueryGene && (
                            <Badge
                              variant="destructive"
                              className="text-xs bg-red-100 text-red-800 border-red-200"
                            >
                              Query Gene
                            </Badge>
                          )}
                          {isHighlyConnected && !isQueryGene && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-100 text-amber-800 border-amber-200"
                            >
                              Hub Protein
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p>Interactions: {arcData.nodeData.degree || 0}</p>
                          <p>Total Studies: {arcData.value}</p>
                          {arcData.nodeData.methods &&
                            arcData.nodeData.methods.length > 0 && (
                              <p>
                                Detection Methods:{" "}
                                {arcData.nodeData.methods
                                  .slice(0, 2)
                                  .join(", ")}
                                {arcData.nodeData.methods.length > 2
                                  ? ` (+${arcData.nodeData.methods.length - 2} more)`
                                  : ""}
                              </p>
                            )}
                          {arcData.nodeData.interactionTypes &&
                            arcData.nodeData.interactionTypes.length > 0 && (
                              <p>
                                Interaction Types:{" "}
                                {arcData.nodeData.interactionTypes
                                  .slice(0, 2)
                                  .join(", ")}
                                {arcData.nodeData.interactionTypes.length > 2
                                  ? ` (+${arcData.nodeData.interactionTypes.length - 2} more)`
                                  : ""}
                              </p>
                            )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Premium gene labels with better positioning and styling */}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`transition-all duration-300 pointer-events-none select-none ${
                      isSelected
                        ? "fill-gray-900"
                        : isHovered
                          ? "fill-gray-800"
                          : "fill-gray-700"
                    }`}
                    style={{
                      fontSize: isSelected
                        ? "16px"
                        : isHovered
                          ? "14px"
                          : "12px",
                      fontWeight: isSelected
                        ? "700"
                        : isHovered
                          ? "600"
                          : "500",
                      filter: isSelected
                        ? "drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
                        : "none",
                    }}
                  >
                    {arcData.label}
                  </text>

                  {/* Special indicators for query gene and highly connected nodes */}
                  {isQueryGene && (
                    <circle
                      cx={labelX}
                      cy={labelY - 18}
                      r="3"
                      fill="#dc2626"
                      className="pointer-events-none animate-pulse"
                    />
                  )}

                  {isHighlyConnected && !isQueryGene && (
                    <polygon
                      points={`${labelX},${labelY - 18} ${labelX - 3},${labelY - 12} ${labelX + 3},${labelY - 12}`}
                      fill="#d97706"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}
          </g>

          <g transform={`translate(${centerX}, ${centerY})`}>
            <circle
              cx="0"
              cy="0"
              r="6"
              fill="#3b82f6"
              opacity={mounted ? animationProgress * 0.7 : 0}
              className="transition-opacity duration-500"
            />
            <circle
              cx="0"
              cy="0"
              r="2"
              fill="#ffffff"
              opacity={mounted ? animationProgress : 0}
              className="transition-opacity duration-500"
            />
          </g>
        </svg>

        <ChordLegend />
      </TooltipProvider>
    </div>
  );
}
