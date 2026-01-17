"use client";

import { type ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataViewLayoutProps {
  title: string;
  subtitle?: string;
  tableView: ReactNode;
  visualizationView: ReactNode;
  actions?: ReactNode;
  controls?: ReactNode;
  defaultTab?: "table" | "visualization";
}

export function DataViewLayout({
  title,
  subtitle,
  tableView,
  visualizationView,
  actions,
  controls,
  defaultTab = "table",
}: DataViewLayoutProps) {
  const [activeTab, setActiveTab] = useState<"table" | "visualization">(
    defaultTab,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 border-b pb-0">
          {/* View Tabs (Table vs Viz) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("table")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "table"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setActiveTab("visualization")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "visualization"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Visualization
            </button>
          </div>

          {/* Extra Controls (e.g. View Selectors) */}
          {controls && (
            <div className="flex items-center bg-muted/50 p-1 rounded-lg mb-2 sm:mb-0">
              {controls}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {activeTab === "table" ? tableView : visualizationView}
      </CardContent>
    </Card>
  );
}
