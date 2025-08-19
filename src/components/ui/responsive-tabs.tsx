"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/general";

export interface TabConfig {
  id: string;
  label: string;
  shortLabel?: string; // For mobile
  count?: number;
  content: React.ReactNode;
}

export interface TabGroupConfig {
  id: string;
  label: string;
  shortLabel?: string;
  count?: number;
  tabs: TabConfig[];
}

interface ResponsiveTabsProps {
  tabs?: TabConfig[];
  tabGroups?: TabGroupConfig[];
  defaultValue?: string;
  className?: string;
  variant?: "simple" | "flat"; // simple = nested tabs, flat = all tabs on one line
}

export function ResponsiveTabs({
  tabs,
  tabGroups,
  defaultValue,
  className,
  variant = "simple"
}: ResponsiveTabsProps) {
  // For flat variant - flatten all tabs into one list
  const flatTabs = React.useMemo(() => {
    if (!tabGroups) return tabs || [];
    
    return tabGroups.flatMap(group => 
      group.tabs.map(tab => ({
        ...tab,
        id: `${group.id}-${tab.id}`,
        label: `${group.label} ${tab.label}`,
        shortLabel: `${group.shortLabel || group.label.slice(0, 2)}${tab.shortLabel || tab.label.slice(0, 1)}`
      }))
    );
  }, [tabGroups, tabs]);

  const allTabs = variant === "flat" ? flatTabs : (tabs || []);

  // Calculate grid columns based on number of tabs
  const getGridCols = (count: number) => {
    if (count <= 2) return "grid-cols-2";
    if (count <= 3) return "grid-cols-3";
    if (count <= 4) return "grid-cols-2 lg:grid-cols-4";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
  };

  if (variant === "flat" || tabs) {
    return (
      <Tabs defaultValue={defaultValue || allTabs[0]?.id} className={cn("w-full", className)}>
        <TabsList className={cn("grid w-full h-auto", getGridCols(allTabs.length))}>
          {allTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-1 text-sm px-2 py-2"
            >
              <span className="hidden sm:inline truncate">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel || tab.label.slice(0, 2)}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="text-xs font-mono ml-1 flex-shrink-0">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {allTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  // Nested tabs for grouped content (like PPI with biogrid/intact/huri each having table/chart)
  if (tabGroups) {
    const defaultGroup = tabGroups[0];
    const defaultTab = defaultGroup?.tabs[0];
    const computedDefaultValue = defaultValue || `${defaultGroup?.id}-${defaultTab?.id}`;

    return (
      <div className={cn("w-full space-y-4", className)}>
        <Tabs defaultValue={computedDefaultValue}>
          <TabsList className={cn("grid w-full h-auto", getGridCols(tabGroups.length))}>
            {tabGroups.map((group) => (
              <TabsTrigger 
                key={group.id}
                value={`${group.id}-${group.tabs[0]?.id}`}
                className="flex items-center gap-1 text-sm px-2 py-2"
              >
                <span className="hidden sm:inline truncate">{group.label}</span>
                <span className="sm:hidden">{group.shortLabel || group.label.slice(0, 2)}</span>
                {group.count !== undefined && group.count > 0 && (
                  <Badge variant="secondary" className="text-xs font-mono ml-1 flex-shrink-0">
                    {group.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabGroups.map((group) => (
            <TabsContent key={group.id} value={`${group.id}-${group.tabs[0]?.id}`} className="mt-4">
              <Tabs defaultValue={group.tabs[0]?.id}>
                <TabsList className={cn("grid w-full h-auto", getGridCols(group.tabs.length))}>
                  {group.tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1 text-sm px-2 py-2"
                    >
                      <span className="hidden sm:inline truncate">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel || tab.label.slice(0, 1)}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <Badge variant="secondary" className="text-xs font-mono ml-1 flex-shrink-0">
                          {tab.count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {group.tabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-4">
                    {tab.content}
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return null;
}