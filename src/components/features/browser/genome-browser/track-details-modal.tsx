"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Database,
  Settings,
  Zap,
  Clock,
  Users,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { COMPREHENSIVE_TRACK_REGISTRY } from "@/lib/tracks/registry";

interface TrackDetailsModalProps {
  trackId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleTrack?: (trackId: string) => void;
}

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown renderer for basic formatting
  const renderMarkdown = (text: string) => {
    return (
      text
        // Headers
        .replace(
          /^### (.*$)/gm,
          '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>',
        )
        .replace(
          /^## (.*$)/gm,
          '<h2 class="text-2xl font-semibold mt-6 mb-3">$1</h2>',
        )
        .replace(
          /^# (.*$)/gm,
          '<h1 class="text-3xl font-bold tracking-tight mt-8 mb-4">$1</h1>',
        )
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Lists
        .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
        // Code blocks (inline)
        .replace(
          /`([^`]+)`/g,
          '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>',
        )
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-3">')
        // Wrap in paragraphs
        .replace(/^(?!<[h|l|c])(.+)$/gm, '<p class="mb-3">$1</p>')
    );
  };

  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function PerformanceIndicator({
  level,
  label,
}: {
  level: "low" | "medium" | "high" | "fast" | "slow";
  label: string;
}) {
  const getColor = (level: string) => {
    switch (level) {
      case "low":
      case "fast":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "high":
      case "slow":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getIcon = (level: string) => {
    switch (level) {
      case "low":
      case "fast":
        return <CheckCircle2 className="h-3 w-3" />;
      case "medium":
        return <Clock className="h-3 w-3" />;
      case "high":
      case "slow":
        return <Zap className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${getColor(level)}`}
    >
      {getIcon(level)}
      <span>
        {label}: {level}
      </span>
    </div>
  );
}

function getTrackDocumentation(trackId: string): string {
  const track = COMPREHENSIVE_TRACK_REGISTRY[trackId];
  if (!track) return "";

  return `# ${track.name}

${track.description}

## Overview
${track.documentation.overview}

## Data Source
${track.documentation.dataSource}

## Methodology
${track.documentation.methodology}

## Interpretation Guide
${track.documentation.interpretation}

## Performance Characteristics
- **Render Time**: ${track.performance.renderTime}
- **Memory Usage**: ${track.performance.memoryUsage}
<!-- - **Data Size**: ${track.performance.dataSize} -->

## Customization Options
- **Colorable**: ${track.customization.colorable ? "Yes" : "No"}
- **Height Adjustable**: ${track.customization.heightAdjustable ? "Yes" : "No"}
- **Available Filters**: ${track.customization.filtersAvailable.join(", ")}

## References
${track.documentation.references.map((ref) => `- ${ref}`).join("\n")}

---
**Version**: ${track.version} | **Last Updated**: ${track.documentation.lastUpdated}  
**Authors**: ${track.authors.join(", ")}
`;
}

export function TrackDetailsModal({
  trackId,
  isOpen,
  onClose,
  onToggleTrack,
}: TrackDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const track = trackId ? COMPREHENSIVE_TRACK_REGISTRY[trackId] : null;

  if (!track) return null;

  const documentation = trackId ? getTrackDocumentation(trackId) : "";

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleToggleTrack = () => {
    if (onToggleTrack && trackId) {
      onToggleTrack(trackId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-6 pr-12">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <DialogTitle className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <span className="truncate">{track.name}</span>
                <Badge
                  variant="outline"
                  className="text-xs font-medium flex-shrink-0"
                >
                  v{track.version}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                {track.description}
              </DialogDescription>
              {/* <div className="flex flex-wrap gap-2">
                {track.tags.slice(0, 5).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {track.tags.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{track.tags.length - 5} more
                  </Badge>
                )}
              </div> */}
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={handleToggleTrack}
                variant={track.enabled ? "destructive" : "default"}
                size="sm"
                className="whitespace-nowrap"
              >
                {track.enabled ? "Disable Track" : "Enable Track"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="technical"
                className="flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Technical
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Data Source
              </TabsTrigger>
              <TabsTrigger
                value="documentation"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Full Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">
                    Track Overview
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Understanding what this track shows and how to interpret it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-base text-foreground">
                      What it shows
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {track.documentation.overview}
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <h4 className="font-semibold text-base text-foreground">
                      How to interpret
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {track.documentation.interpretation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">
                    Technical Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base mb-3">
                        Rendering Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Render Time:
                          </span>
                          <span className="font-medium">
                            {track.performance.renderTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Memory Usage:
                          </span>
                          <span className="font-medium">
                            {track.performance.memoryUsage}
                          </span>
                        </div>
                        {/* <div className="flex justify-between">
                          <span className="text-muted-foreground">Data Size:</span>
                          <span className="font-medium">{track.performance.dataSize}</span>
                        </div> */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Zoom Behavior:
                          </span>
                          <span className="font-medium">
                            {track.interactions.zoomBehavior}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-base mb-3">
                        Interaction Support
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Linking:
                          </span>
                          <span className="font-medium">
                            {track.interactions.linkingSupported
                              ? "Supported"
                              : "Not supported"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            View Types:
                          </span>
                          <span className="font-medium">
                            {track.interactions.supportedViewTypes.join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">
                    Methodology
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {track.documentation.methodology}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">
                    Performance & Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <PerformanceIndicator
                      level={track.performance.renderTime}
                      label="Render"
                    />
                    <PerformanceIndicator
                      level={track.performance.memoryUsage}
                      label="Memory"
                    />
                    <div className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium bg-purple-50 border-purple-200 text-purple-600">
                      <Settings className="h-3 w-3" />
                      <span>
                        {track.customization.filtersAvailable.length} filters
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-base">
                      Available Customizations
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {track.customization.colorable && (
                        <Badge variant="outline" className="text-xs">
                          Color Adjustable
                        </Badge>
                      )}
                      {track.customization.heightAdjustable && (
                        <Badge variant="outline" className="text-xs">
                          Height Adjustable
                        </Badge>
                      )}
                      {track.customization.filtersAvailable.map((filter) => (
                        <Badge
                          key={filter}
                          variant="outline"
                          className="text-xs"
                        >
                          {filter.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Source Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">Source</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(track.documentation.dataSource, "source")
                        }
                        className="text-xs"
                      >
                        {copiedField === "source" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg leading-relaxed">
                      {track.documentation.dataSource}
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <h4 className="font-semibold text-base">
                      Contributing Authors
                    </h4>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {track.authors.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-base">References</h4>
                    <ul className="space-y-3">
                      {track.documentation.references.map((ref, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground leading-relaxed pl-1"
                        >
                          {index + 1}. {ref}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last updated: {track.documentation.lastUpdated}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentation" className="mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">
                    Complete Documentation
                  </CardTitle>
                  <CardDescription>
                    Full technical documentation and usage guide
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-auto pr-2">
                    <MarkdownRenderer content={documentation} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
