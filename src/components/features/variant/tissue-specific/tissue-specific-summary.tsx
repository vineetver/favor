"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Target, TrendingUp, FileText, Dna } from "lucide-react";
import type { CCRE } from "@/lib/variant/ccre/types";
import type { ABCPeaks, ABCScore } from "@/lib/variant/abc/api";
import type { Entex } from "@/lib/variant/entex/api";
import type { ScentTissue } from "@/lib/variant/scent/types";
import type { PGBoost } from "@/lib/variant/pgboost/types";

interface TissueSpecificData {
  ccre: CCRE[];
  abcScores: ABCScore[];
  abcPeaks: ABCPeaks[];
  entex: Entex[];
  scent: ScentTissue[];
  pgboost: PGBoost[];
}

interface TissueSpecificSummaryProps {
  variant: {
    variant_vcf: string;
    rsid?: string;
    chromosome: string;
    position: string;
  };
  data: TissueSpecificData;
}

export function TissueSpecificSummary({ variant, data }: TissueSpecificSummaryProps) {
  const summaries = useMemo(() => {
    // cCREs - Show regulatory elements with types
    const activeCCREs = data.ccre.filter(item => 
      item.annotations === 'PLS' || item.annotations === 'pELS' || item.annotations === 'dELS'
    );
    const ccreTypesSet = new Set(activeCCREs.map(item => item.annotations));
    const ccreTypes = Array.from(ccreTypesSet);
    const ccreSummary = activeCCREs.length > 0 
      ? `${activeCCREs.length} regulatory elements (${ccreTypes.join(', ')})` 
      : null;

    // ABC Peaks - Show significant chromatin accessibility
    const significantPeaks = data.abcPeaks.filter(item => 
      item && item.q_value != null && item.q_value < 0.05
    );
    const peaksSummary = significantPeaks.length > 0 
      ? `${significantPeaks.length} significant accessibility peaks` 
      : null;

    // ABC Scores - Show strong enhancer-gene links with target genes
    const strongLinks = data.abcScores.filter(item => 
      item && item.abc_score != null && item.abc_score > 0.02
    );
    const targetGenesSet = new Set(strongLinks.map(item => item.gene_name).filter(Boolean));
    const targetGenes = Array.from(targetGenesSet);
    const scoresSummary = strongLinks.length > 0 
      ? `${strongLinks.length} enhancer-gene links (${targetGenes.slice(0, 3).join(', ')}${targetGenes.length > 3 ? ` +${targetGenes.length - 3} more` : ''})` 
      : null;

    // ENTEx - Show tissue expression patterns with tissue names
    const tissuesWithExpressionSet = new Set(data.entex.map(item => item?.tissue).filter(Boolean));
    const tissuesWithExpression = Array.from(tissuesWithExpressionSet);
    const entexSummary = tissuesWithExpression.length > 0 
      ? `Expression in ${tissuesWithExpression.length} tissues (${tissuesWithExpression.slice(0, 3).join(', ')}${tissuesWithExpression.length > 3 ? ` +${tissuesWithExpression.length - 3} more` : ''})` 
      : null;

    // SCENT - Show regulatory network predictions with tissue names
    const tissuesWithRegulationSet = new Set(data.scent.map(item => item?.tissue).filter(Boolean));
    const tissuesWithRegulation = Array.from(tissuesWithRegulationSet);
    const scentSummary = tissuesWithRegulation.length > 0 
      ? `Regulatory activity in ${tissuesWithRegulation.length} tissues (${tissuesWithRegulation.slice(0, 3).join(', ')}${tissuesWithRegulation.length > 3 ? ` +${tissuesWithRegulation.length - 3} more` : ''})` 
      : null;

    // pgBoost - Show top gene predictions
    const strongGeneLinks = data.pgboost.filter(item => 
      item && item.pg_boost_percentile != null && item.pg_boost_percentile > 0.75
    );
    const topGenes = strongGeneLinks.slice(0, 3).map(item => item?.gene).filter(Boolean);
    const pgboostSummary = topGenes.length > 0 
      ? `Linked to ${topGenes.join(', ')}${strongGeneLinks.length > 3 ? ` +${strongGeneLinks.length - 3} more` : ''}` 
      : null;

    return [ccreSummary, peaksSummary, scoresSummary, entexSummary, scentSummary, pgboostSummary].filter(Boolean);
  }, [data]);

  const overallSignificance = useMemo(() => {
    const hasStrong = summaries.length >= 3;
    const hasModerate = summaries.length >= 2;
    
    if (hasStrong) return 'high';
    if (hasModerate) return 'medium';
    if (summaries.length > 0) return 'low';
    return 'none';
  }, [summaries]);

  const getStatusColor = (significance: string) => {
    switch (significance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const summaryText = useMemo(() => {
    switch (overallSignificance) {
      case 'high': return 'Strong tissue-specific regulatory activity';
      case 'medium': return 'Moderate tissue-specific activity';
      case 'low': return 'Limited tissue-specific activity';
      default: return 'No significant tissue-specific activity';
    }
  }, [overallSignificance]);

  return (
    <Card>
      <CardHeader>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(overallSignificance)}>
            {overallSignificance.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">{summaryText}</span>
        </div>
        
        {summaries.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Key Findings:</div>
            <ul className="space-y-1">
              {summaries.map((summary, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-current flex-shrink-0"></div>
                  {summary}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No tissue-specific regulatory activity detected in available data sources.
          </div>
        )}
      </CardContent>
    </Card>
  );
}