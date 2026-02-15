"use client";

import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Label } from "@shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Slider } from "@shared/components/ui/slider";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Dna,
  HeartPulse,
  Loader2,
  Microscope,
  Network,
  Pill,
  RefreshCw,
  Settings,
} from "lucide-react";
import { memo, useState, useCallback } from "react";
import type { ControlsDrawerProps } from "../types/props";
import type { EdgeType, EntityType } from "../types";
import { EDGE_TYPE_CONFIG } from "../types/edge";
import { ENTITY_TYPES } from "../types/entity";
import { GRAPH_LENSES } from "../config/lenses";
import { NODE_TYPE_COLORS } from "../config/styling";

// =============================================================================
// Lens Icon Map
// =============================================================================

const LENS_ICONS: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-4 h-4" />,
  "dna": <Dna className="w-4 h-4" />,
  "pill": <Pill className="w-4 h-4" />,
  "microscope": <Microscope className="w-4 h-4" />,
  "activity": <Activity className="w-4 h-4" />,
  "bar-chart": <BarChart3 className="w-4 h-4" />,
  "network": <Network className="w-4 h-4" />,
};

// =============================================================================
// Edge Type Groups
// =============================================================================

const EDGE_TYPE_GROUPS: Array<{ label: string; types: EdgeType[] }> = [
  {
    label: "Gene \u2192 Disease",
    types: [
      "ASSOCIATED_WITH_DISEASE", "CURATED_FOR", "CAUSES", "CIVIC_EVIDENCED_FOR",
      "PGX_ASSOCIATED", "THERAPEUTIC_TARGET_IN", "SCORED_FOR_DISEASE",
      "BIOMARKER_FOR", "INHERITED_CAUSE_OF", "ASSERTED_FOR_DISEASE",
    ],
  },
  {
    label: "Gene \u2192 Drug",
    types: ["HAS_PGX_INTERACTION", "HAS_CLINICAL_DRUG_EVIDENCE", "ASSERTED_FOR_DRUG"],
  },
  {
    label: "Gene \u2192 Gene",
    types: ["INTERACTS_WITH", "INTERACTS_IN_PATHWAY", "REGULATES", "FUNCTIONALLY_RELATED"],
  },
  {
    label: "Gene \u2192 Other",
    types: [
      "PARTICIPATES_IN", "MANIFESTS_AS", "MOUSE_MANIFESTS_AS",
      "SCORED_FOR_TRAIT", "HAS_GWAS_VARIANT", "ANNOTATED_WITH",
      "ASSOCIATED_WITH_SIDE_EFFECT",
    ],
  },
  {
    label: "Drug",
    types: ["TARGETS", "TARGETS_IN_CONTEXT", "INDICATED_FOR", "HAS_SIDE_EFFECT", "HAS_ADVERSE_REACTION"],
  },
  {
    label: "Variant",
    types: [
      "GWAS_ASSOCIATED_WITH", "AFFECTS_RESPONSE_TO", "PGX_RESPONSE_FOR",
      "STUDIED_FOR_DRUG_RESPONSE", "FUNCTIONALLY_ASSAYED_FOR",
      "PGX_CLINICAL_RESPONSE", "PGX_DISEASE_ASSOCIATED", "CLINVAR_ASSOCIATED",
      "REPORTED_IN", "PREDICTED_TO_AFFECT", "POSITIONALLY_LINKED_TO",
      "ENHANCER_LINKED_TO", "PREDICTED_REGULATORY_TARGET",
      "MISSENSE_PATHOGENIC_FOR", "SOMATICALLY_MUTATED_IN",
      "CLINVAR_ANNOTATED_IN", "LINKED_TO_SIDE_EFFECT", "OVERLAPS",
    ],
  },
  {
    label: "Other",
    types: [
      "PRESENTS_WITH", "MAPS_TO", "TRAIT_PRESENTS_WITH",
      "INVESTIGATES", "SE_MAPS_TO",
      "EXPERIMENTALLY_REGULATES", "COMPUTATIONALLY_REGULATES",
      "CONTAINS_METABOLITE", "METABOLITE_IS_A",
      "SUBCLASS_OF", "ANCESTOR_OF", "PHENOTYPE_SUBCLASS_OF",
      "PHENOTYPE_ANCESTOR_OF", "PART_OF", "PATHWAY_ANCESTOR_OF",
      "EFO_SUBCLASS_OF", "EFO_ANCESTOR_OF", "GO_SUBCLASS_OF", "GO_ANCESTOR_OF",
    ],
  },
];

// =============================================================================
// Collapsible Section Component
// =============================================================================

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, badge, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// =============================================================================
// Node Type Legend Component
// =============================================================================

interface NodeTypeLegendProps {
  counts?: Record<EntityType, number>;
}

