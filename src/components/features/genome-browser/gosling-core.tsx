"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GoslingComponent } from "gosling.js";
import type { GoslingSpec } from "gosling.js";
import { useRef } from "react";

interface GoslingCoreProps {
  spec: GoslingSpec | null;
  className?: string;
  onRegionChange?: (region: {
    chromosome: string;
    start: number;
    end: number;
  }) => void;
}

export function GoslingCore({
  spec,
  className = "",
  onRegionChange,
}: GoslingCoreProps) {
  const goslingRef = useRef<any>(null);

  if (!spec) {
    return (
      <div
        className={`w-full h-96 flex items-center justify-center bg-accent/10 rounded-lg border border-dashed border-border ${className}`}
      >
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No genome data to display</p>
          <p className="text-sm text-muted-foreground">
            Provide a valid Gosling specification to view the genome browser
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className={`p-0 sm:p-4 ${className}`}>
        <GoslingComponent
          ref={goslingRef}
          spec={spec}
          padding={8}
          margin={8}
          reactive={true}
        />
      </CardContent>
    </Card>
  );
}
