"use client";

import { Button } from "@shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Label } from "@shared/components/ui/label";
import { Slider } from "@shared/components/ui/slider";
import { Checkbox } from "@shared/components/ui/checkbox";
import { cn } from "@infra/utils";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  List,
  Loader2,
  Network,
  PanelLeft,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  SplitSquareVertical,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { EXPLORER_LAYOUT_OPTIONS } from "../config/layout";
import { EDGE_TYPE_CONFIG } from "../types/edge";
import { displayEntityType } from "../utils/display-names";
import { isBranchStep } from "../config/lenses";
import type { ExplorerLayoutType } from "../config/layout";
import type { ViewMode, TemplateId } from "../types/state";
import type { GraphFilters } from "../types/filters";
import type { GraphSchema } from "../types/schema";
import type { EdgeType } from "../types/edge";
import type { ExplorerNode, ExplorerEdge } from "../types/node";
import type { SeedEntity, ExplorerConfig, ExplorerTemplate } from "../config/explorer-config";
import type { QueryStep } from "../config/lenses";

// =============================================================================
// Props
// =============================================================================

export interface ExplorerToolbarProps {
  seed: SeedEntity;
  config: ExplorerConfig;
  schema: GraphSchema | null | undefined;
  activeTemplate: TemplateId;
  onTemplateChange: (id: TemplateId, opts?: { extraSteps?: QueryStep[]; stepLimit?: number }) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layout: ExplorerLayoutType;
  onLayoutChange: (layout: ExplorerLayoutType) => void;
  isExpanding: boolean;
  leftDrawerOpen: boolean;
  onToggleLeftDrawer: () => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  nodes: Map<string, ExplorerNode> | undefined;
  edges: Map<string, ExplorerEdge> | undefined;
  onReset: () => void;
}

// =============================================================================
// View Toggle
// =============================================================================

