'use client';

import { BarChart } from '@/components/ui/charts/bar-chart';
import { ScatterChart } from '@/components/ui/charts/scatter-chart';
import { LineChart } from '@/components/ui/charts/line-chart';
import { AreaChart } from '@/components/ui/charts/area-chart';
import { PieChart } from '@/components/ui/charts/pie-chart';
import { Heatmap } from '@/components/ui/charts/heatmap';

interface ChartRendererProps {
  type: 'chart';
  chartType: string;
  data: any;
  config: any;
  metadata?: any;
}

export function ChartRenderer({ chartType, data, config, metadata }: ChartRendererProps) {
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
        const lineData = data.map((item: any) => ({
          name: item.category || item.name || item.x,
          value: item.value || item.y
        }));
        
        return (
          <LineChart
            data={lineData}
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
        const areaData = data.map((item: any) => ({
          name: item.category || item.name || item.x,
          value: item.value || item.y
        }));
        
        return (
          <AreaChart
            data={areaData}
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
        const pieData = data.map((item: any) => ({
          name: item.category || item.name,
          value: item.value
        }));
        
        return (
          <PieChart
            data={pieData}
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
            data={data}
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
    <div className="my-4">
      {renderChart()}
    </div>
  );
}