"use client";

import {
  ResponsiveTabs,
  type TabConfig,
} from "@/components/ui/responsive-tabs";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";
import type { FilteredItem } from "@/lib/annotations/types";
import { EpigeneticsBarChart } from "@/components/features/variant/epigenetics/epigenetics-bar-chart";

interface EpigeneticsDisplayProps {
  items: FilteredItem[];
}

export function EpigeneticsDisplay({ items }: EpigeneticsDisplayProps) {
  const tabs: TabConfig[] = [
    {
      id: "visualization",
      label: "Visualization",
      shortLabel: "Chart",
      content: <EpigeneticsBarChart items={items} />,
    },
    {
      id: "table",
      label: "Annotation Table",
      shortLabel: "Table",
      count: items.length,
      content: (
        <DataComparisonTable
          items={items}
          leftColumn="value"
          rightColumn="activity"
          leftColumnHeader="Epigenetics Score"
          rightColumnHeader="Regulatory State"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} defaultValue="visualization" />
    </div>
  );
}
