"use client";

import { GoslingWrapper } from "@shared/components/visualization/gosling-wrapper";
import { Download, RotateCcw, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// gosling.js currently has peer dep mismatches with React 19.
// We treat its types as an opaque boundary.
type GoslingRef = {
  api: {
    exportPng: (transparent: boolean) => Promise<void>;
    exportPdf: () => Promise<void>;
  };
};
type GoslingSpec = unknown;

import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Input } from "@shared/components/ui/input";

const BASE_URL =
  "https://minio-s3-favor-4ee4be.apps.shift.nerc.mghpcc.org/favor-hg38/lkp/browser/hg38/liver/e2g";

// Dataset definitions - individual cell lines (selectable)
const DATASETS = {
  hepatocytes: {
    label: "Hepatocytes",
    url: `${BASE_URL}/hepatocytes.bed.gz`,
    indexUrl: `${BASE_URL}/hepatocytes.bed.gz.tbi`,
  },
  kupffer: {
    label: "Kupffer cells",
    url: `${BASE_URL}/kupffer.bed.gz`,
    indexUrl: `${BASE_URL}/kupffer.bed.gz.tbi`,
  },
  lsec: {
    label: "LSEC",
    url: `${BASE_URL}/lsec.bed.gz`,
    indexUrl: `${BASE_URL}/lsec.bed.gz.tbi`,
  },
  b_cells: {
    label: "B cells",
    url: `${BASE_URL}/b_cells.bed.gz`,
    indexUrl: `${BASE_URL}/b_cells.bed.gz.tbi`,
  },
  cholangiocytes: {
    label: "Cholangiocytes",
    url: `${BASE_URL}/cholangiocytes.bed.gz`,
    indexUrl: `${BASE_URL}/cholangiocytes.bed.gz.tbi`,
  },
  mesenchymal: {
    label: "Mesenchymal",
    url: `${BASE_URL}/mesenchymal.bed.gz`,
    indexUrl: `${BASE_URL}/mesenchymal.bed.gz.tbi`,
  },
  "nk-t": {
    label: "NK-T cells",
    url: `${BASE_URL}/nk-t.bed.gz`,
    indexUrl: `${BASE_URL}/nk-t.bed.gz.tbi`,
  },
} as const;

