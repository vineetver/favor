'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FunctionalScoresHeatmap } from './FunctionalScoresHeatmap';
import { SimpleHeatmap } from './SimpleHeatmap';

interface VariantVisualizationProps {
  visualizationData: any;
  type: string;
  chartOptions?: {
    width?: number;
    height?: number;
    colorScheme?: string;
    showLegend?: boolean;
  };
}

const COLORS = {
  primary: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  secondary: ['#93C5FD', '#FCA5A5', '#86EFAC', '#FDE68A', '#C4B5FD', '#F9A8D4'],
  heatmap: ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#92400E', '#451A03']
};

export function VariantVisualizationRenderer({ 
  visualizationData, 
  type, 
  chartOptions = {} 
}: VariantVisualizationProps) {
  const { width = 800, height = 400, showLegend = true } = chartOptions;

  // Handle errors in visualization data
  if (visualizationData?.error) {
    return (
      <Alert className="w-full">
        <AlertDescription>
          <strong>Visualization Error:</strong> {visualizationData.error}
          {visualizationData.suggestion && (
            <div className="mt-2 text-sm text-muted-foreground">
              <strong>Suggestion:</strong> {visualizationData.suggestion}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const renderChart = useMemo(() => {
    switch (type) {
      case 'population_frequencies':
        return renderPopulationFrequencyChart();
      
      case 'functional_scores_heatmap':
        return renderFunctionalScoresHeatmap();
      
      case 'gwas_manhattan':
        return renderGWASManhattanPlot();
      
      case 'regulatory_landscape':
        return renderRegulatoryLandscape();
      
      case 'cross_variant_comparison':
        return renderCrossVariantComparison();
      
      case 'tissue_expression':
        return renderTissueExpression();
      
      default:
        return (
          <Alert>
            <AlertDescription>
              Unsupported visualization type: {type}
            </AlertDescription>
          </Alert>
        );
    }
  }, [visualizationData, type, width, height, showLegend]);

  function renderPopulationFrequencyChart() {
    if (!visualizationData.datasets || visualizationData.datasets.length === 0) {
      return (
        <Alert>
          <AlertDescription>No population frequency data available</AlertDescription>
        </Alert>
      );
    }

    // Transform data for better spacing - group by ancestry, then by dataset
    const chartData = visualizationData.labels.map((ancestry: string, index: number) => ({
      ancestry,
      ...visualizationData.datasets.reduce((acc: any, dataset: any) => ({
        ...acc,
        [dataset.label]: dataset.data[index] || 0
      }), {})
    }));

    // Calculate better height based on data size
    const dynamicHeight = Math.max(400, chartData.length * 60);

    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4">Population Frequencies by Ancestry</h3>
        <div className="text-sm text-muted-foreground mb-4">
          Showing allele frequencies across {visualizationData.labels.length} ancestries
        </div>
        
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 40, bottom: 80 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="ancestry" 
              tick={{ fontSize: 12, fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              label={{ 
                value: 'Allele Frequency', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#666' }
              }}
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={(value) => value.toExponential(1)}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                value.toFixed(4) + ` (${value.toExponential(2)})`, 
                name.replace('rs7412 ', '').replace('(', '').replace(')', '')
              ]}
              labelFormatter={(label) => `Ancestry: ${label}`}
              contentStyle={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            {showLegend && (
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
            )}
            {visualizationData.datasets.map((dataset: any, index: number) => (
              <Bar 
                key={dataset.label} 
                dataKey={dataset.label} 
                fill={COLORS.primary[index % COLORS.primary.length]}
                name={dataset.label.replace('rs7412 ', '')}
                radius={[2, 2, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        
        {/* Data summary table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm border rounded-lg">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-medium">Ancestry</th>
                {visualizationData.datasets.map((dataset: any) => (
                  <th key={dataset.label} className="px-3 py-2 text-right font-medium">
                    {dataset.label.replace('rs7412 ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row: any, index: number) => (
                <tr key={row.ancestry} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium">{row.ancestry}</td>
                  {visualizationData.datasets.map((dataset: any) => (
                    <td key={dataset.label} className="px-3 py-2 text-right font-mono text-xs">
                      {(row[dataset.label] || 0).toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderFunctionalScoresHeatmap() {
    if (!visualizationData.data || visualizationData.data.length === 0) {
      return (
        <Alert>
          <AlertDescription>
            No functional scores data available for heatmap
            {visualizationData.suggestion && (
              <div className="mt-2 text-sm">{visualizationData.suggestion}</div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    // Use the simple heatmap component (better for web display)
    return (
      <SimpleHeatmap
        data={visualizationData.data}
        title="Functional Scores Heatmap"
        metadata={visualizationData.metadata}
      />
    );
  }

  function renderGWASManhattanPlot() {
    if (!visualizationData.data || visualizationData.data.length === 0) {
      return (
        <Alert>
          <AlertDescription>No GWAS data available for Manhattan plot</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4">GWAS Manhattan Plot</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart data={visualizationData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="trait" 
              type="category"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              dataKey="logP" 
              type="number"
              label={{ value: '-log10(p-value)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                name === 'logP' ? value.toFixed(2) : value,
                name === 'logP' ? '-log10(p-value)' : name
              ]}
              labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return data ? `${data.trait} (${data.mappedGene})` : label;
              }}
            />
            <Scatter 
              dataKey="logP" 
              fill={COLORS.primary[0]}
              name="GWAS Association"
            />
            {visualizationData.significance_line && (
              <Line 
                dataKey={() => visualizationData.significance_line}
                stroke="#EF4444"
                strokeDasharray="5 5"
                name="Significance Threshold"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  function renderRegulatoryLandscape() {
    if (!visualizationData.data || visualizationData.data.length === 0) {
      return (
        <Alert>
          <AlertDescription>No regulatory landscape data available</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4">Regulatory Landscape</h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={visualizationData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annotation" angle={-45} textAnchor="end" height={100} />
            <YAxis label={{ value: 'Element Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            {showLegend && <Legend />}
            <Bar dataKey="count" fill={COLORS.primary[2]} name="Regulatory Elements" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  function renderCrossVariantComparison() {
    if (!visualizationData.variants || visualizationData.variants.length === 0) {
      return (
        <Alert>
          <AlertDescription>No cross-variant comparison data available</AlertDescription>
        </Alert>
      );
    }

    const metrics = Object.keys(visualizationData.metrics);
    
    return (
      <div className="w-full space-y-6">
        <h3 className="text-lg font-semibold">Cross-Variant Comparison</h3>
        {metrics.map((metric, metricIndex) => (
          <div key={metric}>
            <h4 className="text-md font-medium mb-2 capitalize">
              {metric.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visualizationData.metrics[metric]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill={COLORS.primary[metricIndex % COLORS.primary.length]}
                  name={metric}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    );
  }

  function renderTissueExpression() {
    if (!visualizationData.data || visualizationData.data.length === 0) {
      return (
        <Alert>
          <AlertDescription>No tissue expression data available</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4">Tissue-Specific Expression</h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={visualizationData.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tissue" angle={-45} textAnchor="end" height={100} />
            <YAxis label={{ value: 'Expression Score', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                value.toFixed(3),
                'Expression Score'
              ]}
              labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return data ? `${data.tissue} (${data.variant})` : label;
              }}
            />
            {showLegend && <Legend />}
            <Bar dataKey="score" fill={COLORS.primary[4]} name="Expression Score">
              {visualizationData.data.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS.primary[index % COLORS.primary.length]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full p-4 border rounded-lg bg-card">
      {renderChart}
    </div>
  );
}

// Export a hook for easy integration
export function useVariantVisualization(visualizationResult: any) {
  return useMemo(() => {
    if (!visualizationResult || visualizationResult.error) {
      return {
        hasError: true,
        error: visualizationResult?.error,
        component: null
      };
    }

    const { type, visualizationData, chartOptions } = visualizationResult;
    
    return {
      hasError: false,
      error: null,
      component: (
        <VariantVisualizationRenderer
          visualizationData={visualizationData}
          type={type}
          chartOptions={chartOptions}
        />
      )
    };
  }, [visualizationResult]);
}