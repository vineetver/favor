"use client";

import { useMemo } from "react";
import type { GoslingSpec } from "gosling.js";
import type { DomainChrInterval, Track } from "@/components/gosling";
import type { TrackMetadata } from "@/lib/tracks/types";

interface UseGoslingSpecProps {
  enabledTracks: TrackMetadata[];
  domain: DomainChrInterval | null;
  isStatic?: boolean;
}

export function useGoslingSpec({
  enabledTracks,
  domain,
  isStatic = false,
}: UseGoslingSpecProps): GoslingSpec | null {
  const goslingSpec = useMemo((): GoslingSpec | null => {
    if (!domain || enabledTracks.length === 0) return null;

    const views: any[] = [];

    // Single view for all tracks
    if (enabledTracks.length > 0) {
      views.push({
        id: "all-tracks",
        alignment: "stack",
        centerRadius: 0.1,
        layout: "linear",
        spacing: 0,
        static: isStatic,
        // @ts-ignore - Complex type mismatch with Gosling track types
        tracks: enabledTracks.flatMap((track) => {
          if (Array.isArray(track.track)) {
            // @ts-ignore - Type mismatch with OverlaidTracks
            return track.track.map((t: Track) => ({
              ...t,
              id: `${track.id}-${t.id || Math.random()}`,
              title: `${track.name} - ${t.title || t.id || ""}`,
            }));
          } else {
            // Handle single tracks
            return [
              {
                ...track.track,
                id: track.id,
                title: track.name,
                height: track.height,
              },
            ];
          }
        }),
      });
    }

    return {
      assembly: "hg38",
      layout: "linear",
      responsiveSize: { width: true },
      spacing: 20,
      xDomain: domain,
      arrangement: "vertical",
      views,
    };
  }, [domain, enabledTracks, isStatic]);

  return goslingSpec;
}
