"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  COMPREHENSIVE_TRACK_REGISTRY,
  COMPREHENSIVE_TRACK_CATEGORIES,
  COMPREHENSIVE_TRACK_COLLECTIONS,
} from "@/lib/tracks/registry";
import type { TrackMetadata } from "@/lib/tracks/types";
import { TrackDetailsModal } from "@/components/features/genome-browser/track-details-modal";

// Category color mapping
const getCategoryColor = (categoryId: string): string => {
  const colors: Record<string, string> = {
    other: "#3B82F6", // blue
    "single-cell-tissue-tracks": "#10B981", // green
    clinvar: "#EF4444", // red
    mappability: "#8B5CF6", // purple
    "local-nucleotide-diversity": "#F59E0B", // amber
    conservation: "#06B6D4", // cyan
    integrative: "#F97316", // orange
    gwas: "#EC4899", // pink
  };
  return colors[categoryId] || "#6B7280"; // default gray
};

interface TrackSelectorProps {
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  onCollectionToggle?: (trackIds: string[], enabled: boolean) => void;
  className?: string;
}

interface TrackCardProps {
  track: TrackMetadata;
  isEnabled: boolean;
  categoryId: string;
  onToggle: (trackId: string) => void;
  onShowDetails: (trackId: string) => void;
}

// Category Section with Collapsible Accordion
interface CategorySectionProps {
  category: (typeof COMPREHENSIVE_TRACK_CATEGORIES)[0];
  tracks: TrackMetadata[];
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  onShowDetails: (trackId: string) => void;
}

