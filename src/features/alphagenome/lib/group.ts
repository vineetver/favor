import type { TrackMeta } from "../types";

/**
 * Bucket track indices by tissue_group, preserving an ordering useful for
 * display: groups appear in first-seen order; within a group, indices are
 * ordered by the track's original position (stable). Tracks without a
 * tissue_group land in a single "Other" bucket at the end.
 */
export function groupTrackIndicesByTissue(
  tracks: TrackMeta[],
): Array<{ tissue: string; indices: number[] }> {
  const order: string[] = [];
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i].tissue_group?.trim();
    const key = t && t.length > 0 ? t : "Other";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(i);
  }
  return order.map((tissue) => ({ tissue, indices: buckets.get(tissue)! }));
}
