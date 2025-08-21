'use client';

import { BarChart } from '@/components/ui/charts/bar-chart';
import { ScatterChart } from '@/components/ui/charts/scatter-chart';

interface ChartRendererProps {
  type: 'chart';
  chartType: string;
  data: any;
  config: any;
  metadata?: any;
}

export function ChartRenderer({ chartType, data, config, metadata }: ChartRendererProps) {
  // Debug logging
  console.log('ChartRenderer received:', { chartType, data, config, metadata });
  
  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        // Transform data to ensure it has the right structure
        const barData = data.map((item: any) => ({
          name: item.category || item.name,
          value: item.value
        }));
        
        return (
          <BarChart
            data={barData}
            keys={['value']}
            indexBy="name"
            title={config.title}
            xLabel={config.xLabel}
            yLabel={config.yLabel}
            width={config.width}
            height={config.height || 400}
            className="w-full"
          />
        );
      
      case 'scatter':
        return (
          <ScatterChart
            data={data}
            xDataKey="x"
            yDataKey="y"
            title={config.title}
            xLabel={config.xLabel}
            yLabel={config.yLabel}
            width={config.width}
            height={config.height || 400}
            className="w-full"
          />
        );
      
      case 'line':
        // For now, render as scatter plot with lines
        return (
          <div className="p-4 border rounded bg-muted/10">
            <h4 className="font-medium mb-2">{config.title}</h4>
            <p className="text-sm text-muted-foreground">
              Line chart visualization coming soon. Data points: {data.length}
            </p>
            <pre className="text-xs mt-2 bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(data.slice(0, 3), null, 2)}
              {data.length > 3 && `\n... and ${data.length - 3} more items`}
            </pre>
          </div>
        );
      
      case 'heatmap':
        return (
          <div className="p-4 border rounded bg-muted/10">
            <h4 className="font-medium mb-2">{config.title}</h4>
            <p className="text-sm text-muted-foreground">
              Heatmap visualization coming soon. Dimensions: {metadata?.dimensions?.join(' x ') || 'Unknown'}
            </p>
          </div>
        );
      
      case 'network':
        return (
          <div className="p-4 border rounded bg-muted/10">
            <h4 className="font-medium mb-2">{config.title}</h4>
            <p className="text-sm text-muted-foreground">
              Network graph visualization coming soon. 
              Nodes: {metadata?.nodeCount}, Edges: {metadata?.edgeCount}
            </p>
          </div>
        );
      
      case 'manhattan':
        return (
          <div className="p-4 border rounded bg-muted/10">
            <h4 className="font-medium mb-2">{config.title}</h4>
            <p className="text-sm text-muted-foreground">
              Manhattan plot visualization coming soon. 
              Data points: {metadata?.dataPoints}, Chromosomes: {metadata?.chromosomes?.length}
            </p>
            <div className="mt-2 text-xs">
              Significance threshold: {config.significanceThreshold}
            </div>
          </div>
        );
      
      case 'volcano':
        return (
          <div className="p-4 border rounded bg-muted/10">
            <h4 className="font-medium mb-2">{config.title}</h4>
            <p className="text-sm text-muted-foreground">
              Volcano plot visualization coming soon. 
              Genes: {metadata?.geneCount}, Significant: {metadata?.significantGenes}
            </p>
            <div className="mt-2 text-xs">
              FC threshold: {config.fcThreshold}, P threshold: {config.pThreshold}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
            <h4 className="font-medium mb-2">Unknown Chart Type: {chartType}</h4>
            <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify({ data, config, metadata }, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="my-4">
      {renderChart()}
    </div>
  );
}