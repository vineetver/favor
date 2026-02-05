declare module "react-cytoscapejs" {
  import type { Core, ElementDefinition, StylesheetStyle } from "cytoscape";
  import type { ComponentType } from "react";

  interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    stylesheet?: StylesheetStyle[];
    className?: string;
    cy?: (cy: Core) => void;
    wheelSensitivity?: number;
    minZoom?: number;
    maxZoom?: number;
    boxSelectionEnabled?: boolean;
    autounselectify?: boolean;
    layout?: object;
    pan?: { x: number; y: number };
    zoom?: number;
    userPanningEnabled?: boolean;
    userZoomingEnabled?: boolean;
    autoungrabify?: boolean;
    headless?: boolean;
    styleEnabled?: boolean;
    hideEdgesOnViewport?: boolean;
    textureOnViewport?: boolean;
    motionBlur?: boolean;
    motionBlurOpacity?: number;
    pixelRatio?: number | "auto";
  }

  const CytoscapeComponent: ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