function ViewToggle({ viewMode, onViewModeChange }: { viewMode: ViewMode; onViewModeChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2", viewMode === "graph" && "bg-background shadow-sm")}
        onClick={() => onViewModeChange("graph")}
        title="Graph View"
      >
        <Network className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2", viewMode === "list" && "bg-background shadow-sm")}
        onClick={() => onViewModeChange("list")}
        title="List View"
      >
        <List className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2", viewMode === "split" && "bg-background shadow-sm")}
        onClick={() => onViewModeChange("split")}
        title="Split View"
      >
        <SplitSquareVertical className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// =============================================================================
// Export Helpers
// =============================================================================

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function ExportDropdown({
  nodes,
  edges,
  seedLabel,
}: {
  nodes: Map<string, ExplorerNode> | undefined;
  edges: Map<string, ExplorerEdge> | undefined;
  seedLabel: string;
}) {
  const handleExportNodesCsv = useCallback(() => {
    if (!nodes) return;
    const header = ["id", "type", "label", "subtitle", "is_seed", "depth"];
    const rows = Array.from(nodes.values()).map((n) => [
      escapeCsvField(n.id),
      escapeCsvField(n.type),
      escapeCsvField(n.label),
      escapeCsvField(n.subtitle ?? ""),
      String(n.isSeed),
      String(n.depth),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadFile(`${seedLabel}_nodes.csv`, csv, "text/csv");
  }, [nodes, seedLabel]);

  const handleExportEdgesCsv = useCallback(() => {
    if (!edges) return;
    const header = ["type", "source_id", "target_id", "num_sources", "num_experiments"];
    const rows = Array.from(edges.values()).map((e) => [
      escapeCsvField(e.type),
      escapeCsvField(e.sourceId),
      escapeCsvField(e.targetId),
      String(e.numSources ?? ""),
      String(e.numExperiments ?? ""),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadFile(`${seedLabel}_edges.csv`, csv, "text/csv");
  }, [edges, seedLabel]);

  const handleExportJson = useCallback(() => {
    if (!nodes || !edges) return;
    const data = {
      nodes: Array.from(nodes.values()).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        subtitle: n.subtitle,
        isSeed: n.isSeed,
        depth: n.depth,
      })),
      edges: Array.from(edges.values()).map((e) => ({
        type: e.type,
        sourceId: e.sourceId,
        targetId: e.targetId,
        numSources: e.numSources,
        numExperiments: e.numExperiments,
        fields: e.fields,
      })),
    };
    downloadFile(`${seedLabel}_subgraph.json`, JSON.stringify(data, null, 2), "application/json");
  }, [nodes, edges, seedLabel]);

  const nodeCount = nodes?.size ?? 0;
  const edgeCount = edges?.size ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-muted-foreground">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleExportNodesCsv} disabled={nodeCount === 0}>
          Nodes as CSV ({nodeCount})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportEdgesCsv} disabled={edgeCount === 0}>
          Edges as CSV ({edgeCount})
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJson} disabled={nodeCount === 0}>
          Subgraph as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Add Hop Popover
// =============================================================================

interface AddHopPopoverProps {
  config: ExplorerConfig;
  extraHops: QueryStep[];
  templateStepCount: number;
  onAddHop: (hop: QueryStep) => void;
  onClearHops: () => void;
  disabled: boolean;
}

function AddHopPopover({ config, extraHops, templateStepCount, onAddHop, onClearHops, disabled }: AddHopPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedEdgeTypes, setSelectedEdgeTypes] = useState<Set<EdgeType>>(new Set());
  const [direction, setDirection] = useState<"in" | "out" | "both">("both");
  const [limit, setLimit] = useState(20);

  // Collect all available edge types from config groups
  const availableEdgeTypes = useMemo(() => {
    const types: EdgeType[] = [];
    for (const group of config.edgeTypeGroups) {
      for (const et of group.types) {
        if (EDGE_TYPE_CONFIG[et]) types.push(et);
      }
    }
    return types;
  }, [config.edgeTypeGroups]);

  const handleApply = useCallback(() => {
    if (selectedEdgeTypes.size === 0) return;
    onAddHop({
      edgeTypes: Array.from(selectedEdgeTypes),
      direction,
      limit,
    });
    setSelectedEdgeTypes(new Set());
    setDirection("both");
    setLimit(20);
    setOpen(false);
  }, [selectedEdgeTypes, direction, limit, onAddHop]);

  // API max = 5 steps total; respect remaining capacity
  const maxExtraHops = Math.max(0, 5 - templateStepCount);
  const canAddMore = extraHops.length < maxExtraHops;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
            disabled={disabled || !canAddMore}
          >
            <Plus className="w-3 h-3" />
            Add hop
            {extraHops.length > 0 && (
              <span className="ml-0.5 bg-primary/10 text-primary text-[10px] font-medium px-1 rounded">
                {extraHops.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-foreground mb-1.5 block">Edge Types</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {availableEdgeTypes.slice(0, 30).map((et) => {
                  const cfg = EDGE_TYPE_CONFIG[et];
                  return (
                    <label key={et} className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <Checkbox
                        checked={selectedEdgeTypes.has(et)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedEdgeTypes);
                          if (checked) next.add(et);
                          else next.delete(et);
                          setSelectedEdgeTypes(next);
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="text-xs text-foreground truncate">{cfg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground mb-1.5 block">Direction</Label>
              <div className="flex items-center gap-1">
                {(["out", "in", "both"] as const).map((d) => (
                  <Button
                    key={d}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs flex-1",
                      direction === d && "bg-background shadow-sm"
                    )}
                    onClick={() => setDirection(d)}
                  >
                    {d === "out" ? "Outgoing" : d === "in" ? "Incoming" : "Both"}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium text-foreground">Limit</Label>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{limit}</span>
              </div>
              <Slider
                value={[limit]}
                onValueChange={([v]) => setLimit(v)}
                min={5}
                max={100}
                step={5}
              />
            </div>

            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleApply}
              disabled={selectedEdgeTypes.size === 0}
            >
              Apply Hop
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {extraHops.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 text-xs text-muted-foreground"
          onClick={onClearHops}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Score Threshold Filter
// =============================================================================

interface ScoreFilterProps {
  schema: GraphSchema | null | undefined;
  activeTemplate: ExplorerTemplate;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  disabled: boolean;
}

function ScoreFilter({ schema, activeTemplate, filters, onFiltersChange, disabled }: ScoreFilterProps) {
  const scoreThreshold = filters.scoreThreshold;
  // Determine the common score field from the template's edge types
  const scoreField = useMemo(() => {
    if (!schema) return null;

    // Collect all edge types in the template
    const templateEdgeTypes = new Set<string>();
    for (const step of activeTemplate.steps) {
      if (isBranchStep(step)) {
        for (const sub of step.branch) {
          for (const et of sub.edgeTypes) templateEdgeTypes.add(et);
        }
      } else {
        for (const et of step.edgeTypes) templateEdgeTypes.add(et);
      }
    }

    // Look up defaultScoreField for each, find common one
    const scoreFields = new Set<string>();
    for (const ets of schema.edgeTypes) {
      if (templateEdgeTypes.has(ets.edgeType) && ets.defaultScoreField) {
        scoreFields.add(ets.defaultScoreField);
      }
    }

    // Also check the template's rankBy field as fallback
    if (scoreFields.size === 0 && activeTemplate.rankBy) {
      return activeTemplate.rankBy.field;
    }

    // If there's exactly one common score field, use it
    if (scoreFields.size === 1) return Array.from(scoreFields)[0];

    // Fallback to template rankBy
    if (activeTemplate.rankBy) return activeTemplate.rankBy.field;

    return null;
  }, [schema, activeTemplate]);

  if (!scoreField) return null;

  const displayName = scoreField.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const hasThreshold = scoreThreshold !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1 text-xs",
            hasThreshold && "border-primary/30 bg-primary/5 text-foreground"
          )}
          disabled={disabled}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {displayName}
          {hasThreshold && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1 rounded">
              {"\u2265"} {scoreThreshold.toFixed(2)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-foreground">{displayName} Threshold</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Minimum score to include edges
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">0.0</span>
              <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded">
                {(scoreThreshold ?? 0).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">1.0</span>
            </div>
            <Slider
              value={[scoreThreshold ?? 0]}
              onValueChange={([v]) => onFiltersChange({
                ...filters,
                scoreThreshold: v > 0 ? v : null,
                scoreField: v > 0 ? scoreField : null,
              })}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
          {hasThreshold && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onFiltersChange({ ...filters, scoreThreshold: null, scoreField: null })}
            >
              Clear threshold
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Min Sources Filter
// =============================================================================

function MinSourcesFilter({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  if (value === 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs" disabled={disabled}>
            Min sources
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Minimum Evidence Sources</Label>
            <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "Any" : `${"\u2265"} ${n}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2 gap-1 text-xs border-primary/30 bg-primary/5"
      onClick={() => onChange(0)}
      disabled={disabled}
    >
      Sources {"\u2265"} {value}
      <span className="text-muted-foreground ml-0.5">&times;</span>
    </Button>
  );
}

// =============================================================================
// Main Toolbar
// =============================================================================

function ExplorerToolbarInner({
  seed,
  config,
  schema,
  activeTemplate,
  onTemplateChange,
  viewMode,
  onViewModeChange,
  layout,
  onLayoutChange,
  isExpanding,
  leftDrawerOpen,
  onToggleLeftDrawer,
  filters,
  onFiltersChange,
  nodes,
  edges,
  onReset,
}: ExplorerToolbarProps) {
  const [extraHops, setExtraHops] = useState<QueryStep[]>([]);
  const [stepLimit, setStepLimit] = useState<number>(10);

  const currentTemplate = useMemo(
    () => config.templates.find((t) => t.id === activeTemplate),
    [config.templates, activeTemplate]
  );

  // Helper to build opts from current toolbar state
  const buildOpts = useCallback(
    (overrides?: { hops?: QueryStep[]; limit?: number }) => {
      const hops = overrides?.hops ?? (extraHops.length > 0 ? extraHops : undefined);
      const limit = overrides?.limit ?? stepLimit;
      return { extraSteps: hops, stepLimit: limit };
    },
    [extraHops, stepLimit]
  );

  const handleAddHop = useCallback(
    (hop: QueryStep) => {
      const newHops = [...extraHops, hop];
      setExtraHops(newHops);
      onTemplateChange(activeTemplate, buildOpts({ hops: newHops }));
    },
    [extraHops, activeTemplate, onTemplateChange, buildOpts]
  );

  const handleClearHops = useCallback(() => {
    setExtraHops([]);
    onTemplateChange(activeTemplate, buildOpts({ hops: undefined }));
  }, [activeTemplate, onTemplateChange, buildOpts]);

  const handleStepLimitChange = useCallback(
    (value: number) => {
      setStepLimit(value);
      onTemplateChange(activeTemplate, buildOpts({ limit: value }));
    },
    [activeTemplate, onTemplateChange, buildOpts]
  );

  const handleMinSourcesChange = useCallback(
    (value: number) => {
      onFiltersChange({ ...filters, minSources: value });
    },
    [filters, onFiltersChange]
  );

  const handleReset = useCallback(() => {
    setExtraHops([]);
    setStepLimit(10);
    onFiltersChange({ ...filters, scoreThreshold: null, scoreField: null });
    onReset();
  }, [onReset, onFiltersChange, filters]);

  // Gene overview path
  const overviewPath = `/hg38/gene/${seed.id}/gene-level-annotation`;

  return (
    <div className="flex flex-col border-b border-border">
      {/* Row 1 - Context bar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0"
            onClick={onToggleLeftDrawer}
          >
            {leftDrawerOpen ? <PanelLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>

          <a
            href={overviewPath}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Overview</span>
          </a>

          <span className="text-muted-foreground/40">/</span>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-muted-foreground">{displayEntityType(seed.type)}:</span>
            <span className="text-sm font-semibold text-foreground truncate">{seed.label}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">Network</span>
          </div>

          {isExpanding && (
            <div className="flex items-center gap-1.5 ml-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ExportDropdown nodes={nodes} edges={edges} seedLabel={seed.label} />

          <Select value={layout} onValueChange={(v) => onLayoutChange(v as ExplorerLayoutType)}>
            <SelectTrigger className="h-7 w-[120px] text-xs border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPLORER_LAYOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
      </div>

      {/* Row 2 - Query toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background">
        {/* Step Limit */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground flex-shrink-0">Limit:</span>
          <Select value={String(stepLimit)} onValueChange={(v) => handleStepLimitChange(Number(v))} disabled={isExpanding}>
            <SelectTrigger className="h-7 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add Hop */}
        <AddHopPopover
          config={config}
          extraHops={extraHops}
          templateStepCount={currentTemplate?.steps.length ?? 0}
          onAddHop={handleAddHop}
          onClearHops={handleClearHops}
          disabled={isExpanding}
        />

        {/* Divider */}
        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* Score Threshold */}
        {currentTemplate && (
          <ScoreFilter
            schema={schema}
            activeTemplate={currentTemplate}
            filters={filters}
            onFiltersChange={onFiltersChange}
            disabled={isExpanding}
          />
        )}

        {/* Min Sources */}
        <MinSourcesFilter
          value={filters.minSources}
          onChange={handleMinSourcesChange}
          disabled={isExpanding}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-muted-foreground"
          onClick={handleReset}
          disabled={isExpanding}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export const ExplorerToolbar = memo(ExplorerToolbarInner);
