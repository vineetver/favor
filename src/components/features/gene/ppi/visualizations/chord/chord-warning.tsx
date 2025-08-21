"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Network, Eye } from "lucide-react";

interface ChordWarningProps {
  nodeCount: number;
  onSwitchToNetwork: () => void;
  onProceedAnyway: () => void;
}

export function ChordWarning({
  nodeCount,
  onSwitchToNetwork,
  onProceedAnyway,
}: ChordWarningProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Large Network Detected
            </h3>
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 border-amber-200"
              >
                {nodeCount} nodes detected
              </Badge>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chord diagrams work best with smaller networks (≤39 nodes). With{" "}
                {nodeCount} nodes, the visualization may appear crowded and
                difficult to interpret.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onSwitchToNetwork}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Network className="w-4 h-4 mr-2" />
              Use Network View (Recommended)
            </Button>

            <Button
              onClick={onProceedAnyway}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Show Chord Anyway
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Network view provides better performance and clarity for large
            datasets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
