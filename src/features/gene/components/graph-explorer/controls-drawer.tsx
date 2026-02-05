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
import { cn } from "@infra/utils";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  HeartPulse,
  Loader2,
  Pill,
  RefreshCw,
  Route,
  Settings,
  Target,
} from "lucide-react";
import { memo, useState, useCallback } from "react";
import {
  type ControlsDrawerProps,
  type EdgeType,
  type EntityType,
  type TraversalRecipe,
  EDGE_TYPE_CONFIG,
  TRAVERSAL_RECIPES,
  NODE_TYPE_COLORS,
} from "./types";

// =============================================================================
// Recipe Icon Map
// =============================================================================

const RECIPE_ICONS: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-4 h-4" />,
  "pill": <Pill className="w-4 h-4" />,
  "route": <Route className="w-4 h-4" />,
  "activity": <Activity className="w-4 h-4" />,
  "target": <Target className="w-4 h-4" />,
  "clipboard-list": <ClipboardList className="w-4 h-4" />,
};

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
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted"
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
// Recipe Button Component
// =============================================================================

interface RecipeButtonProps {
  recipe: TraversalRecipe;
  onClick: () => void;
  disabled?: boolean;
}

function RecipeButton({ recipe, onClick, disabled }: RecipeButtonProps) {
  return (
    <button
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
        disabled
          ? "bg-muted border-border opacity-50 cursor-not-allowed"
          : "bg-background border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div
        className="mt-0.5 p-1.5 rounded-md"
        style={{ backgroundColor: `${recipe.color}15`, color: recipe.color }}
      >
        {RECIPE_ICONS[recipe.icon] ?? <Route className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{recipe.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{recipe.description}</div>
      </div>
    </button>
  );
}

// =============================================================================
// Node Type Legend Component
// =============================================================================

interface NodeTypeLegendProps {
  counts?: Record<EntityType, number>;
}

function NodeTypeLegend({ counts }: NodeTypeLegendProps) {
  const types: EntityType[] = ["Gene", "Disease", "Drug", "Pathway", "Phenotype", "Variant", "Trait"];

  return (
    <div className="space-y-1.5">
      {types.map((type) => {
        const colors = NODE_TYPE_COLORS[type];
        const count = counts?.[type] ?? 0;
        if (count === 0 && !counts) return null;

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
  onApplyRecipe,
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

  // Group edge types by category
  const geneEdgeTypes: EdgeType[] = ["IMPLICATED_IN", "CAUSES", "CURATED_FOR", "PARTICIPATES_IN", "MANIFESTS_AS", "ANNOTATED_IN"];
  const drugEdgeTypes: EdgeType[] = ["TARGETS", "KNOWN_TO_TARGET", "INTERACTS_WITH_GENE", "APPROVED_FOR", "INDICATED_FOR", "INVESTIGATED_FOR"];
  const otherEdgeTypes: EdgeType[] = ["ASSOCIATED_WITH", "PRESENTS_WITH", "MAPS_TO", "PART_OF"];

  // Count total edges
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
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
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
          <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-purple-50 border-b border-border">
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

        {/* Quick Recipes */}
        <CollapsibleSection title="Explore Relationships">
          <div className="space-y-2">
            {TRAVERSAL_RECIPES.map((recipe) => (
              <RecipeButton
                key={recipe.id}
                recipe={recipe}
                onClick={() => onApplyRecipe(recipe)}
                disabled={isExpanding}
              />
            ))}
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

        {/* Edge Types - Gene Relationships */}
        <CollapsibleSection title="Gene Relationships" defaultOpen={false}>
          <div className="space-y-0.5">
            {geneEdgeTypes
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

        {/* Edge Types - Drug Relationships */}
        <CollapsibleSection title="Drug Relationships" defaultOpen={false}>
          <div className="space-y-0.5">
            {drugEdgeTypes
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

        {/* Edge Types - Other */}
        <CollapsibleSection title="Other Relationships" defaultOpen={false}>
          <div className="space-y-0.5">
            {otherEdgeTypes
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
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
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
        </CollapsibleSection>

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
