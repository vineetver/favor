"use client";

// src/features/genome-browser/components/track-selector/collections-list.tsx
// List of pre-built track collections

import { cn } from "@infra/utils";
import { Check, FolderOpen, Lock } from "lucide-react";
import { useCallback } from "react";
import { getAllCollections } from "../../config/collections";
import {
  useBrowserActions,
  useVisibleTrackIds,
} from "../../state/browser-context";
import { getTrackById } from "../../tracks/registry";
import type { TrackCollection } from "../../types/tracks";

type CollectionsListProps = {
  className?: string;
};

const COLLECTIONS = getAllCollections();

export function CollectionsList({ className }: CollectionsListProps) {
  const actions = useBrowserActions();
  const visibleIds = useVisibleTrackIds();
  const collections = COLLECTIONS;

  const loadCollection = useCallback(
    (collection: TrackCollection) => {
      const trackDefinitions = collection.trackIds
        .map((id) => getTrackById(id))
        .filter((def): def is NonNullable<typeof def> => def !== undefined);
      actions.loadCollection(trackDefinitions);
    },
    [actions],
  );

  const isCollectionActive = (collection: TrackCollection): boolean => {
    if (collection.trackIds.length !== visibleIds.size) return false;
    for (const id of collection.trackIds) {
      if (!visibleIds.has(id)) return false;
    }
    return true;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Collections
        </span>
      </div>

      <div className="space-y-1 px-2">
        {collections.map((collection) => {
          const isActive = isCollectionActive(collection);
          const requiresTissue = collection.requiresTissue;

          return (
            <button
              key={collection.id}
              onClick={() => loadCollection(collection)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                isActive
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-accent border border-transparent",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {collection.name}
                  </span>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                  {requiresTissue && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {collection.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {collection.trackIds.length} tracks
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground px-5 pt-2">
        Click a collection to replace all current tracks.
      </p>
    </div>
  );
}
