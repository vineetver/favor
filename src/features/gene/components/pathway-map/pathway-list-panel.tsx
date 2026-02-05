"use client";

import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Input } from "@shared/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink as ExternalLinkIcon,
  Search,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategoryColor,
  groupPathwaysByCategory,
  type PathwayCategory,
  type PathwayNode,
} from "./types";

// =============================================================================
// Props
// =============================================================================

interface PathwayListPanelProps {
  pathways: PathwayNode[];
  selectedPathwayId: string | null;
  onPathwayClick: (pathway: PathwayNode) => void;
}

// =============================================================================
// Category Accordion
// =============================================================================

interface CategoryAccordionProps {
  category: PathwayCategory;
  isExpanded: boolean;
  onToggle: () => void;
  selectedPathwayId: string | null;
  onPathwayClick: (pathway: PathwayNode) => void;
}

const CategoryAccordion = memo(function CategoryAccordion({
  category,
  isExpanded,
  onToggle,
  selectedPathwayId,
  onPathwayClick,
}: CategoryAccordionProps) {
  const colors = getCategoryColor(category.name);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      {/* Category header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: colors.border }}
        />
        <span className="font-medium text-sm text-slate-900 flex-1 truncate">
          {category.name}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {category.count}
        </span>
      </button>

      {/* Pathway list */}
      {isExpanded && (
        <div className="bg-slate-50/50">
          {category.pathways.map((pathway) => {
            const isSelected = selectedPathwayId === pathway.id;

            return (
              <button
                key={pathway.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 pl-12 border-l-2 cursor-pointer transition-colors text-left",
                  isSelected
                    ? "bg-indigo-50 border-l-indigo-500"
                    : "border-l-transparent hover:bg-slate-100",
                )}
                onClick={() => onPathwayClick(pathway)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">
                    {pathway.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    {pathway.id}
                  </div>
                </div>
                <ExternalLink
                  href={pathway.url}
                  className="p-1 hover:bg-slate-200 rounded shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-slate-400" />
                </ExternalLink>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

function PathwayListPanelInner({
  pathways,
  selectedPathwayId,
  onPathwayClick,
}: PathwayListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );

  // Filter pathways by search
  const filteredPathways = useMemo(() => {
    if (!searchQuery.trim()) return pathways;
    const q = searchQuery.toLowerCase();
    return pathways.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [pathways, searchQuery]);

  // Group by category
  const categories = useMemo(
    () => groupPathwaysByCategory(filteredPathways),
    [filteredPathways],
  );

  // Auto-expand when searching (useEffect, not useMemo)
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(categories.map((c) => c.name)));
    }
  }, [searchQuery, categories]);

  const handleToggleCategory = useCallback((name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedCategories(new Set(categories.map((c) => c.name)));
  }, [categories]);

  const handleCollapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search pathways..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {filteredPathways.length} pathway
            {filteredPathways.length !== 1 ? "s" : ""} in {categories.length}{" "}
            categor{categories.length !== 1 ? "ies" : "y"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Expand all
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No pathways found matching "{searchQuery}"
          </div>
        ) : (
          categories.map((category) => (
            <CategoryAccordion
              key={category.name}
              category={category}
              isExpanded={expandedCategories.has(category.name)}
              onToggle={() => handleToggleCategory(category.name)}
              selectedPathwayId={selectedPathwayId}
              onPathwayClick={onPathwayClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const PathwayListPanel = memo(PathwayListPanelInner);
