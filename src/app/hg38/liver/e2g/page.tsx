"use client";

import {
  GoslingComponent,
  type GoslingRef,
  type GoslingSpec,
} from "gosling.js";
import { Download, RotateCcw, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const BASE_URL =
  "https://minio-s3-favor-4ee4be.apps.shift.nerc.mghpcc.org/favor-hg38/lkp/browser/hg38/liver/e2g";

// Dataset definitions
const DATASETS = {
  all_regions: {
    label: "All cell types (BED10)",
    url: `${BASE_URL}/all_regions.bed.gz`,
    indexUrl: `${BASE_URL}/all_regions.bed.gz.tbi`,
    hasCellType: true,
  },
  hepatocytes: {
    label: "Hepatocytes",
    url: `${BASE_URL}/hepatocytes.bed.gz`,
    indexUrl: `${BASE_URL}/hepatocytes.bed.gz.tbi`,
    hasCellType: false,
  },
  kupffer: {
    label: "Kupffer cells",
    url: `${BASE_URL}/kupffer.bed.gz`,
    indexUrl: `${BASE_URL}/kupffer.bed.gz.tbi`,
    hasCellType: false,
  },
  lsec: {
    label: "LSEC",
    url: `${BASE_URL}/lsec.bed.gz`,
    indexUrl: `${BASE_URL}/lsec.bed.gz.tbi`,
    hasCellType: false,
  },
  b_cells: {
    label: "B cells",
    url: `${BASE_URL}/b_cells.bed.gz`,
    indexUrl: `${BASE_URL}/b_cells.bed.gz.tbi`,
    hasCellType: false,
  },
  cholangiocytes: {
    label: "Cholangiocytes",
    url: `${BASE_URL}/cholangiocytes.bed.gz`,
    indexUrl: `${BASE_URL}/cholangiocytes.bed.gz.tbi`,
    hasCellType: false,
  },
  mesenchymal: {
    label: "Mesenchymal",
    url: `${BASE_URL}/mesenchymal.bed.gz`,
    indexUrl: `${BASE_URL}/mesenchymal.bed.gz.tbi`,
    hasCellType: false,
  },
  "nk-t": {
    label: "NK-T cells",
    url: `${BASE_URL}/nk-t.bed.gz`,
    indexUrl: `${BASE_URL}/nk-t.bed.gz.tbi`,
    hasCellType: false,
  },
} as const;

type DatasetKey = keyof typeof DATASETS;

// Color palettes
const CELL_TYPE_COLORS: Record<string, string> = {
  hepatocytes: "#1f77b4",
  kupffer: "#ff7f0e",
  lsec: "#2ca02c",
  b_cells: "#d62728",
  cholangiocytes: "#9467bd",
  mesenchymal: "#8c564b",
  "nk-t": "#e377c2",
};

const REGION_CLASS_COLORS: Record<string, string> = {
  promoter: "#e41a1c",
  enhancer: "#377eb8",
  distal: "#4daf4a",
  intronic: "#984ea3",
  intergenic: "#ff7f00",
};

// Default region: APOE locus
const DEFAULT_REGION = {
  chromosome: "chr19",
  start: 44885000,
  end: 44925000,
};

interface SelectedEnhancer {
  chrom: string;
  chromStart: number;
  chromEnd: number;
  genes: Array<{
    gene: string;
    score: number;
    regionClass: string;
    cellType?: string;
  }>;
}

function parseRegion(
  regionStr: string,
): { chromosome: string; start: number; end: number } | null {
  const match = regionStr.match(/^(chr\w+):(\d+)-(\d+)$/i);
  if (!match) return null;
  return {
    chromosome: match[1],
    start: parseInt(match[2], 10),
    end: parseInt(match[3], 10),
  };
}

function formatRegion(chromosome: string, start: number, end: number): string {
  return `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`;
}

export default function LiverE2GBrowser() {
  // biome-ignore lint/style/noNonNullAssertion: GoslingComponent requires non-null ref
  const goslingRef = useRef<GoslingRef>(null!);
  const [dataset, setDataset] = useState<DatasetKey>("all_regions");
  const [regionInput, setRegionInput] = useState(
    formatRegion(
      DEFAULT_REGION.chromosome,
      DEFAULT_REGION.start,
      DEFAULT_REGION.end,
    ),
  );
  const [currentRegion, setCurrentRegion] = useState(DEFAULT_REGION);
  const [selectedEnhancer, setSelectedEnhancer] =
    useState<SelectedEnhancer | null>(null);

  const datasetConfig = DATASETS[dataset];

  // Build Gosling spec
  const buildSpec = useCallback((): GoslingSpec => {
    const { url, indexUrl, hasCellType } = datasetConfig;
    const { chromosome, start, end } = currentRegion;

    // Common data definition for BED files using Gosling's BED format
    // BED standard fields (auto-mapped): chrom, chromStart, chromEnd
    // Custom fields after position 3: gene_tss, gene, score, region_class, gene_start, gene_end [, cell_type]
    //
    // NOTE: If you see "incorrect gzip header check" error, the browser may have cached
    // corrupted data. Try: Ctrl+Shift+R (hard refresh) or clear browser cache.
    const commonData = {
      type: "bed" as const,
      url,
      indexUrl,
      sampleLength: 5000,
      // customFields names the columns after the first 3 standard BED fields
      customFields: hasCellType
        ? [
            "gene_tss",
            "gene",
            "score",
            "region_class",
            "gene_start",
            "gene_end",
            "cell_type",
          ]
        : [
            "gene_tss",
            "gene",
            "score",
            "region_class",
            "gene_start",
            "gene_end",
          ],
    };

    // Color encoding based on dataset
    const rectColor = hasCellType
      ? {
          field: "cell_type",
          type: "nominal" as const,
          domain: Object.keys(CELL_TYPE_COLORS),
          range: Object.values(CELL_TYPE_COLORS),
          legend: true,
        }
      : {
          field: "region_class",
          type: "nominal" as const,
          domain: Object.keys(REGION_CLASS_COLORS),
          range: Object.values(REGION_CLASS_COLORS),
          legend: true,
        };

    // Filter for selected enhancer (if any)
    const arcDataTransform = selectedEnhancer
      ? [
          {
            type: "filter" as const,
            field: "chromStart",
            oneOf: [selectedEnhancer.chromStart],
          },
          {
            type: "filter" as const,
            field: "chromEnd",
            oneOf: [selectedEnhancer.chromEnd],
          },
        ]
      : [];

    // Linking ID for synchronized zooming/panning across tracks
    const LINKING_ID = "e2g-browser-link";

    // Gene annotation track from Gosling server
    const geneTrack = {
      id: "gene-annotation",
      title: "Genes (GENCODE)",
      alignment: "overlay" as const,
      data: {
        url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
        type: "beddb" as const,
        genomicFields: [
          { index: 1, name: "start" },
          { index: 2, name: "end" },
        ],
        valueFields: [
          { index: 5, name: "strand", type: "nominal" },
          { index: 3, name: "name", type: "nominal" },
        ],
        exonIntervalFields: [
          { index: 12, name: "start" },
          { index: 13, name: "end" },
        ],
      },
      tracks: [
        {
          dataTransform: [
            { type: "filter" as const, field: "type", oneOf: ["gene"] },
          ],
          mark: "text" as const,
          text: { field: "name", type: "nominal" as const },
          x: {
            field: "start",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          xe: { field: "end", type: "genomic" as const },
          style: { dy: -12, textFontSize: 10 },
        },
        {
          dataTransform: [
            { type: "filter" as const, field: "type", oneOf: ["exon"] },
          ],
          mark: "rect" as const,
          x: {
            field: "start",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          xe: { field: "end", type: "genomic" as const },
          size: { value: 10 },
        },
        {
          dataTransform: [
            { type: "filter" as const, field: "type", oneOf: ["gene"] },
          ],
          mark: "rule" as const,
          x: {
            field: "start",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          xe: { field: "end", type: "genomic" as const },
          strokeWidth: { value: 2 },
        },
      ],
      row: { field: "strand", type: "nominal" as const, domain: ["+", "-"] },
      color: {
        field: "strand",
        type: "nominal" as const,
        domain: ["+", "-"],
        range: ["#7585FF", "#FF8A85"],
      },
      tooltip: [
        { field: "name", type: "nominal" as const, alt: "Gene Name" },
        { field: "strand", type: "nominal" as const, alt: "Strand" },
        { field: "start", type: "genomic" as const, alt: "Gene Start" },
        { field: "end", type: "genomic" as const, alt: "Gene End" },
      ],
      width: 800,
      height: 80,
    };

    // Enhancer regions track (Track 1) - shows actual enhancer intervals
    const enhancerTrack = {
      id: "enhancer-regions",
      title: "Enhancers (score ≥ 0.7)",
      data: commonData,
      dataTransform: [
        {
          type: "filter" as const,
          field: "gene_start",
          not: true,
          oneOf: [".", ""],
        },
        {
          type: "filter" as const,
          field: "score",
          inRange: [0.7, 1.0],
        },
      ],
      mark: "rect" as const,
      x: {
        field: "chromStart",
        type: "genomic" as const,
        axis: "top" as const,
        linkingId: LINKING_ID,
      },
      xe: { field: "chromEnd", type: "genomic" as const },
      color: rectColor,
      opacity: {
        field: "score",
        type: "quantitative" as const,
        range: [0.7, 1.0],
      },
      tooltip: [
        {
          field: "chromStart",
          type: "genomic" as const,
          alt: "Enhancer Start",
        },
        { field: "chromEnd", type: "genomic" as const, alt: "Enhancer End" },
        { field: "gene", type: "nominal" as const, alt: "Target Gene" },
        {
          field: "region_class",
          type: "nominal" as const,
          alt: "Region Class",
        },
        ...(hasCellType
          ? [{ field: "cell_type", type: "nominal" as const, alt: "Cell Type" }]
          : []),
      ],
      width: 800,
      height: 120,
    };

    // E2G Links track (Track 2) - withinLink connecting enhancer to gene
    const linksTrack = {
      id: "e2g-links",
      title: selectedEnhancer
        ? "E2G Links (filtered)"
        : "E2G Links (score ≥ 0.7)",
      data: commonData,
      dataTransform: [
        {
          type: "filter" as const,
          field: "gene_start",
          not: true,
          oneOf: [".", ""],
        },
        {
          type: "filter" as const,
          field: "score",
          inRange: [0.7, 1.0],
        },
      ],
      mark: "withinLink" as const,
      // Source: enhancer interval (x, xe)
      x: {
        field: "chromStart",
        type: "genomic" as const,
        linkingId: LINKING_ID,
      },
      xe: { field: "chromEnd", type: "genomic" as const },
      // Target: gene start position
      x1: { field: "gene_end", type: "genomic" as const },
      x1e: { field: "gene_start", type: "genomic" as const },
      color: { value: "none" },
      stroke: hasCellType
        ? {
            field: "cell_type",
            type: "nominal" as const,
            domain: Object.keys(CELL_TYPE_COLORS),
            range: Object.values(CELL_TYPE_COLORS),
            legend: true,
          }
        : {
            field: "score",
            type: "quantitative" as const,
            domain: [0.7, 1.0],
            range: ["#feb24c", "#e31a1c"],
          },
      strokeWidth: { value: 3 },
      opacity: {
        field: "score",
        type: "quantitative" as const,
        domain: [0.7, 1.0],
        range: [0.6, 1.0],
      },
      tooltip: [
        { field: "gene", type: "nominal" as const, alt: "Target Gene" },
        { field: "gene_tss", type: "genomic" as const, alt: "Gene TSS" },
        {
          field: "chromStart",
          type: "genomic" as const,
          alt: "Enhancer Start",
        },
        { field: "chromEnd", type: "genomic" as const, alt: "Enhancer End" },
        { field: "score", type: "quantitative" as const, alt: "E2G Score" },
        {
          field: "region_class",
          type: "nominal" as const,
          alt: "Region Class",
        },
        ...(hasCellType
          ? [{ field: "cell_type", type: "nominal" as const, alt: "Cell Type" }]
          : []),
      ],
      width: 800,
      height: 200,
    };

    return {
      title: "Liver E2G Browser",
      subtitle: `${datasetConfig.label} | ${formatRegion(chromosome, start, end)}`,
      assembly: "hg38",
      xDomain: { chromosome, interval: [start, end] },
      centerRadius: 0.5,
      // 3 stacked tracks: Enhancers (top) → Links with arrows (middle) → Genes (bottom)
      views: [
        {
          linkingId: LINKING_ID,
          alignment: "stack" as const,
          tracks: [enhancerTrack, linksTrack, geneTrack],
        },
      ],
    } as GoslingSpec;
  }, [datasetConfig, currentRegion, selectedEnhancer]);

  const handleGoToRegion = () => {
    const parsed = parseRegion(regionInput.replace(/,/g, ""));
    if (parsed) {
      setCurrentRegion(parsed);
      setSelectedEnhancer(null);
    }
  };

  const handleResetSelection = () => {
    setSelectedEnhancer(null);
  };

  const handleExportPNG = async (transparent: boolean) => {
    if (goslingRef.current) {
      try {
        await goslingRef.current.api.exportPng(transparent);
      } catch (e) {
        console.error("Export failed:", e);
      }
    }
  };

  const handleExportPDF = async () => {
    if (goslingRef.current) {
      try {
        await goslingRef.current.api.exportPdf();
      } catch (e) {
        console.error("PDF export failed:", e);
      }
    }
  };

  const spec = buildSpec();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Liver E2G Browser</h1>
          <p className="text-muted-foreground mt-2">
            Explore enhancer-to-gene links in liver cell types (hg38)
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              {/* Dataset selector */}
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="text-sm font-medium">
                  Dataset
                </label>
                <select
                  id="dataset-select"
                  value={dataset}
                  onChange={(e) => {
                    setDataset(e.target.value as DatasetKey);
                    setSelectedEnhancer(null);
                  }}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {Object.entries(DATASETS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region input */}
              <div className="space-y-2">
                <label htmlFor="region-input" className="text-sm font-medium">
                  Region
                </label>
                <div className="flex gap-2">
                  <Input
                    id="region-input"
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    placeholder="chr19:44885000-44925000"
                    className="w-56"
                    onKeyDown={(e) => e.key === "Enter" && handleGoToRegion()}
                  />
                  <Button onClick={handleGoToRegion}>Go</Button>
                </div>
              </div>

              {/* Export buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPNG(true)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  PNG (transparent)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPNG(false)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  PNG (white)
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="mr-1 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Gosling visualization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Visualization</CardTitle>
              <CardDescription>
                Click on an enhancer region to filter links and see target genes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <GoslingComponent ref={goslingRef} spec={spec} />
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                {datasetConfig.hasCellType ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Cell Types
                    </p>
                    {Object.entries(CELL_TYPE_COLORS).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs capitalize">
                          {type.replace(/_/g, " ").replace(/-/g, "/")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Region Classes
                    </p>
                    {Object.entries(REGION_CLASS_COLORS).map(
                      ([type, color]) => (
                        <div key={type} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs capitalize">{type}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected enhancer panel */}
            {selectedEnhancer && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Selected Enhancer</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleResetSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    {selectedEnhancer.chrom}:
                    {selectedEnhancer.chromStart.toLocaleString()}-
                    {selectedEnhancer.chromEnd.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Target genes ({selectedEnhancer.genes.length}):
                    </p>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {selectedEnhancer.genes
                        .sort((a, b) => b.score - a.score)
                        .map((g, i) => (
                          <div
                            key={`${g.gene}-${i}`}
                            className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs"
                          >
                            <span className="font-medium">{g.gene}</span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>{g.score.toFixed(3)}</span>
                              <span className="capitalize">
                                {g.regionClass}
                              </span>
                              {g.cellType && (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      CELL_TYPE_COLORS[g.cellType] || "#888",
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleResetSelection}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Example Regions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {[
                    { label: "APOE locus", region: "chr19:44885000-44925000" },
                    { label: "ALB locus", region: "chr4:73400000-73430000" },
                    { label: "HNF4A locus", region: "chr20:44350000-44450000" },
                  ].map(({ label, region }) => (
                    <Button
                      key={region}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        setRegionInput(region);
                        const parsed = parseRegion(region);
                        if (parsed) {
                          setCurrentRegion(parsed);
                          setSelectedEnhancer(null);
                        }
                      }}
                    >
                      {label}
                      <span className="ml-auto text-muted-foreground">
                        {region}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info panel */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Data:</strong> Enhancer-to-gene (E2G) links from liver
                cell types. Each link connects an enhancer region to a target
                gene with an activity score.
              </p>
              <p className="mt-2">
                <strong>Interaction:</strong> Click on an enhancer rectangle to
                filter the arcs track and see only the links from that enhancer.
                The side panel will show the target genes sorted by score.
              </p>
              <p className="mt-2">
                <strong>Story:</strong> The APOE locus demonstrates how a single
                enhancer (potentially containing a variant) can link to multiple
                genes, illustrating the complexity of gene regulation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
