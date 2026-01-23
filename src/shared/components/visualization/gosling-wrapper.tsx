"use client";

import { useEffect, useState, type RefObject } from "react";

interface GoslingWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: any; // GoslingSpec
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goslingRef?: RefObject<any>; // GoslingRef
}

export function GoslingWrapper({ spec, goslingRef }: GoslingWrapperProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [GoslingComponent, setGoslingComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamic import at runtime to bypass webpack ESM resolution issues
    import("gosling.js")
      .then((mod) => {
        setGoslingComponent(() => mod.GoslingComponent);
      })
      .catch((err) => {
        console.error("Failed to load gosling.js:", err);
        setError("Failed to load visualization library");
      });
  }, []);

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!GoslingComponent) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-500">
        Loading visualization...
      </div>
    );
  }

  return <GoslingComponent ref={goslingRef} spec={spec} />;
}
