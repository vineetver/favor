// src/features/genome-browser/components/browser-canvas/gosling-mount.tsx
//
// Lazy mount for the Gosling.js component.
//
// Why next/dynamic instead of a static import?
//   • gosling.js bundles PIXI + WebWorker code that breaks SSR.
//   • next.config.ts already lists gosling.js in `serverExternalPackages`,
//     so the server bundle won't try to resolve it.
//   • next/dynamic with ssr:false defers the import to the client and
//     hands us a single React component reference for the lifetime of the
//     page — no useEffect dance, no flicker on re-render.
//
// Why a separate file?
//   • Keeps the import call out of any component that re-renders during
//     state changes; otherwise next/dynamic re-evaluates and we lose the
//     mounted Gosling instance.

"use client";

import { Skeleton } from "@shared/components/ui/skeleton";
import type { GoslingSpec } from "gosling.js";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Loading placeholder that matches the canvas footprint so the layout
// doesn't jump when Gosling finishes loading.
function GoslingPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col gap-3 p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-5 w-32 mt-2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

type GoslingComponentProps = {
  spec: GoslingSpec;
  padding?: number;
  /**
   * Gosling theme name. Defaults to 'light' — passing this explicitly avoids
   * a black PIXI canvas if Gosling fails to resolve a default theme under
   * React 19 + alpha.9.
   */
  theme?:
    | "light"
    | "dark"
    | "warm"
    | "jbrowse"
    | "ucsc"
    | "washu"
    | "ggplot"
    | "excel"
    | "ensembl";
};

/**
 * Client-only Gosling renderer. Imported once at module load — the
 * underlying `import('gosling.js')` resolves once per page session.
 */
export const GoslingMount = dynamic<GoslingComponentProps>(
  () =>
    import("gosling.js").then(
      (mod) =>
        mod.GoslingComponent as unknown as ComponentType<GoslingComponentProps>,
    ),
  {
    ssr: false,
    loading: () => <GoslingPlaceholder />,
  },
);