function NodeTypeLegend({ counts }: NodeTypeLegendProps) {
  const typesToShow = counts
    ? ENTITY_TYPES.filter((type) => (counts[type] ?? 0) > 0)
    : ENTITY_TYPES.slice(0, 7);

  return (
    <div className="space-y-1.5">
      {typesToShow.map((type) => {
        const colors = NODE_TYPE_COLORS[type];
        const count = counts?.[type] ?? 0;

        return (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
              }}
            />
            <span className="flex-1 text-sm text-foreground">{type}</span>
            {count > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Edge Type Toggle Component
// =============================================================================

interface EdgeTypeToggleProps {
  edgeType: EdgeType;
  enabled: boolean;
  count?: number;
  onChange: (enabled: boolean) => void;
}

function EdgeTypeToggle({ edgeType, enabled, count, onChange }: EdgeTypeToggleProps) {
  const config = EDGE_TYPE_CONFIG[edgeType];
  if (!config) return null;

  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span className="flex-1 text-sm text-foreground group-hover:text-foreground">
        {config.label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </label>
  );
}

// =============================================================================
// Slider Control Component
// =============================================================================

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, value, min, max, step = 1, onChange }: SliderControlProps) {
  const handleChange = useCallback(
    (values: number[]) => onChange(values[0]),
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function ControlsDrawerInner({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  layout,
  onLayoutChange,
  activeLens,
  onLensChange,
  onReset,
  edgeTypeCounts,
  nodeTypeCounts,
  isExpanding,
}: ControlsDrawerProps) {
  if (!open) {
    return null;
  }

  const handleEdgeTypeToggle = (edgeType: EdgeType, enabled: boolean) => {
    const newEdgeTypes = new Set(filters.edgeTypes);
    if (enabled) {
      newEdgeTypes.add(edgeType);
    } else {
      newEdgeTypes.delete(edgeType);
    }
    onFiltersChange({ ...filters, edgeTypes: newEdgeTypes });
  };

  const handleSelectAllEdgeTypes = () => {
    onFiltersChange({
      ...filters,
      edgeTypes: new Set(Object.keys(EDGE_TYPE_CONFIG) as EdgeType[]),
    });
  };

  const handleClearEdgeTypes = () => {
    onFiltersChange({
      ...filters,
      edgeTypes: new Set<EdgeType>(),
    });
  };

  const totalEdges = Object.values(edgeTypeCounts ?? {}).reduce((a, b) => a + b, 0);
  const totalNodes = Object.values(nodeTypeCounts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="w-72 border-r border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Controls</span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanding && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onReset}
            disabled={isExpanding}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Graph Stats */}
        {(totalNodes > 0 || totalEdges > 0) && (
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalNodes}</div>
                <div className="text-xs text-muted-foreground">Nodes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalEdges}</div>
                <div className="text-xs text-muted-foreground">Edges</div>
              </div>
            </div>
          </div>
        )}

        {/* Our Lenses */}
        <CollapsibleSection title="Our Lenses">
          <div className="space-y-2">
            {GRAPH_LENSES.map((lens) => {
              const isActive = activeLens === lens.id;
              return (
                <button
                  key={lens.id}
                  className={
                    isActive
                      ? "w-full flex items-start gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-left"
                      : "w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-background text-left hover:border-primary/20 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  }
                  onClick={() => onLensChange(lens.id)}
                  disabled={isExpanding || isActive}
                >
                  <div
                    className="mt-0.5 p-1.5 rounded-md"
                    style={{ backgroundColor: `${lens.color}15`, color: lens.color }}
                  >
                    {LENS_ICONS[lens.icon] ?? <Network className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{lens.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {lens.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Node Legend */}
        <CollapsibleSection
          title="Node Types"
          badge={
            totalNodes > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {totalNodes}
              </span>
            )
          }
        >
          <NodeTypeLegend counts={nodeTypeCounts} />
        </CollapsibleSection>

        {/* Edge Type Groups */}
        {EDGE_TYPE_GROUPS.map((group) => (
          <CollapsibleSection key={group.label} title={group.label} defaultOpen={false}>
            <div className="space-y-0.5">
              {group.types
                .filter((et) => EDGE_TYPE_CONFIG[et])
                .map((edgeType) => (
                  <EdgeTypeToggle
                    key={edgeType}
                    edgeType={edgeType}
                    enabled={filters.edgeTypes.has(edgeType)}
                    count={edgeTypeCounts?.[edgeType]}
                    onChange={(enabled) => handleEdgeTypeToggle(edgeType, enabled)}
                  />
                ))}
            </div>
          </CollapsibleSection>
        ))}

        {/* Select All / Clear All */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleSelectAllEdgeTypes}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleClearEdgeTypes}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <CollapsibleSection title="Filters" defaultOpen={false}>
          <div className="space-y-4">
            <SliderControl
              label="Max Depth"
              value={filters.maxDepth}
              min={1}
              max={5}
              onChange={(value) => onFiltersChange({ ...filters, maxDepth: value })}
            />
            <SliderControl
              label="Min Evidence Sources"
              value={filters.minSources}
              min={0}
              max={5}
              onChange={(value) => onFiltersChange({ ...filters, minSources: value })}
            />
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <Checkbox
                checked={filters.showOrphans}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, showOrphans: checked === true })}
              />
              <span className="text-sm text-muted-foreground">Show disconnected nodes</span>
            </label>
          </div>
        </CollapsibleSection>

        {/* Layout Settings */}
        <CollapsibleSection title="Layout" defaultOpen={false}>
          <div className="space-y-2">
            <Select value={layout} onValueChange={onLayoutChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cose-bilkent">Force-Directed</SelectItem>
                <SelectItem value="dagre">Hierarchical (Top-Down)</SelectItem>
                <SelectItem value="concentric">Concentric</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

export const ControlsDrawer = memo(ControlsDrawerInner);
