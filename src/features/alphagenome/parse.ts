/**
 * Boundary parser for AlphaGenome prediction artifacts.
 *
 * The render layer trusts `VariantTrackResult`. This file is the only place
 * that converts unknown bytes from the wire into that type. It rejects
 * malformed shapes loudly with enough context to debug.
 */

import type {
  Modality,
  TrackData,
  TrackMeta,
  VariantTrackResult,
} from "./types";

function fail(field: string, detail: string): never {
  throw new Error(`Invalid VariantTrackResult: ${field} — ${detail}`);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseTrackMeta(raw: unknown, where: string): TrackMeta {
  if (!isObj(raw)) fail(where, `expected object, got ${typeof raw}`);
  // The on-disk field "Assay title" (with space) is remapped to assay_title.
  const obj = raw as Record<string, unknown>;
  const assayTitle = obj.assay_title ?? obj["Assay title"];
  const name = obj.name;
  const biosample = obj.biosample_name;
  if (typeof name !== "string") fail(`${where}.name`, "missing or non-string");
  if (typeof biosample !== "string")
    fail(`${where}.biosample_name`, "missing or non-string");
  return {
    ...obj,
    name,
    biosample_name: biosample,
    assay_title: typeof assayTitle === "string" ? assayTitle : undefined,
  };
}

function parseTrackData(raw: unknown, where: string): TrackData {
  if (!isObj(raw)) fail(where, `expected object, got ${typeof raw}`);
  const values = raw.values;
  const tracks = raw.tracks;
  if (!Array.isArray(values)) fail(`${where}.values`, "not an array");
  if (!Array.isArray(tracks)) fail(`${where}.tracks`, "not an array");
  // Empty values is allowed (silently dropped by renderer with a notice).
  if (values.length > 0 && !Array.isArray(values[0])) {
    fail(`${where}.values[0]`, "expected number[][], got 1D");
  }
  const parsedTracks = tracks.map((t, i) =>
    parseTrackMeta(t, `${where}.tracks[${i}]`),
  );
  const interval = isObj(raw.interval)
    ? {
        chromosome: String(raw.interval.chromosome ?? ""),
        start: Number(raw.interval.start ?? 0),
        end: Number(raw.interval.end ?? 0),
      }
    : undefined;
  return {
    values: values as number[][],
    tracks: parsedTracks,
    resolution: typeof raw.resolution === "number" ? raw.resolution : undefined,
    num_tracks: typeof raw.num_tracks === "number" ? raw.num_tracks : undefined,
    num_positions:
      typeof raw.num_positions === "number" ? raw.num_positions : undefined,
    interval,
  };
}

function parseModalityMap(
  raw: unknown,
  where: string,
): Partial<Record<Modality, TrackData>> {
  if (!isObj(raw)) fail(where, `expected object, got ${typeof raw}`);
  const out: Partial<Record<Modality, TrackData>> = {};
  for (const [key, val] of Object.entries(raw)) {
    out[key as Modality] = parseTrackData(val, `${where}.${key}`);
  }
  return out;
}

export function parseVariantTrackResult(raw: unknown): VariantTrackResult {
  if (!isObj(raw)) fail("root", `expected object, got ${typeof raw}`);
  if (raw.type !== "variant")
    fail("type", `expected "variant", got ${JSON.stringify(raw.type)}`);
  if (!isObj(raw.input)) fail("input", "missing or not an object");
  const { chromosome, position, ref, alt } = raw.input as Record<
    string,
    unknown
  >;
  if (typeof chromosome !== "string")
    fail("input.chromosome", `got ${typeof chromosome}`);
  if (typeof position !== "number")
    fail("input.position", `got ${typeof position}`);
  if (typeof ref !== "string") fail("input.ref", `got ${typeof ref}`);
  if (typeof alt !== "string") fail("input.alt", `got ${typeof alt}`);
  if (!Array.isArray(raw.modalities))
    fail("modalities", "missing or not an array");
  const modalities = raw.modalities.filter(
    (m): m is string => typeof m === "string",
  ) as Modality[];
  return {
    type: "variant",
    input: { chromosome, position, ref, alt },
    modalities,
    reference: parseModalityMap(raw.reference, "reference"),
    alternate: parseModalityMap(raw.alternate, "alternate"),
  };
}
