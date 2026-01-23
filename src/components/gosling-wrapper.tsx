"use client";

import { GoslingComponent, type GoslingRef, type GoslingSpec } from "gosling.js";
import type { RefObject } from "react";

interface GoslingWrapperProps {
  spec: GoslingSpec;
  goslingRef?: RefObject<GoslingRef>;
}

export function GoslingWrapper({ spec, goslingRef }: GoslingWrapperProps) {
  return <GoslingComponent ref={goslingRef} spec={spec} />;
}