function CategorySection({
  category,
  tracks,
  enabledTracks,
  onTrackToggle,
  onShowDetails,
}: CategorySectionProps) {
  // Check if any tracks in this category are enabled
  const hasEnabledTracks = tracks.some((track) =>
    enabledTracks.includes(track.id),
  );

  // Default open state: open if tracks are enabled, closed otherwise
  const [isOpen, setIsOpen] = useState(hasEnabledTracks);

  const enabledCount = tracks.filter((track) =>
    enabledTracks.includes(track.id),
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="group relative">
          <div className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded-lg transition-all duration-200 cursor-pointer">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(category.id) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {category.name}
                  </span>
                  {enabledCount > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground font-medium">
                {tracks.length}
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2 pb-4">
        <div className="space-y-3">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              isEnabled={enabledTracks.includes(track.id)}
              categoryId={category.id}
              onToggle={onTrackToggle}
              onShowDetails={onShowDetails}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TrackCard({
  track,
  isEnabled,
  categoryId,
  onToggle,
  onShowDetails,
}: TrackCardProps) {
  const categoryColor = getCategoryColor(categoryId);

  return (
    <div
      className={`relative rounded-lg border transition-all duration-200 ${
        isEnabled
          ? "border-l-4 bg-muted/30 shadow-sm"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
      }`}
      style={
        isEnabled
          ? {
              borderLeftColor: categoryColor,
            }
          : {}
      }
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="text-sm font-medium leading-tight truncate flex-1 text-foreground min-w-0">
            {track.name}
          </h4>
          <Switch
            checked={isEnabled}
            onCheckedChange={() => onToggle(track.id)}
            className="flex-shrink-0 mt-0.5"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowDetails(track.id)}
            className="flex-1 min-w-0 h-8 text-xs font-medium border-border/60 hover:border-border"
          >
            <span className="truncate">Details</span>
          </Button>

          {track.customization.filtersAvailable.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium border-border/60 hover:border-border disabled:opacity-40 flex-shrink-0"
              disabled={!isEnabled}
            >
              Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionCard({
  collection,
  enabledTracks,
  onToggle,
}: {
  collection: (typeof COMPREHENSIVE_TRACK_COLLECTIONS)[keyof typeof COMPREHENSIVE_TRACK_COLLECTIONS];
  enabledTracks: string[];
  onToggle: (trackIds: string[], enabled: boolean) => void;
}) {
  const enabledCount = collection.tracks.filter((trackId) =>
    enabledTracks.includes(trackId),
  ).length;
  const isFullyEnabled = enabledCount === collection.tracks.length;
  const isPartiallyEnabled =
    enabledCount > 0 && enabledCount < collection.tracks.length;

  const handleToggle = () => {
    onToggle(collection.tracks, !isFullyEnabled);
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-sm ${
        isFullyEnabled
          ? "border-l-4 border-l-primary bg-primary/5 shadow-sm"
          : isPartiallyEnabled
            ? "border-l-4 border-l-amber-500 bg-amber-50/40 shadow-sm"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
      }`}
      onClick={handleToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-semibold leading-tight mb-2 text-foreground break-words">
              {collection.name}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words">
              {collection.description}
            </p>
          </div>
          <Switch
            checked={isFullyEnabled}
            onCheckedChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 mt-0.5"
          />
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="text-xs h-5 px-2 font-medium border-border/60"
          >
            {collection.tracks.length} tracks
          </Badge>
          <Badge
            variant={
              isFullyEnabled
                ? "default"
                : isPartiallyEnabled
                  ? "secondary"
                  : "outline"
            }
            className="text-xs h-5 px-2 font-medium"
          >
            {enabledCount}/{collection.tracks.length}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Mobile Track Selector Button Component
const MobileTrackSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  { enabledCount: number; totalTracks: number } & React.ComponentProps<
    typeof Button
  >
>(({ enabledCount, totalTracks, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      className="flex items-center gap-2 md:hidden mb-4 w-full justify-between"
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">Tracks</span>
      </div>
      <Badge variant="outline" className="text-xs font-medium">
        {enabledCount}/{totalTracks}
      </Badge>
    </Button>
  );
});

MobileTrackSelectorTrigger.displayName = "MobileTrackSelectorTrigger";

function TrackSelectorContent({
  enabledTracks,
  onTrackToggle,
  onCollectionToggle,
  totalTracks,
  enabledCount,
}: TrackSelectorProps & { totalTracks: number; enabledCount: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetailTrack, setSelectedDetailTrack] = useState<string | null>(
    null,
  );
  const [showCollections, setShowCollections] = useState(false);

  // Filter tracks based on search
  const filteredTracks = useMemo(() => {
    const tracks = Object.values(COMPREHENSIVE_TRACK_REGISTRY);
    if (!searchQuery) return tracks;

    const query = searchQuery.toLowerCase();
    return tracks.filter(
      (track) =>
        track.name.toLowerCase().includes(query) ||
        track.description?.toLowerCase().includes(query) ||
        // track.tags.some(tag => tag.toLowerCase().includes(query)) ||
        track.authors.some((author) => author.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  // Group tracks by category
  const tracksByCategory = useMemo(() => {
    const grouped: Record<string, TrackMetadata[]> = {};

    COMPREHENSIVE_TRACK_CATEGORIES.forEach((category) => {
      grouped[category.id] = filteredTracks.filter(
        (track) => track.category === category.id,
      );
    });

    return grouped;
  }, [filteredTracks]);

  const handleCollectionToggle = (trackIds: string[], enabled: boolean) => {
    if (onCollectionToggle) {
      onCollectionToggle(trackIds, enabled);
    } else {
      // Fallback to individual track toggles
      trackIds.forEach((trackId) => {
        if (enabledTracks.includes(trackId) !== enabled) {
          onTrackToggle(trackId);
        }
      });
    }
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 md:p-6 pb-4 pt-12 md:pt-4">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-semibold truncate">Tracks</h2>
            </div>
            <Badge
              variant="outline"
              className="text-xs flex-shrink-0 ml-2 font-medium"
            >
              {enabledCount}/{totalTracks}
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Content - Scrollable with Tabs */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs
            value={showCollections ? "collections" : "individual"}
            onValueChange={(value) =>
              setShowCollections(value === "collections")
            }
            className="h-full flex flex-col"
          >
            {/* Tabs Header */}
            <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-border/50">
              <TabsList className="grid w-full grid-cols-2 bg-background gap-1 border p-1 h-11">
                <TabsTrigger
                  value="individual"
                  className="text-sm font-medium data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
                >
                  Individual
                </TabsTrigger>
                <TabsTrigger
                  value="collections"
                  className="text-sm font-medium data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
                >
                  Collections
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent
                value="collections"
                className="h-full m-0 overflow-hidden"
              >
                <div className="h-full overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4">
                  <div className="space-y-3 max-w-full">
                    <div className="space-y-3 pb-4">
                      {Object.entries(COMPREHENSIVE_TRACK_COLLECTIONS).map(
                        ([collectionId, collection]) => (
                          <CollectionCard
                            key={collectionId}
                            collection={collection}
                            enabledTracks={enabledTracks}
                            onToggle={handleCollectionToggle}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="individual"
                className="h-full m-0 overflow-hidden"
              >
                <div className="h-full overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4">
                  <div className="space-y-2 pb-4 max-w-full">
                    {COMPREHENSIVE_TRACK_CATEGORIES.filter(
                      (category) => tracksByCategory[category.id]?.length > 0,
                    ).map((category) => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        tracks={tracksByCategory[category.id]}
                        enabledTracks={enabledTracks}
                        onTrackToggle={onTrackToggle}
                        onShowDetails={setSelectedDetailTrack}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Track Details Modal */}
      <TrackDetailsModal
        trackId={selectedDetailTrack}
        isOpen={selectedDetailTrack !== null}
        onClose={() => setSelectedDetailTrack(null)}
        onToggleTrack={onTrackToggle}
      />
    </>
  );
}

export function TrackSelector({
  enabledTracks,
  onTrackToggle,
  onCollectionToggle,
  className,
}: TrackSelectorProps) {
  const totalTracks = Object.keys(COMPREHENSIVE_TRACK_REGISTRY).length;
  const enabledCount = enabledTracks.length;

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex w-80 bg-card flex-col h-full min-h-0 rounded-lg border border-border/50 shadow-sm ${className || ""}`}
      >
        <TrackSelectorContent
          enabledTracks={enabledTracks}
          onTrackToggle={onTrackToggle}
          onCollectionToggle={onCollectionToggle}
          totalTracks={totalTracks}
          enabledCount={enabledCount}
        />
      </div>

      {/* Mobile Sheet */}
      <div className="md:hidden w-full px-4 sm:px-6 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <MobileTrackSelectorTrigger
              enabledCount={enabledCount}
              totalTracks={totalTracks}
            />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-full sm:w-[400px] p-0 overflow-hidden"
          >
            <div className="h-full overflow-hidden">
              <TrackSelectorContent
                enabledTracks={enabledTracks}
                onTrackToggle={onTrackToggle}
                onCollectionToggle={onCollectionToggle}
                totalTracks={totalTracks}
                enabledCount={enabledCount}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
