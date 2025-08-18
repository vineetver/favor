"use client";

import React from "react";
import { ResponsiveContainer } from "recharts";
import { Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/general";
import { validateChartData, type BaseChartProps } from "./utils";

interface BaseChartWrapperProps extends Omit<BaseChartProps, "data"> {
  data: any[];
  children: React.ReactElement;
  onExport?: () => void;
  onFullscreen?: () => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export function BaseChartWrapper({
  data,
  children,
  width,
  height = 400,
  className,
  title,
  subtitle,
  onExport,
  onFullscreen,
  loading = false,
  error = null,
  emptyMessage = "No data available",
  actions,
  responsive = true,
}: BaseChartWrapperProps) {
  // Validate data
  const isValidData = validateChartData(data);
  
  // Handle different states
  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        {title && (
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div
            className="flex items-center justify-center bg-muted/50 rounded-lg animate-pulse"
            style={{ height }}
          >
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        {title && (
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div
            className="flex items-center justify-center bg-destructive/10 border border-destructive/20 rounded-lg"
            style={{ height }}
          >
            <div className="text-center space-y-2">
              <div className="text-destructive font-medium">Chart Error</div>
              <div className="text-sm text-muted-foreground">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isValidData) {
    return (
      <Card className={cn("w-full", className)}>
        {title && (
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div
            className="flex items-center justify-center bg-muted/50 rounded-lg"
            style={{ height }}
          >
            <div className="text-center space-y-2">
              <div className="text-muted-foreground font-medium">No Data</div>
              <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {(title || onExport || onFullscreen || actions) && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {actions}
              {onExport && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onExport}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export chart</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {onFullscreen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onFullscreen}>
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fullscreen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {responsive ? (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        ) : (
          <div style={{ width: width || "100%", height }}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export function to download chart as PNG
export const exportChartAsPNG = (
  chartRef: React.RefObject<any>,
  filename: string = "chart"
) => {
  if (!chartRef.current) {
    console.error("Chart ref is null");
    return;
  }

  // Get the SVG element - search more thoroughly
  let svgElement = chartRef.current.querySelector("svg");
  
  // If not found directly, search in nested elements
  if (!svgElement) {
    const containers = chartRef.current.querySelectorAll(".recharts-wrapper, .recharts-surface");
    for (const container of containers) {
      svgElement = container.querySelector("svg");
      if (svgElement) break;
    }
  }

  if (!svgElement) {
    console.error("SVG element not found");
    return;
  }

  try {
    // Create canvas and context
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const svgRect = svgElement.getBoundingClientRect();
    canvas.width = svgRect.width * 2; // Higher resolution
    canvas.height = svgRect.height * 2;
    ctx.scale(2, 2);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff"; // White background
      ctx.fillRect(0, 0, svgRect.width, svgRect.height);
      ctx.drawImage(img, 0, 0);

      // Download the image
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      console.error("Failed to load SVG image");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (error) {
    console.error("Error exporting chart:", error);
  }
};