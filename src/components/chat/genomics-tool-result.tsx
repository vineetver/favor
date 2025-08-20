'use client';

import { Dna, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface GenomicsToolResultProps {
  toolName: string;
  result: any;
  isError?: boolean;
}

export function GenomicsToolResult({ toolName, result, isError = false }: GenomicsToolResultProps) {
  const [showRaw, setShowRaw] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isError) {
    return (
      <div className="border rounded-lg p-4 bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-2 text-sm font-medium mb-2 text-destructive">
          <Dna size={14} />
          <span>Analysis Error</span>
        </div>
        <div className="text-destructive text-sm">
          {typeof result === 'string' ? result : result.message || 'An error occurred during analysis'}
        </div>
      </div>
    );
  }

  const renderVariantResult = (data: any) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Position:</span>
          <div className="mt-1">{data.chromosome}:{data.position}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Change:</span>
          <div className="mt-1 font-mono">{data.refAllele} → {data.altAllele}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Gene:</span>
          <div className="mt-1">{data.annotations?.gene || 'Unknown'}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Clinical Significance:</span>
          <div className={`mt-1 inline-flex px-2 py-1 rounded text-xs font-medium ${
            data.clinicalSignificance === 'Pathogenic' ? 'bg-red-100 text-red-700' :
            data.clinicalSignificance === 'Benign' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {data.clinicalSignificance}
          </div>
        </div>
      </div>

      {data.links && (
        <div className="flex gap-2 pt-2">
          {data.links.clinvar && (
            <Button variant="outline" size="sm" asChild>
              <a href={data.links.clinvar} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} className="mr-1" />
                ClinVar
              </a>
            </Button>
          )}
          {data.links.dbsnp && (
            <Button variant="outline" size="sm" asChild>
              <a href={data.links.dbsnp} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} className="mr-1" />
                dbSNP
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderExpressionResult = (data: any) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Gene:</span>
          <div className="mt-1 font-mono">{data.gene}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Dataset:</span>
          <div className="mt-1">{data.dataset.toUpperCase()}</div>
        </div>
      </div>

      {data.tissueExpression && data.tissueExpression.length > 0 && (
        <div>
          <span className="font-medium text-muted-foreground">Top Expressing Tissues:</span>
          <div className="mt-2 space-y-2">
            {data.tissueExpression.slice(0, 5).map((tissue: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{tissue.tissue}</span>
                <span className="font-mono">{tissue.expression.toFixed(2)} TPM</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPathwayResult = (data: any) => (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="font-medium text-muted-foreground">Input Genes:</span>
        <div className="mt-1 font-mono text-xs bg-muted/50 p-2 rounded">
          {data.inputGenes.join(', ')}
        </div>
      </div>

      {data.results && data.results.length > 0 && (
        <div>
          <span className="font-medium text-muted-foreground">Significant Pathways:</span>
          <div className="mt-2 space-y-2">
            {data.results.slice(0, 5).map((pathway: any, index: number) => (
              <div key={index} className="border rounded p-2 text-sm">
                <div className="font-medium">{pathway.pathwayName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {pathway.database} • p-value: {pathway.pValue.toExponential(2)} • {pathway.geneCount} genes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDefaultResult = (data: any) => (
    <div className="text-sm">
      <pre className="whitespace-pre-wrap bg-muted/50 p-3 rounded text-xs overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  const getResultRenderer = () => {
    if (toolName.includes('Variant')) return renderVariantResult;
    if (toolName.includes('Expression')) return renderExpressionResult;
    if (toolName.includes('Pathway')) return renderPathwayResult;
    return renderDefaultResult;
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Dna size={14} />
          <span>{toolName} Results</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className="h-6 px-2 text-xs"
          >
            {showRaw ? 'Formatted' : 'Raw'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="h-6 px-2 text-xs"
          >
            <Copy size={12} />
          </Button>
        </div>
      </div>

      {showRaw ? renderDefaultResult(result) : getResultRenderer()(result)}
    </div>
  );
}