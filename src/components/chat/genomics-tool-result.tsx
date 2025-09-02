'use client';

import { Dna, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChartRenderer } from './chart-renderer';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

  const renderVariantInfoResult = (result: any) => {
    const data = result.data || result;
    
    return (
      <div className="space-y-4">
        {/* Basic variant info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Position:</span>
            <div className="mt-1 font-mono">{data.chromosome}:{data.position}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">rsID:</span>
            <div className="mt-1 font-mono">{data.rsid || 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Gene:</span>
            <div className="mt-1 font-medium">{data.genecode_comprehensive_info || 'Unknown'}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Protein Change:</span>
            <div className="mt-1 font-mono">{data.protein_variant || data.aa || 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Type:</span>
            <div className="mt-1">{data.genecode_comprehensive_exonic_category || data.genecode_comprehensive_category || 'Unknown'}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Allele Frequency:</span>
            <div className="mt-1 font-mono">{(data.af_total || data.bravo_af)?.toFixed(4) || 'N/A'}</div>
          </div>
        </div>

        {/* Clinical significance */}
        {data.clnsig && (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Clinical Significance:</span>
            <div className={`mt-1 inline-flex px-2 py-1 rounded text-xs font-medium ${
              data.clnsig.includes('Pathogenic') ? 'bg-red-100 text-red-700' :
              data.clnsig.includes('Benign') ? 'bg-green-100 text-green-700' :
              data.clnsig.includes('drug_response') ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {data.clnsig.replace('_', ' ')}
            </div>
          </div>
        )}

        {/* Pathogenicity scores */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">CADD Score:</span>
            <div className="mt-1 font-mono">{data.cadd_phred || 'N/A'}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">SIFT:</span>
            <div className={`mt-1 font-mono ${data.sift_cat === 'deleterious' ? 'text-red-600' : 'text-green-600'}`}>
              {data.sift_cat || 'N/A'}
            </div>
          </div>
        </div>

        {/* External links */}
        <div className="flex gap-2 pt-2">
          {data.rsid && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://www.ncbi.nlm.nih.gov/snp/${data.rsid}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} className="mr-1" />
                dbSNP
              </a>
            </Button>
          )}
          {data.clnsig && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${data.rsid?.replace('rs', '') || ''}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} className="mr-1" />
                ClinVar
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  };

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

  const renderCompactDataResult = (data: any) => {
    // Extract key-value pairs from the data
    const extractKeyValues = (obj: any, prefix = ''): Array<{key: string, value: any}> => {
      const pairs: Array<{key: string, value: any}> = [];
      
      if (typeof obj !== 'object' || obj === null) {
        return [{ key: prefix || 'value', value: obj }];
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        if (obj.length <= 3) {
          obj.forEach((item, idx) => {
            pairs.push({ key: `${prefix}[${idx}]`, value: item });
          });
        } else {
          pairs.push({ key: prefix || 'items', value: `${obj.length} items` });
        }
        return pairs;
      }
      
      // Handle objects - show only first level, most important fields
      const importantFields = ['rsid', 'gene', 'chromosome', 'position', 'variant_vcf', 'protein_variant', 'af_total', 'clnsig', 'cadd_phred', 'sift_cat'];
      const keys = Object.keys(obj);
      
      // Prioritize important fields first
      const prioritizedKeys = [
        ...importantFields.filter(f => keys.includes(f)),
        ...keys.filter(k => !importantFields.includes(k)).slice(0, 6 - importantFields.filter(f => keys.includes(f)).length)
      ];
      
      prioritizedKeys.forEach(key => {
        const value = obj[key];
        if (value !== null && value !== undefined && value !== '') {
          pairs.push({ 
            key: prefix ? `${prefix}.${key}` : key, 
            value: typeof value === 'object' ? '[Object]' : value 
          });
        }
      });
      
      return pairs;
    };

    const keyValues = extractKeyValues(data);
    
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {keyValues.slice(0, 8).map(({ key, value }, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="text-muted-foreground truncate mr-2">{key}:</span>
            <span className="font-mono text-right truncate max-w-[120px]" title={String(value)}>
              {typeof value === 'number' && value < 1 && value > 0 ? 
                value.toFixed(4) : 
                String(value)
              }
            </span>
          </div>
        ))}
        {keyValues.length > 8 && (
          <div className="col-span-2 text-xs text-muted-foreground text-center">
            ... and {keyValues.length - 8} more fields
          </div>
        )}
      </div>
    );
  };

  const renderDefaultResult = (data: any) => (
    <div className="text-sm">
      <pre className="whitespace-pre-wrap bg-muted/50 p-3 rounded text-xs overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  const renderChartResult = (data: any) => {
    // Handle different data structures from tools
    const chartData = data.data || data.config?.data || data;
    const chartConfig = data.config || data;
    const chartType = data.chartType || data.config?.chartType;
    
    return (
      <div className="space-y-3">
        <ChartRenderer
          type="chart"
          chartType={chartType}
          data={chartData}
          config={chartConfig}
          metadata={data.metadata}
        />
      </div>
    );
  };

  const getResultRenderer = () => {
    // Check if this is a chart result
    if (result.type === 'chart') return renderChartResult;
    
    // For most genomics data tools, use the compact renderer
    return renderCompactDataResult;
  };

  // For charts, show the chart
  if (result.type === 'chart') {
    return (
      <div className="my-2">
        {renderChartResult(result)}
      </div>
    );
  }

  // For all other tools, show simple success message
  return (
    <div className="text-sm text-muted-foreground my-2">
      <div className="mb-1">
        <span>Successfully fetched additional information.</span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        This data has been incorporated into the AI's knowledge.
      </div>
      
      {/* Collapsible raw data */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2">
            <ChevronRight size={10} className="data-[state=open]:rotate-90 transition-transform" />
            View Raw Data
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <pre className="whitespace-pre-wrap bg-muted/50 p-2 rounded text-xs overflow-x-auto max-h-48 border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}