"use client";

import * as React from "react";
import { Search, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DataTableTab, DataTableFilterGroup } from "./types";
import { DataTableFilters } from "./data-table-filters";

// ============================================================================
// DataTableHeader - Main header/toolbar component
// ============================================================================

interface DataTableHeaderProps {
  /** Icon component for header */
  icon?: React.ComponentType<{ className?: string }>;
  /** Title text */
  title?: string;
  /** Subtitle/version text */
  subtitle?: string;
  /** Actions (tabs, buttons, etc.) to show on the right of title */
  actions?: React.ReactNode;
  /** Export handler - shows download icon when provided */
  onExport?: () => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Filter groups for sub-tabs */
  filterGroups?: DataTableFilterGroup[];
  /** Current filter values */
  filterValues?: Record<string, string>;
  /** Filter change handler */
  onFilterChange?: (groupId: string, value: string) => void;
  /** Additional filter content */
  filterContent?: React.ReactNode;
}

export function DataTableHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  onExport,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filterGroups,
  filterValues,
  onFilterChange,
  filterContent,
}: DataTableHeaderProps) {
  const hasSearch = onSearchChange !== undefined;
  const hasFilters = (filterGroups && filterGroups.length > 0 && filterValues && onFilterChange) || filterContent;
  const hasTitleRow = title || Icon || subtitle || actions || onExport;
  const hasToolbarRow = hasSearch || hasFilters;

  if (!hasTitleRow && !hasToolbarRow) return null;

  return (
    <div className="px-6 py-5 border-b border-slate-100 bg-white flex flex-col gap-5">
      {/* Title Row */}
      {hasTitleRow && (
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Title/Subtitle */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            {(title || subtitle) && (
              <div className="flex flex-col">
                {title && (
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                )}
                {subtitle && (
                  <span className="text-sm text-slate-500">{subtitle}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions + Export */}
          <div className="flex items-center gap-3">
            {actions}
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Export data"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Row */}
      {hasToolbarRow && (
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          {/* Search */}
          {hasSearch && (
            <div className="relative w-full max-w-sm group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-sm transition-all"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}

          {/* Filters */}
          {hasFilters && (
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {filterContent}
              {filterGroups && filterValues && onFilterChange && (
                <DataTableFilters
                  filterGroups={filterGroups}
                  filterValues={filterValues}
                  onFilterChange={onFilterChange}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DataTableTabs - Top-level tab navigation (filled style)
// ============================================================================

interface DataTableTabsProps {
  tabs: DataTableTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Use filled style (like Genomes/Exomes) vs outline style */
  variant?: "filled" | "outline";
  className?: string;
}

export function DataTableTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = "outline",
  className,
}: DataTableTabsProps) {
  if (variant === "filled") {
    // Filled button style (like Genomes/Exomes in reference)
    return (
      <div className={`inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg ${className || ""}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = (activeTab || tabs[0]?.id) === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Outline style (default - like Frequency Table/Visualization in reference)
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${className || ""}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = (activeTab || tabs[0]?.id) === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }
            `}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// DataTableSubTabs - Second-tier filter tabs (like Overall/Male/Female)
// ============================================================================

interface DataTableSubTabsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DataTableSubTabs({
  options,
  value,
  onChange,
  className,
}: DataTableSubTabsProps) {
  return (
    <div className={`inline-flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg ${className || ""}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-all
              ${isActive
                ? "text-slate-900 bg-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Legacy exports
// ============================================================================

/** @deprecated Use DataTableHeader instead */
export const DataTableTopBar = DataTableHeader;
export const DataTableToolbarRow = DataTableHeader;
