"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Target } from "@/lib/opentargets/types";

interface TargetSafetyDisplayProps {
  target: Target & { safetyLiabilities?: any[] };
  geneName: string;
}

export function TargetSafetyDisplay({ target, geneName }: TargetSafetyDisplayProps) {
  const safetyLiabilities = target.safetyLiabilities || [];

  if (safetyLiabilities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No safety liability data found for {geneName} in OpenTargets Platform
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {safetyLiabilities.length} Safety Liabilities
        </h2>
        <Badge variant="outline">{geneName}</Badge>
      </div>

      <div className="grid gap-4">
        {safetyLiabilities.map((liability, index) => (
          <Card key={index} className="border-orange-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <CardTitle className="text-base text-orange-900">
                    {liability.event || "Safety Event"}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              {liability.effects && liability.effects.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Effects</div>
                  <div className="grid gap-2">
                    {liability.effects.map((effect: any, effectIndex: number) => (
                      <div key={effectIndex} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                        <div className="text-sm">
                          <div className="font-medium">{effect.direction || "Unknown direction"}</div>
                          {effect.dosing && (
                            <div className="text-muted-foreground text-xs">Dosing: {effect.dosing}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {liability.organs && liability.organs.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Affected Organs/Systems</div>
                  <div className="flex flex-wrap gap-1">
                    {liability.organs.map((organ: any, organIndex: number) => (
                      <Badge key={organIndex} variant="secondary" className="text-xs">
                        {organ.name || organ.id}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {liability.references && liability.references.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">References</div>
                  <div className="space-y-1">
                    {liability.references.map((ref: any, refIndex: number) => (
                      <div key={refIndex} className="flex items-center gap-2 text-xs">
                        {ref.pmid && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">PMID:</span>
                            <span className="font-mono">{ref.pmid}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                        {ref.ref2022 && (
                          <div className="text-muted-foreground">
                            Ref: {ref.ref2022}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-orange-900 mb-1">Important Safety Information</div>
            <p className="text-orange-800">
              The safety liabilities shown here are derived from various sources including 
              experimental data, clinical trials, and post-market surveillance. This information 
              should be considered in the context of drug development and target assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}