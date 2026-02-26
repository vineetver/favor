"use client";

import { Button } from "@shared/components/ui/button";
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
  SlidersHorizontal,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import type { ControlsDrawerProps } from "../types/props";
import type { EntityType } from "../types";
import { ENTITY_TYPES } from "../types/entity";
import { NODE_TYPE_COLORS } from "../config/styling";
import { buildEdgeTypeStatsMap, resolveFilterFields } from "../utils/schema-fields";
import type { EdgeType } from "../types/edge";
import { EDGE_TYPE_CONFIG } from "../types/edge";

// =============================================================================
// Template Icon Map
// =============================================================================

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-4 h-4" />,
  "dna": <Dna className="w-4 h-4" />,
  "pill": <Pill className="w-4 h-4" />,
  "microscope": <Microscope className="w-4 h-4" />,
  "activity": <Activity className="w-4 h-4" />,
  "bar-chart": <BarChart3 className="w-4 h-4" />,
  "network": <Network className="w-4 h-4" />,
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
// Per-Edge-Type Filter Controls
// =============================================================================

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID");
}

interface EdgeTypeFilterSectionProps {
  edgeType: EdgeType;
  filterFields: string[];
  edgeTypeCounts?: Record<EdgeType, number>;
}

function EdgeTypeFilterSection({ edgeType, filterFields, edgeTypeCounts }: EdgeTypeFilterSectionProps) {
  const config = EDGE_TYPE_CONFIG[edgeType];
  const count = edgeTypeCounts?.[edgeType] ?? 0;

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: config?.color ?? "#94a3b8" }}
        />
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {config?.label ?? edgeType}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
          {count}
        </span>
      </div>
      <div className="pl-4 space-y-2">
        {filterFields.map((field) => (
          <div key={field} className="space-y-1">
            <div className="text-[11px] text-muted-foreground">{fieldLabel(field)}</div>
            <Slider
              defaultValue={[0]}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function ControlsDrawerInner({
  open,
  onOpenChange,
  templates,
  activeTemplate,
  onTemplateChange,
  onReset,
  edgeTypeCounts,
  nodeTypeCounts,
  isExpanding,
  schema,
}: ControlsDrawerProps) {
  if (!open) {
    return null;
  }

  const totalEdges = Object.values(edgeTypeCounts ?? {}).reduce((a, b) => a + b, 0);
  const totalNodes = Object.values(nodeTypeCounts ?? {}).reduce((a, b) => a + b, 0);

  // Build schema map for filter field lookup
  const schemaMap = useMemo(() => buildEdgeTypeStatsMap(schema), [schema]);

  // Compute which edge types have filter fields
  const edgeTypesWithFilters = useMemo(() => {
    if (schemaMap.size === 0) return [];
    const activeEdgeTypes = Object.keys(edgeTypeCounts ?? {}) as EdgeType[];
    return activeEdgeTypes
      .map((et) => ({
        edgeType: et,
        filterFields: resolveFilterFields(et, schemaMap),
      }))
      .filter((item) => item.filterFields.length > 0);
  }, [schemaMap, edgeTypeCounts]);

  return (
    <div className="w-72 border-r border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
        <span className="text-sm font-semibold text-foreground">Explorer</span>
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

        {/* Templates */}
        <CollapsibleSection title="Templates">
          <div className="space-y-2">
            {templates.map((template) => {
              const isActive = activeTemplate === template.id;
              return (
                <button
                  key={template.id}
                  className={
                    isActive
                      ? "w-full flex items-start gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-left"
                      : "w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-background text-left hover:border-primary/20 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  }
                  onClick={() => onTemplateChange(template.id)}
                  disabled={isExpanding || isActive}
                >
                  <div
                    className="mt-0.5 p-1.5 rounded-md"
                    style={{ backgroundColor: `${template.color}15`, color: template.color }}
                  >
                    {TEMPLATE_ICONS[template.icon] ?? <Network className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{template.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Per-Edge-Type Filters */}
        {edgeTypesWithFilters.length > 0 && (
          <CollapsibleSection
            title="Edge Filters"
            defaultOpen={false}
            badge={
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            }
          >
            <div className="space-y-4">
              {edgeTypesWithFilters.map(({ edgeType, filterFields }) => (
                <EdgeTypeFilterSection
                  key={edgeType}
                  edgeType={edgeType}
                  filterFields={filterFields}
                  edgeTypeCounts={edgeTypeCounts}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

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
      </div>
    </div>
  );
}

export const ControlsDrawer = memo(ControlsDrawerInner);