type DatasetKey = keyof typeof DATASETS;

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
  const [selectedCellLines, setSelectedCellLines] = useState<DatasetKey[]>([
    "hepatocytes",
  ]);
  const [showEnhancerTrack, setShowEnhancerTrack] = useState(true);
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

  const toggleCellLine = (key: DatasetKey) => {
    setSelectedCellLines((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Build Gosling spec
  const buildSpec = useCallback((): GoslingSpec => {
    const { chromosome, start, end } = currentRegion;

    // Linking ID for synchronized zooming/panning across tracks
    const LINKING_ID = "e2g-browser-link";

    // Common data transform for filtering (only remove invalid entries)
    const commonDataTransform = [
      {
        type: "filter" as const,
        field: "gene_start",
        not: true,
        oneOf: [".", ""],
      },
    ];

    // Helper to create data config for a cell line
    const createDataConfig = (cellLine: DatasetKey) => ({
      type: "bed" as const,
      url: DATASETS[cellLine].url,
      indexUrl: DATASETS[cellLine].indexUrl,
      sampleLength: 5000,
      customFields: [
        "gene_tss",
        "gene",
        "score",
        "region_class",
        "gene_start",
        "gene_end",
      ],
    });

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
      color: { value: "#64748b" },
      tooltip: [
        { field: "name", type: "nominal" as const, alt: "Gene Name" },
        { field: "strand", type: "nominal" as const, alt: "Strand" },
        { field: "start", type: "genomic" as const, alt: "Gene Start" },
        { field: "end", type: "genomic" as const, alt: "Gene End" },
      ],
      width: 800,
      height: 80,
    };

    // Enhancer regions track (toggleable)
    const createEnhancerTrack = (cellLine: DatasetKey) => ({
      id: `enhancer-regions-${cellLine}`,
      title: `Enhancers - ${DATASETS[cellLine].label}`,
      data: createDataConfig(cellLine),
      dataTransform: commonDataTransform,
      mark: "rect" as const,
      x: {
        field: "chromStart",
        type: "genomic" as const,
        axis: "top" as const,
        linkingId: LINKING_ID,
      },
      xe: { field: "chromEnd", type: "genomic" as const },
      color: { value: "#64748b" },
      opacity: {
        field: "score",
        type: "quantitative" as const,
        domain: [0, 1.0],
        range: [0.3, 1.0],
      },
      tooltip: [
        {
          field: "chromStart",
          type: "genomic" as const,
          alt: "Enhancer Start",
        },
        { field: "chromEnd", type: "genomic" as const, alt: "Enhancer End" },
        { field: "gene", type: "nominal" as const, alt: "Target Gene" },
        { field: "gene_tss", type: "genomic" as const, alt: "Gene TSS" },
        {
          field: "region_class",
          type: "nominal" as const,
          alt: "Region Class",
        },
        { field: "score", type: "quantitative" as const, alt: "E2G Score" },
      ],
      width: 800,
      height: 40,
    });

    // E2G Links overlay track for a cell line
    const createE2GOverlayTrack = (cellLine: DatasetKey) => ({
      id: `e2g-overlay-${cellLine}`,
      title: `${DATASETS[cellLine].label}`,
      alignment: "overlay" as const,
      data: createDataConfig(cellLine),
      dataTransform: commonDataTransform,
      y: {
        field: "score",
        type: "quantitative" as const,
        domain: [0, 1.0],
        axis: "right" as const,
      },
      tracks: [
        // Arc links from enhancer to gene TSS
        {
          mark: "withinLink" as const,
          x: {
            field: "chromStart",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          xe: { field: "chromEnd", type: "genomic" as const },
          x1e: { field: "gene_tss", type: "genomic" as const },
          x1: {
            field: "gene_tss",
            type: "genomic" as const,
          },
          stroke: { value: "#475569" },
          strokeWidth: { value: 1.5 },
          opacity: {
            field: "score",
            type: "quantitative" as const,
            domain: [0, 1.0],
            range: [0.2, 0.9],
          },
        },
        // Small rect marker at enhancer region
        {
          mark: "rect" as const,
          x: {
            field: "chromStart",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          y: { value: 0 },
          ye: { value: 10 },
          color: { value: "#64748b" },
          opacity: { value: 0.8 },
          size: { value: 6 },
        },
        // Triangle at gene TSS
        {
          mark: "triangleBottom" as const,
          x: {
            field: "gene_tss",
            type: "genomic" as const,
            linkingId: LINKING_ID,
          },
          color: { value: "#334155" },
          size: { value: 8 },
          opacity: { value: 0.9 },
        },
      ],
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
      ],
      width: 800,
      height: 70,
    });

    // Build tracks array based on selections
    const tracks: unknown[] = [];

    // Add enhancer tracks if enabled
    if (showEnhancerTrack) {
      for (const cellLine of selectedCellLines) {
        tracks.push(createEnhancerTrack(cellLine));
      }
    }

    // Add E2G overlay tracks for each selected cell line
    for (const cellLine of selectedCellLines) {
      tracks.push(createE2GOverlayTrack(cellLine));
    }

    // Add gene track at the bottom
    tracks.push(geneTrack);

    // Build subtitle
    const cellLineLabels = selectedCellLines
      .map((k) => DATASETS[k].label)
      .join(", ");

    return {
      title: "Liver E2G Browser",
      subtitle: `${cellLineLabels} | ${formatRegion(chromosome, start, end)}`,
      assembly: "hg38",
      xDomain: { chromosome, interval: [start, end] },
      centerRadius: 0.5,
      views: [
        {
          linkingId: LINKING_ID,
          alignment: "stack" as const,
          tracks,
        },
      ],
    } as GoslingSpec;
  }, [selectedCellLines, showEnhancerTrack, currentRegion]);

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
            <div className="flex flex-wrap items-start gap-6">
              {/* Cell line selector */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Cell Lines</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                        selectedCellLines.includes(key)
                          ? "border-primary/50 bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={selectedCellLines.includes(key)}
                        onCheckedChange={() => toggleCellLine(key)}
                        className="h-3 w-3"
                      />
                      {DATASETS[key].label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Enhancer track toggle */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Options</div>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  <Checkbox
                    checked={showEnhancerTrack}
                    onCheckedChange={(checked) => setShowEnhancerTrack(checked === true)}
                    className="h-3 w-3"
                  />
                  Show Enhancer Track
                </label>
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
                <GoslingWrapper goslingRef={goslingRef} spec={spec} />
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 rounded bg-slate-500" />
                    <span className="text-xs">Enhancer region</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-slate-700" />
                    <span className="text-xs">Gene TSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[2px] w-6 bg-slate-600 rounded" />
                    <span className="text-xs">E2G link (arc)</span>
                  </div>
                </div>
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
                                <span className="text-xs text-slate-500">
                                  ({g.cellType})
                                </span>
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
