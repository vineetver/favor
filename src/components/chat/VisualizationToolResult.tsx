'use client';

import { VariantVisualizationRenderer } from '@/components/charts/VariantVisualizationRenderer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface VisualizationToolResultProps {
  result: any;
  toolName: string;
}

export function VisualizationToolResult({ result, toolName }: VisualizationToolResultProps) {
  // Handle errors
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <strong>Visualization Failed:</strong> {result.error}
          {result.suggestion && (
            <div className="mt-2 text-sm">
              <strong>Suggestion:</strong> {result.suggestion}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Handle different tool results
  if (toolName === 'standaloneVariantVisualization' || toolName === 'variantVisualization') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📊 {result.type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Visualization
              {result.variants && (
                <Badge variant="secondary" className="ml-2">
                  {result.variants.length} variant{result.variants.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </div>
          {result.variants && (
            <CardDescription>
              Variants: {Array.isArray(result.variants) ? result.variants.join(', ') : result.variants}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Render the actual chart */}
          <VariantVisualizationRenderer
            visualizationData={result.visualizationData}
            type={result.type}
            chartOptions={result.chartOptions}
          />
          
          <Separator className="my-4" />
          
          {/* Metadata */}
          <div className="text-sm text-muted-foreground space-y-1">
            {result.metadata && (
              <>
                <div>Generated: {new Date(result.metadata.generated).toLocaleString()}</div>
                {result.metadata.dataSources && (
                  <div>Data Sources: {result.metadata.dataSources.join(', ')}</div>
                )}
                {result.metadata.aggregationLevel && (
                  <div>Aggregation: {result.metadata.aggregationLevel}</div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle variant analysis results (non-visualization)
  if (toolName === 'variantAnalysis') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧬 Variant Analysis Results
            <Badge variant="secondary">
              {result.analysisType?.replace('_', ' ')}
            </Badge>
          </CardTitle>
          {result.variants && (
            <CardDescription>
              {Array.isArray(result.variants) ? result.variants.join(', ') : result.variants}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Summary */}
          {result.summary && (
            <div>
              <h4 className="font-medium mb-2">Analysis Summary</h4>
              <p className="text-sm text-muted-foreground">{result.summary.summary}</p>
              
              {result.summary.dataAvailability && (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(result.summary.dataAvailability).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium">{key}:</span> {value as string}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <Separator />
          
          {/* Data overview per variant */}
          {result.data && (
            <div>
              <h4 className="font-medium mb-2">Variant Data Overview</h4>
              <div className="space-y-2">
                {Object.entries(result.data).map(([variant, data]: [string, any]) => (
                  <div key={variant} className="border rounded p-3 text-sm">
                    <div className="font-medium mb-1">{variant}</div>
                    {data.error ? (
                      <div className="text-red-600">{data.error}</div>
                    ) : (
                      <div className="text-muted-foreground">
                        Available data: {Object.keys(data).filter(k => k !== 'input' && k !== 'type').join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Cross analysis results */}
          {result.crossAnalysis && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Cross-Variant Analysis</h4>
                
                {result.crossAnalysis.sharedTraits && result.crossAnalysis.sharedTraits.length > 0 && (
                  <div className="mb-2">
                    <div className="text-sm font-medium">Shared GWAS Traits:</div>
                    <div className="text-sm text-muted-foreground">
                      {result.crossAnalysis.sharedTraits.map((trait: any) => 
                        `${trait.trait} (${trait.variantCount} variants)`
                      ).join(', ')}
                    </div>
                  </div>
                )}
                
                {result.crossAnalysis.sharedRegulatoryElements && result.crossAnalysis.sharedRegulatoryElements.length > 0 && (
                  <div>
                    <div className="text-sm font-medium">Shared Regulatory Elements:</div>
                    <div className="text-sm text-muted-foreground">
                      {result.crossAnalysis.sharedRegulatoryElements.map((elem: any) => 
                        `${elem.type} (${elem.variantCount} variants)`
                      ).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          <Separator />
          
          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Analysis Level: {result.aggregationLevel}</div>
            <div>Data Sources: {result.dataSources?.join(', ')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default fallback for other tool results
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tool Result: {toolName}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}