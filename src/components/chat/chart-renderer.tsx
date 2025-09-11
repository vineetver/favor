'use client';

import { BarChart } from '@/components/ui/charts/bar-chart';
import { ScatterChart } from '@/components/ui/charts/scatter-chart';
import { LineChart } from '@/components/ui/charts/line-chart';
import { AreaChart } from '@/components/ui/charts/area-chart';
import { PieChart } from '@/components/ui/charts/pie-chart';
import { Heatmap } from '@/components/ui/charts/heatmap';
import { transformChartData, validateChartData, getChartDataStats, type ChartType } from '@/lib/utils/chart-data-transforms';

interface ChartRendererProps {
  type: 'chart';
  chartType: string;
  data: any;
  config: any;
  metadata?: any;
}

export function ChartRenderer({ chartType, data, config, metadata }: ChartRendererProps) {
  // Transform data using universal transformer
  const transformedData = transformChartData(data, chartType as ChartType);
  const isValidData = validateChartData(data, chartType as ChartType);
  const dataStats = getChartDataStats(data, chartType as ChartType);

  const renderChart = () => {
    if (!isValidData || !transformedData || transformedData.length === 0) {
      return (
        <div className="p-6 border border-dashed border-muted rounded-lg bg-muted/20">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">No Data Available</h4>
            <p className="text-xs text-muted-foreground">
              Unable to render {chartType} chart with the provided data structure.
            </p>
            <details className="mt-3 text-left">
              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                Debug Information
              </summary>
              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                <div><strong>Data Points:</strong> {dataStats.dataPoints}</div>
                <div><strong>Chart Type:</strong> {chartType}</div>
                <div><strong>Data Structure:</strong> {typeof data}</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        // Extract keys for grouped bars from transformed data
        const firstItem = transformedData[0] || {};
        const allKeys = Object.keys(firstItem).filter(key => key !== 'name' && typeof firstItem[key] === 'number');
        const keys = allKeys.length > 0 ? allKeys : ['value'];
        
        return (
          <BarChart
            data={transformedData}
            keys={keys}
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
            data={transformedData}
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
        return (
          <LineChart
            data={transformedData}
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
      
      case 'area':        
        return (
          <AreaChart
            data={transformedData}
            keys={['value']}
            indexBy="name"
            title={config.title}
            xLabel={config.xLabel}
            yLabel={config.yLabel}
            width={config.width}
            height={config.height || 400}
            className="w-full"
            stacked={config.stacked}
          />
        );
      
      case 'pie':
      case 'donut':        
        return (
          <PieChart
            data={transformedData}
            dataKey="value"
            nameKey="name"
            title={config.title}
            width={config.width}
            height={config.height || 400}
            className="w-full"
            innerRadius={config.chartType === 'donut' ? 60 : 0}
          />
        );
      
      case 'heatmap':
        return (
          <Heatmap
            data={transformedData}
            title={config.title}
            width={config.width}
            height={config.height || 400}
            className="w-full"
            xKey={config.xKey || 'x'}
            yKey={config.yKey || 'y'}
            valueKey={config.valueKey || 'value'}
            colorScheme={config.colorScheme || 'blue'}
          />
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
    <div className="my-4 grid grid-cols-1 gap-4 w-full max-w-full overflow-hidden">
      <div className="w-full overflow-hidden">
        {renderChart()}
      </div>
      
      {/* Debug view for chart data */}
      <details className="mt-2">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          Debug: View Chart Data
        </summary>
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
          <div className="font-mono">
            <div className="mb-1"><strong>Type:</strong> {chartType}</div>
            <div className="mb-1"><strong>Data Points:</strong> {metadata?.dataPoints || (Array.isArray(data) ? data.length : 'N/A')}</div>
            <details>
              <summary className="cursor-pointer">Raw Data</summary>
              <pre className="mt-1 overflow-x-auto">
                {JSON.stringify({ data, config, metadata }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </details>
    </div>
  );
}