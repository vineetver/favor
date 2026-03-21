"use client";

import type { ComponentType, RefObject } from "react";
import { useEffect, useState } from "react";

type GoslingComponentType = ComponentType<{ spec: unknown }>;

interface GoslingWrapperProps {
  spec: unknown;
  goslingRef?: RefObject<unknown>;
}

export function GoslingWrapper({ spec, goslingRef }: GoslingWrapperProps) {
  const [GoslingComponent, setGoslingComponent] =
    useState<GoslingComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Runtime import keeps this module out of the server/webpack static graph.
    import("gosling.js")
      .then((mod) => {
        // gosling.js is an untyped boundary for us (peer deps mismatch with React 19)
        setGoslingComponent(() => mod.GoslingComponent as GoslingComponentType);
      })
      .catch((err) => {
        console.error("Failed to load gosling.js:", err);
        setError("Failed to load visualization library");
      });
  }, []);

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  if (!GoslingComponent) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        Loading visualization...
      </div>
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: ref typing from external lib is not reliable in React 19
  return <GoslingComponent {...({ ref: goslingRef, spec } as any)} />;
}
