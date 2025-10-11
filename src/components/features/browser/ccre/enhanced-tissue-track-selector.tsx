"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TissueConfig } from "@/lib/variant/ccre/tissue-config";
import {
  generateTissueSpecificTracks,
  type DynamicTrack,
} from "@/lib/tracks/dynamic-track-generator";

interface EnhancedTissueTrackSelectorProps {
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  onBatchToggle?: (trackIds: string[], enabled: boolean) => void;
  className?: string;
}

const assayColorMap: { [key: string]: string } = {
  dnase: "#2563eb",
  ctcf: "#dc2626",
  h3k4me3: "#16a34a",
  h3k27ac: "#ca8a04",
  atac: "#7c3aed",
  h3k4me1: "#ea580c",
  h3k27me3: "#0891b2",
  ccres: "#ec4899",
};

interface AssayGroup {
  assayName: string;
  track: DynamicTrack;
}

interface SubtissueGroup {
  subtissueName: string;
  assays: AssayGroup[];
}

interface TissueGroup {
  tissueName: string;
  subtissues: SubtissueGroup[];
}

export function EnhancedTissueTrackSelector({
  enabledTracks,
  onTrackToggle,
  onBatchToggle,
  className = "",
}: EnhancedTissueTrackSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTissues, setExpandedTissues] = useState<Set<string>>(new Set());
  const [expandedSubtissues, setExpandedSubtissues] = useState<Set<string>>(new Set());
  const [filterByAssayType, setFilterByAssayType] = useState<string[]>([]);

  const allTracks = useMemo(() => {
    const tracks: DynamicTrack[] = [];
    const tissues = Object.keys(TissueConfig);

    tissues.forEach((tissue) => {
      const subtissues = TissueConfig[tissue];
      subtissues.forEach((subtissue) => {
        const generatedTracks = generateTissueSpecificTracks(
          tissue,
          subtissue.name,
          subtissue.assays
        );
        tracks.push(...generatedTracks);
      });
    });

    return tracks;
  }, []);

  const groupedTracks = useMemo((): TissueGroup[] => {
    const tissues = Object.keys(TissueConfig);
    const groups: TissueGroup[] = [];

    tissues.forEach((tissue) => {
      const subtissues = TissueConfig[tissue];
      const subtissueGroups: SubtissueGroup[] = [];

      subtissues.forEach((subtissue) => {
        const generatedTracks = generateTissueSpecificTracks(
          tissue,
          subtissue.name,
          subtissue.assays
        );

        if (generatedTracks.length > 0) {
          const assayGroups: AssayGroup[] = generatedTracks.map((track) => ({
            assayName: track.tissueSource.assay,
            track,
          }));

          subtissueGroups.push({
            subtissueName: subtissue.name,
            assays: assayGroups,
          });
        }
      });

      if (subtissueGroups.length > 0) {
        groups.push({
          tissueName: tissue,
          subtissues: subtissueGroups,
        });
      }
    });

    return groups;
  }, []);

  const filteredGroupedTracks = useMemo(() => {
    if (!searchQuery && filterByAssayType.length === 0) {
      return groupedTracks;
    }

    const query = searchQuery.toLowerCase();

    return groupedTracks
      .map((tissueGroup) => {
        const filteredSubtissues = tissueGroup.subtissues
          .map((subtissueGroup) => {
            const filteredAssays = subtissueGroup.assays.filter((assayGroup) => {
              const matchesSearch =
                !searchQuery ||
                tissueGroup.tissueName.toLowerCase().includes(query) ||
                subtissueGroup.subtissueName.toLowerCase().includes(query) ||
                assayGroup.assayName.toLowerCase().includes(query) ||
                assayGroup.track.name.toLowerCase().includes(query);

              const matchesAssayFilter =
                filterByAssayType.length === 0 ||
                filterByAssayType.includes(assayGroup.assayName.toLowerCase());

              return matchesSearch && matchesAssayFilter;
            });

            if (filteredAssays.length === 0) return null;

            return {
              ...subtissueGroup,
              assays: filteredAssays,
            };
          })
          .filter((sg): sg is SubtissueGroup => sg !== null);

        if (filteredSubtissues.length === 0) return null;

        return {
          ...tissueGroup,
          subtissues: filteredSubtissues,
        };
      })
      .filter((tg): tg is TissueGroup => tg !== null);
  }, [groupedTracks, searchQuery, filterByAssayType]);

  const toggleTissue = useCallback((tissue: string) => {
    setExpandedTissues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tissue)) {
        newSet.delete(tissue);
      } else {
        newSet.add(tissue);
      }
      return newSet;
    });
  }, []);

  const toggleSubtissue = useCallback((subtissue: string) => {
    setExpandedSubtissues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subtissue)) {
        newSet.delete(subtissue);
      } else {
        newSet.add(subtissue);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllTissue = useCallback(
    (tissueGroup: TissueGroup, enabled: boolean) => {
      const trackIds = tissueGroup.subtissues.flatMap((st) =>
        st.assays.map((a) => a.track.id)
      );

      if (onBatchToggle) {
        onBatchToggle(trackIds, enabled);
      } else {
        trackIds.forEach((trackId) => {
          if (enabledTracks.includes(trackId) !== enabled) {
            onTrackToggle(trackId);
          }
        });
      }
    },
    [enabledTracks, onTrackToggle, onBatchToggle]
  );

  const handleSelectAllSubtissue = useCallback(
    (subtissueGroup: SubtissueGroup, enabled: boolean) => {
      const trackIds = subtissueGroup.assays.map((a) => a.track.id);

      if (onBatchToggle) {
        onBatchToggle(trackIds, enabled);
      } else {
        trackIds.forEach((trackId) => {
          if (enabledTracks.includes(trackId) !== enabled) {
            onTrackToggle(trackId);
          }
        });
      }
    },
    [enabledTracks, onTrackToggle, onBatchToggle]
  );

  const getTissueStats = useCallback(
    (tissueGroup: TissueGroup) => {
      const totalTracks = tissueGroup.subtissues.reduce(
        (acc, st) => acc + st.assays.length,
        0
      );
      const enabledCount = tissueGroup.subtissues.reduce(
        (acc, st) =>
          acc + st.assays.filter((a) => enabledTracks.includes(a.track.id)).length,
        0
      );
      return { totalTracks, enabledCount };
    },
    [enabledTracks]
  );

  const getSubtissueStats = useCallback(
    (subtissueGroup: SubtissueGroup) => {
      const totalTracks = subtissueGroup.assays.length;
      const enabledCount = subtissueGroup.assays.filter((a) =>
        enabledTracks.includes(a.track.id)
      ).length;
      return { totalTracks, enabledCount };
    },
    [enabledTracks]
  );

  const allAssayTypes = useMemo(() => {
    const types = new Set<string>();
    allTracks.forEach((track) => {
      types.add(track.tissueSource.assay.toLowerCase());
    });
    return Array.from(types).sort();
  }, [allTracks]);

  const totalEnabledCount = useMemo(() => {
    return enabledTracks.filter((trackId) =>
      allTracks.some((track) => track.id === trackId)
    ).length;
  }, [enabledTracks, allTracks]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalEnabledCount}/{allTracks.length} selected
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              placeholder="Search tissues, subtissues, or assays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {allAssayTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">
                Filter by:
              </span>
              {allAssayTypes.map((assayType) => (
                <Button
                  key={assayType}
                  variant={
                    filterByAssayType.includes(assayType) ? "default" : "outline"
                  }
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setFilterByAssayType((prev) =>
                      prev.includes(assayType)
                        ? prev.filter((t) => t !== assayType)
                        : [...prev, assayType]
                    );
                  }}
                  style={{
                    borderColor: filterByAssayType.includes(assayType)
                      ? assayColorMap[assayType]
                      : undefined,
                    backgroundColor: filterByAssayType.includes(assayType)
                      ? assayColorMap[assayType]
                      : undefined,
                  }}
                >
                  {assayType.toUpperCase()}
                </Button>
              ))}
              {filterByAssayType.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilterByAssayType([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-4">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-2 pb-4">
            {filteredGroupedTracks.map((tissueGroup) => {
              const { totalTracks, enabledCount } = getTissueStats(tissueGroup);
              const isExpanded = expandedTissues.has(tissueGroup.tissueName);
              const allSelected = enabledCount === totalTracks;
              const someSelected = enabledCount > 0 && enabledCount < totalTracks;

              return (
                <Collapsible
                  key={tissueGroup.tissueName}
                  open={isExpanded}
                  onOpenChange={() => toggleTissue(tissueGroup.tissueName)}
                >
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <h4 className="font-semibold text-sm">
                              {tissueGroup.tissueName}
                            </h4>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {enabledCount}/{totalTracks}
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border/30 p-2 space-y-2">
                        {tissueGroup.subtissues.map((subtissueGroup) => {
                          const subtissueKey = `${tissueGroup.tissueName}-${subtissueGroup.subtissueName}`;
                          const isSubExpanded =
                            expandedSubtissues.has(subtissueKey);
                          const {
                            totalTracks: subTotal,
                            enabledCount: subEnabled,
                          } = getSubtissueStats(subtissueGroup);
                          const subAllSelected = subEnabled === subTotal;

                          return (
                            <Collapsible
                              key={subtissueKey}
                              open={isSubExpanded}
                              onOpenChange={() => toggleSubtissue(subtissueKey)}
                            >
                              <div className={`border rounded-md overflow-hidden transition-all ${
                                subEnabled > 0
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border/30 bg-muted/20"
                              }`}>
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-start p-3 hover:bg-muted/50 cursor-pointer gap-3">
                                    <div className="flex items-start gap-2 flex-1 min-w-0 pt-0.5">
                                      {isSubExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 min-w-0 flex items-start gap-2">
                                        {subEnabled > 0 && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                        )}
                                        <p className="text-xs font-medium leading-relaxed text-foreground break-words pr-2">
                                          {subtissueGroup.subtissueName}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Badge
                                        variant={subEnabled > 0 ? "default" : "outline"}
                                        className="text-xs"
                                      >
                                        {subEnabled}/{subTotal}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs px-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllSubtissue(
                                            subtissueGroup,
                                            !subAllSelected
                                          );
                                        }}
                                      >
                                        {subAllSelected ? "Deselect" : "Select All"}
                                      </Button>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="border-t border-border/30 p-2 space-y-1.5">
                                    {subtissueGroup.assays.map((assayGroup) => {
                                      const isEnabled = enabledTracks.includes(
                                        assayGroup.track.id
                                      );
                                      const assayColor =
                                        assayColorMap[
                                          assayGroup.assayName.toLowerCase()
                                        ] || "#6b7280";

                                      return (
                                        <div
                                          key={assayGroup.track.id}
                                          className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                                            isEnabled
                                              ? "border-primary/30 bg-primary/5"
                                              : "border-border/50 hover:bg-muted/50"
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isEnabled}
                                            onCheckedChange={() =>
                                              onTrackToggle(assayGroup.track.id)
                                            }
                                            className="flex-shrink-0"
                                          />
                                          <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: assayColor }}
                                          />
                                          <span className="text-xs flex-1 truncate">
                                            {assayGroup.assayName.toUpperCase()}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {filteredGroupedTracks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No tracks found matching your filters
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
