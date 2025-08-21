"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  VisualizationType,
  VisualizationRecommendation,
  VISUALIZATION_LABELS,
  VISUALIZATION_CONFIG,
} from "@/lib/gene/ppi/types";

interface VisualizationSelectorProps {
  currentView: VisualizationType;
  onViewChange: (view: VisualizationType) => void;
  nodeCount: number;
  id?: string;
  className?: string;
}

export function VisualizationSelector({
  currentView,
  onViewChange,
  nodeCount,
  id = "visualization-view",
  className = "",
}: VisualizationSelectorProps) {
  // No auto-switching - let users choose chord even for large networks
  const getRecommendations = (): VisualizationRecommendation[] => {
    const recommendations: VisualizationRecommendation[] = [
      {
        type: "network",
        isRecommended: true,
      },
      {
        type: "chord",
        isRecommended:
          nodeCount <= VISUALIZATION_CONFIG.CHORD_MAX_NODES && nodeCount > 1,
        reason:
          nodeCount <= VISUALIZATION_CONFIG.CHORD_MAX_NODES && nodeCount > 1
            ? "Optimal for visualizing connections between genes"
            : nodeCount > VISUALIZATION_CONFIG.CHORD_MAX_NODES
              ? `Too many nodes (${nodeCount}). Chord works best with ≤${VISUALIZATION_CONFIG.CHORD_MAX_NODES} nodes`
              : "Requires multiple nodes to show connections",
      },
    ];

    return recommendations;
  };

  const recommendations = getRecommendations();
  // Always show both options - let users decide
  const availableViews = recommendations.filter((rec) => {
    if (rec.type === "network") return true;
    if (rec.type === "chord") return nodeCount > 1; // Only need more than 1 node
    return false;
  });

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        View:
      </span>
      <Select
        value={currentView}
        onValueChange={(value) => onViewChange(value as VisualizationType)}
      >
        <SelectTrigger
          id={id}
          className="w-28 sm:w-32 text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableViews.map((rec) => {
            const isRecommended = rec.isRecommended;
            return (
              <SelectItem
                key={rec.type}
                value={rec.type}
                disabled={rec.type === "chord" && nodeCount <= 1}
              >
                <div className="flex items-center gap-2">
                  <span>{VISUALIZATION_LABELS[rec.type]}</span>
                  {isRecommended && rec.type === "chord" && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800 border-green-200"
                    >
                      Recommended
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
