"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import type { Variant, StudyLocus } from "@/lib/opentargets/types";

interface VariantStudiesDisplayProps {
  variant: Variant & { studyLoci: { count: number; rows: StudyLocus[] } };
  vcf: string;
}

function formatPValue(pval?: number) {
  if (!pval) return "—";
  if (pval < 1e-10) return pval.toExponential(2);
  return pval.toPrecision(3);
}

function formatEffect(beta?: number, oddsRatio?: number) {
  if (beta !== undefined) {
    return `β = ${beta.toFixed(3)}`;
  }
  if (oddsRatio !== undefined) {
    return `OR = ${oddsRatio.toFixed(3)}`;
  }
  return "—";
}

export function VariantStudiesDisplay({
  variant,
  vcf,
}: VariantStudiesDisplayProps) {
  const [expandedStudies, setExpandedStudies] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = (studyId: string) => {
    const newExpanded = new Set(expandedStudies);
    if (newExpanded.has(studyId)) {
      newExpanded.delete(studyId);
    } else {
      newExpanded.add(studyId);
    }
    setExpandedStudies(newExpanded);
  };

  const studies = variant.studyLoci?.rows || [];

  if (studies.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No GWAS studies found for variant {vcf} in OpenTargets Platform
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {variant.studyLoci.count}
              </div>
              <div className="text-sm text-muted-foreground">Total Studies</div>
            </div>
          </CardContent>
        </Card>

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
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Associated Studies</h3>

        {studies.map((studyLocus, index) => {
          const study = (studyLocus as any).study;
          const isExpanded = expandedStudies.has(
            study?.studyId || index.toString(),
          );

          return (
            <Card key={study?.studyId || index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">
                      {study?.traitReported || "Unknown trait"}
                    </CardTitle>
                    {study?.pubTitle && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {study.pubTitle}
                      </p>
                    )}
                    {study?.pubAuthor && (
                      <p className="text-xs text-muted-foreground">
                        {study.pubAuthor}{" "}
                        {study?.pubDate && `(${study.pubDate})`}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 text-right space-y-1">
                    <div className="text-sm font-mono">
                      p = {formatPValue(studyLocus.pval)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatEffect(studyLocus.beta, studyLocus.oddsRatio)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {study?.studyId && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {study.studyId}
                      </Badge>
                    )}
                    {study?.pmid && (
                      <Badge variant="outline" className="text-xs">
                        PMID: {study.pmid}
                      </Badge>
                    )}
                    {(studyLocus as any).credibleSetSize && (
                      <Badge variant="outline" className="text-xs">
                        Credible set: {(studyLocus as any).credibleSetSize}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {study?.pmid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          window.open(
                            `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`,
                            "_blank",
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleExpanded(study?.studyId || index.toString())
                      }
                      className="h-6 text-xs"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {studyLocus.beta !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Beta</div>
                        <div className="font-mono">
                          {studyLocus.beta.toFixed(4)}
                        </div>
                      </div>
                    )}
                    {studyLocus.oddsRatio !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Odds Ratio</div>
                        <div className="font-mono">
                          {studyLocus.oddsRatio.toFixed(3)}
                        </div>
                      </div>
                    )}
                    {studyLocus.confidenceIntervalLower !== undefined &&
                      studyLocus.confidenceIntervalUpper !== undefined && (
                        <div>
                          <div className="text-muted-foreground">95% CI</div>
                          <div className="font-mono text-xs">
                            {studyLocus.confidenceIntervalLower.toFixed(3)} -{" "}
                            {studyLocus.confidenceIntervalUpper.toFixed(3)}
                          </div>
                        </div>
                      )}
                    {studyLocus.pval !== undefined && (
                      <div>
                        <div className="text-muted-foreground">P-value</div>
                        <div className="font-mono">
                          {studyLocus.pval.toExponential(2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
