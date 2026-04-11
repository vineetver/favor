"use client";

/**
 * Dynamic Plotly wrapper — avoids SSR issues (plotly.js requires `window`).
 * All chart components in this directory import this instead of react-plotly.js directly.
 */

import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
}) as React.ComponentType<PlotParams>;

export { Plot };
export type { PlotParams };
