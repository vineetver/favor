/**
 * Shared Plotly defaults — matches FAVOR design tokens.
 */

export const PLOTLY_FONT = {
  family: "Inter, system-ui, sans-serif",
  size: 12,
  color: "#171717",
};

export const PLOTLY_AXIS = {
  gridcolor: "#e5e5e5",
  linecolor: "#171717",
  zerolinecolor: "#e5e5e5",
  showline: true,
};

/** Config with mode bar (for zoomable plots like Manhattan) */
export const PLOTLY_CONFIG: Record<string, unknown> = {
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d", "autoScale2d"],
  toImageButtonOptions: { format: "svg", scale: 2 },
};

/** Config with mode bar hidden (for static plots like forest, crosshair) */
export const PLOTLY_CONFIG_STATIC: Record<string, unknown> = {
  displayModeBar: false,
  displaylogo: false,
  responsive: true,
  staticPlot: false,
};

/** Viridis-inspired palette for method-level comparisons (13 methods) */
export const METHOD_PALETTE: Record<string, string> = {
  Overall:        "#fde725",
  aPC:            "#440154",
  chromBPnet:     "#31688e",
  ClinVar:        "#443983",
  liver_cV2F:     "#21918c",
  cV2F:           "#277f8e",
  liver_ASE:      "#35b779",
  ASE:            "#4ac16d",
  liver_TLand:    "#90d743",
  DHS_MGH_Prom:   "#e11d48",
  DHS_MGH_Enh:    "#f97316",
  DHS_UNC_Prom:   "#0ea5e9",
  DHS_UNC_Enh:    "#06b6d4",
};

/** Marker symbols matching R ggplot shapes (13 methods) */
export const METHOD_SYMBOLS: Record<string, string> = {
  Overall:        "star",
  aPC:            "circle",
  chromBPnet:     "triangle-up",
  ClinVar:        "square",
  liver_cV2F:     "diamond",
  cV2F:           "cross",
  liver_ASE:      "x",
  ASE:            "hexagon",
  liver_TLand:    "triangle-down",
  DHS_MGH_Prom:   "pentagon",
  DHS_MGH_Enh:    "triangle-right",
  DHS_UNC_Prom:   "bowtie",
  DHS_UNC_Enh:    "triangle-left",
};
