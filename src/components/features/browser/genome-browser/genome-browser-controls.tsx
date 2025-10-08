"use client";

import { useMemo } from "react";
import type { DomainChrInterval } from "@/components/gosling";
import type { TrackMetadata } from "@/lib/tracks/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ZoomIn,
  ZoomOut,
  MapPin,
  Trash2,
  Eye,
  Layers,
  Activity,
  Search,
  Lock,
  Unlock,
} from "lucide-react";
import { GenomicDomainManager } from "@/lib/utils/domain-manager";

interface GenomeBrowserControlsProps {
  domain: DomainChrInterval | null;
  enabledTracks: TrackMetadata[];
  selectedPreset?: string;
  onZoom?: (factor: number) => void;
  onPresetChange?: (preset: string) => void;
  onClearAllTracks?: () => void;
  isStatic?: boolean;
  onStaticToggle?: () => void;
  className?: string;
  compact?: boolean;
}

interface DomainPreset {
  name: string;
  description: string;
  windowSize: number;
  icon: string;
}

const DOMAIN_PRESETS: DomainPreset[] = [
  {
    name: "Detail View",
    description: "Detailed nucleotide-level view (~10kb)",
    windowSize: 10000,
    icon: "search",
  },
  {
    name: "Gene View",
    description: "Balanced gene-level view (~100kb)",
    windowSize: 100000,
    icon: "eye",
  },
  {
    name: "Region View",
    description: "Regulatory region context (~500kb)",
    windowSize: 500000,
    icon: "activity",
  },
  {
    name: "Chromosome View",
    description: "Large structural context (~2Mb)",
    windowSize: 2000000,
    icon: "layers",
  },
];

const getPresetIcon = (iconName: string) => {
  const iconMap = {
    search: Search,
    eye: Eye,
    activity: Activity,
    layers: Layers,
  } as const;
  return iconMap[iconName as keyof typeof iconMap] || Search;
};

export function GenomeBrowserControls({
  domain,
  enabledTracks,
  selectedPreset = "Gene View",
  onZoom,
  onPresetChange,
  onClearAllTracks,
  isStatic = false,
  onStaticToggle,
  className = "",
  compact = false,
}: GenomeBrowserControlsProps) {
  const performanceStats = useMemo(() => {
    const memoryUsage = enabledTracks.reduce((total, track) => {
      const usageMap = { low: 1, medium: 2, high: 3 };
      const usage =
        usageMap[track.performance.memoryUsage as keyof typeof usageMap] || 1;
      return total + usage;
    }, 0);

    const renderComplexity = enabledTracks.reduce((total, track) => {
      const complexityMap = { fast: 1, medium: 2, slow: 3 };
      const complexity =
        complexityMap[
          track.performance.renderTime as keyof typeof complexityMap
        ] || 1;
      return total + complexity;
    }, 0);

    return {
      memoryLevel:
        memoryUsage <= 3 ? "Low" : memoryUsage <= 6 ? "Medium" : "High",
      renderLevel:
        renderComplexity <= 3
          ? "Fast"
          : renderComplexity <= 6
            ? "Medium"
            : "Slow",
      trackCount: enabledTracks.length,
    };
  }, [enabledTracks]);

  if (!domain || enabledTracks.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-card rounded-lg border border-border/50 shadow-sm ${className}`}
    >
      {/* Location and Performance Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-2 sm:gap-0 ${!compact ? "pb-3 border-b border-border/30" : ""}`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {GenomicDomainManager.formatDomainAsString(domain)}
          </span>
          <Badge
            variant="outline"
            className="text-xs font-medium px-1.5 sm:px-2 h-5 sm:h-6 flex-shrink-0"
          >
            {(GenomicDomainManager.getDomainSize(domain) / 1000).toFixed(1)}kb
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Badge
            variant={
              performanceStats.memoryLevel === "High"
                ? "destructive"
                : performanceStats.memoryLevel === "Medium"
                  ? "secondary"
                  : "outline"
            }
            className="text-xs font-medium px-1.5 sm:px-2 h-5 sm:h-6"
          >
            <span className="hidden sm:inline">Memory: </span>
            {performanceStats.memoryLevel}
          </Badge>
          <Badge
            variant={
              performanceStats.renderLevel === "Slow"
                ? "destructive"
                : performanceStats.renderLevel === "Medium"
                  ? "secondary"
                  : "outline"
            }
            className="text-xs font-medium px-1.5 sm:px-2 h-5 sm:h-6"
          >
            <span className="hidden sm:inline">Render: </span>
            {performanceStats.renderLevel}
          </Badge>
        </div>
      </div>

      {/* Controls Section - only show if not compact */}
      {!compact && (
        <div className="p-3 sm:p-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            {onZoom && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onZoom(0.5)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 font-medium border-border/60 hover:border-border"
                    >
                      <ZoomIn className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Zoom </span>In
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom in (2x closer)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onZoom(2)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 font-medium border-border/60 hover:border-border"
                    >
                      <ZoomOut className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Zoom </span>Out
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom out (2x wider)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Static Mode Toggle */}
            {onStaticToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isStatic ? "default" : "outline"}
                    size="sm"
                    onClick={onStaticToggle}
                    className="text-xs h-7 sm:h-8 px-2 sm:px-3 font-medium"
                  >
                    {isStatic ? (
                      <Lock className="h-3 w-3 mr-0.5 sm:mr-1" />
                    ) : (
                      <Unlock className="h-3 w-3 mr-0.5 sm:mr-1" />
                    )}
                    <span className="hidden sm:inline">
                      {isStatic ? "Locked" : "Interactive"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isStatic
                      ? "Click to enable zoom/pan"
                      : "Click to disable zoom/pan"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Preset Controls */}
            {onPresetChange && (
              <div className="flex flex-wrap items-center gap-1">
                {DOMAIN_PRESETS.map((preset) => {
                  const IconComponent = getPresetIcon(preset.icon);
                  const shortName = preset.name.split(" ")[0]; // "Detail", "Gene", "Region", "Chromosome"
                  return (
                    <Tooltip key={preset.name}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={
                            selectedPreset === preset.name
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => onPresetChange(preset.name)}
                          className="text-xs h-7 sm:h-8 px-2 sm:px-3 font-medium"
                        >
                          <IconComponent className="h-3 w-3 mr-0.5 sm:mr-1.5" />
                          <span className="hidden xs:inline">
                            {preset.name}
                          </span>
                          <span className="xs:hidden">{shortName}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{preset.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            {/* Clear All Button */}
            {enabledTracks.length > 0 && onClearAllTracks && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAllTracks}
                    className="text-xs h-7 sm:h-8 px-2 sm:px-3 font-medium text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-0.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Clear All</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all tracks</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
