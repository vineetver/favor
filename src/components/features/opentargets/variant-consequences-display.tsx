"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Info } from "lucide-react";
import type { Variant } from "@/lib/opentargets/types";

interface VariantConsequencesDisplayProps {
  variant: Variant & { transcriptConsequences?: any[] };
  vcf: string;
}

const IMPACT_COLORS = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-200",
  LOW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MODIFIER: "bg-gray-100 text-gray-800 border-gray-200",
} as const;

const IMPACT_ICONS = {
  HIGH: AlertTriangle,
  MODERATE: AlertTriangle,
  LOW: Info,
  MODIFIER: Info,
} as const;

function getPredictionColor(score?: number) {
  if (!score) return "bg-gray-100";
  if (score >= 0.8) return "bg-red-100";
  if (score >= 0.6) return "bg-orange-100";
  if (score >= 0.4) return "bg-yellow-100";
  return "bg-green-100";
}

function formatPrediction(prediction?: string, score?: number) {
  if (!prediction) return "—";
  if (score !== undefined) {
    return `${prediction} (${score.toFixed(3)})`;
  }
  return prediction;
}

export function VariantConsequencesDisplay({
  variant,
  vcf,
}: VariantConsequencesDisplayProps) {
  const consequences = variant.transcriptConsequences || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-mono">
                {variant.chromosome}:{variant.position}
              </div>
              <div className="text-sm text-muted-foreground">Position</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg font-mono">
                {variant.refAllele} → {variant.altAllele}
              </div>
              <div className="text-sm text-muted-foreground">Alleles</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-lg">
                {variant.mostSevereConsequence || "—"}
              </div>
              <div className="text-sm text-muted-foreground">Most Severe</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{consequences.length}</div>
              <div className="text-sm text-muted-foreground">Transcripts</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {variant.rsId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">dbSNP ID:</span>
              <Badge variant="outline" className="font-mono">
                {variant.rsId}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {consequences.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No transcript consequences found for variant {vcf} in OpenTargets
              Platform
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Transcript Consequences</h3>

          <div className="grid gap-4">
            {consequences.map((consequence, index) => {
              const gene = consequence.gene;
              const transcript = consequence.transcript;
              const impact = consequence.impact as keyof typeof IMPACT_COLORS;
              const impactColor =
                IMPACT_COLORS[impact] || IMPACT_COLORS.MODIFIER;
              const ImpactIcon = IMPACT_ICONS[impact] || Info;

              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {gene?.symbol || "Unknown Gene"}
                        </CardTitle>
                        {transcript?.id && (
                          <p className="text-sm text-muted-foreground font-mono">
                            {transcript.id}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={impactColor}>
                          <ImpactIcon className="h-3 w-3 mr-1" />
                          {impact || "UNKNOWN"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {consequence.consequenceType && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Consequence Type
                        </div>
                        <Badge variant="secondary">
                          {consequence.consequenceType}
                        </Badge>
                      </div>
                    )}

                    {consequence.aminoAcidChange && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Amino Acid Change
                        </div>
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {consequence.aminoAcidChange}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {consequence.polyphenPrediction && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            PolyPhen-2
                          </div>
                          <div className="space-y-1">
                            <div
                              className={`p-2 rounded text-sm ${getPredictionColor(consequence.polyphenScore)}`}
                            >
                              {formatPrediction(
                                consequence.polyphenPrediction,
                                consequence.polyphenScore,
                              )}
                            </div>
                            {consequence.polyphenScore !== undefined && (
                              <Progress
                                value={consequence.polyphenScore * 100}
                                className="h-2"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {consequence.siftPrediction && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            SIFT
                          </div>
                          <div className="space-y-1">
                            <div
                              className={`p-2 rounded text-sm ${getPredictionColor(1 - (consequence.siftScore || 0))}`}
                            >
                              {formatPrediction(
                                consequence.siftPrediction,
                                consequence.siftScore,
                              )}
                            </div>
                            {consequence.siftScore !== undefined && (
                              <Progress
                                value={(1 - consequence.siftScore) * 100}
                                className="h-2"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {gene?.id && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          Gene ID: {gene.id}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
