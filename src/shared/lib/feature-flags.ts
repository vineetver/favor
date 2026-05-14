/**
 * Feature flag registry.
 *
 * Single source of truth for runtime gates on the frontend. Add a flag here,
 * read it everywhere via `isFlagEnabled(name)` or `useFlag(name)`.
 *
 * Categories:
 *  - "compliance": gates data/UX behind an external policy approval. MUST also
 *    be enforced server-side; client checks are presentation only.
 *  - "rollout": gradual user-facing release. Safe to gate client-side alone.
 *  - "kill": emergency disable. Toggle without redeploy when the resolver
 *    grows to support runtime config.
 *
 * Resolution order (top wins) is implemented in `resolveFlag`:
 *   1. Server-issued claim (future) — per-user / per-tenant
 *   2. Build-time env var — global default for the deployment
 *   3. Registry default
 *
 * When adding a flag, always set `owner` and `description`. Temporary flags
 * (rollouts) should set `expiresOn` so they can be cleaned up.
 */

export type FlagCategory = "compliance" | "rollout" | "kill";

export interface FlagDefinition {
  description: string;
  owner: string;
  category: FlagCategory;
  envVar?: `NEXT_PUBLIC_${string}`;
  default: boolean;
  expiresOn?: string; // ISO date — flag should be removed by then
  notes?: string;
}

export const FLAGS = {
  igvfLipid: {
    description:
      "Expose IGVF Lipid Analysis (wizard option + analytics tab + export files).",
    owner: "vineetver",
    category: "compliance",
    envVar: "NEXT_PUBLIC_IGVF_ENABLED",
    default: false,
    notes:
      "Gated until IGVF clears data redistribution. Server MUST also enforce on /cohorts/{id}/files and /files.zip — client check is presentation only.",
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagName = keyof typeof FLAGS;

/**
 * Read a flag's effective value. Pure, safe to call from server and client.
 *
 * Today: env var or registry default. When per-user targeting is needed,
 * accept a `context: { userClaims }` arg and consult claims first.
 */
export function isFlagEnabled(name: FlagName): boolean {
  const def = FLAGS[name];
  if (def.envVar) {
    const raw = readEnv(def.envVar);
    if (raw !== undefined) return raw === "true";
  }
  return def.default;
}

/** React hook form. Identical semantics; exists so future server-context
 *  variants don't ripple through callsites. */
export function useFlag(name: FlagName): boolean {
  return isFlagEnabled(name);
}

/** Indirection so Next can statically inline `NEXT_PUBLIC_*` lookups while
 *  still allowing a single resolver. The switch is verbose but required —
 *  dynamic `process.env[name]` is not inlined and breaks in the browser. */
function readEnv(name: FlagDefinition["envVar"]): string | undefined {
  switch (name) {
    case "NEXT_PUBLIC_IGVF_ENABLED":
      return process.env.NEXT_PUBLIC_IGVF_ENABLED;
    default:
      return undefined;
  }
}
