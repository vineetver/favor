'use client';

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HeatmapData {
  variant: string;
  scoreType: string;
  score: number;
  category?: string;
  dataset?: string;
}

interface FunctionalScoresHeatmapProps {
  data: HeatmapData[];
  width?: number;
  height?: number;
  title?: string;
  metadata?: {
    totalScores?: number;
    variants?: string[];
    scoreTypes?: string[];
  };
}

// Color scales for different score ranges
const getColorScale = (value: number, min: number, max: number, scoreType: string) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '#f3f4f6'; // Gray for missing data
  }

  const normalized = (value - min) / (max - min);
  
  // Different color schemes for different score types
  if (scoreType.includes('cadd') || scoreType.includes('revel')) {
    // Red scale for deleteriousness scores (higher = more deleterious)
    const intensity = Math.floor(normalized * 255);
    return `rgb(${255}, ${255 - intensity}, ${255 - intensity})`;
  } else if (scoreType.includes('scent')) {
    // Blue scale for SCENT scores
    const intensity = Math.floor(normalized * 255);
    return `rgb(${255 - intensity}, ${255 - intensity}, ${255})`;
  } else if (scoreType.includes('cv2f')) {
    // Green scale for CV2F conservation scores
    const intensity = Math.floor(normalized * 255);
    return `rgb(${255 - intensity}, ${255}, ${255 - intensity})`;
  } else {
    // Default purple scale
    const intensity = Math.floor(normalized * 255);
    return `rgb(${255 - intensity}, ${255 - intensity}, ${255})`;
  }
};

export function FunctionalScoresHeatmap({ 
  data, 
  width = 800, 
  height = 400, 
  title = "Functional Scores Heatmap",
  metadata 
}: FunctionalScoresHeatmapProps) {
  
  const heatmapConfig = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // Get unique variants and score types
    const variants = Array.from(new Set(data.map(d => d.variant)));
    const scoreTypes = Array.from(new Set(data.map(d => d.scoreType)));
    
    // Create matrix
    const matrix: Array<Array<{value: number | null, scoreType: string, variant: string}>> = [];
    
    variants.forEach(variant => {
      const row: Array<{value: number | null, scoreType: string, variant: string}> = [];
      scoreTypes.forEach(scoreType => {
        const dataPoint = data.find(d => d.variant === variant && d.scoreType === scoreType);
        row.push({
          value: dataPoint?.score ?? null,
          scoreType,
          variant
        });
      });
      matrix.push(row);
    });

    // Calculate min/max for color scaling
    const allValues = data.map(d => d.score).filter(v => v !== null && !isNaN(v));
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    return {
      variants,
      scoreTypes,
      matrix,
      minValue,
      maxValue
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No functional scores data available for heatmap visualization.
        </AlertDescription>
      </Alert>
    );
  }

  if (!heatmapConfig) {
    return (
      <Alert>
        <AlertDescription>
          Unable to process heatmap data. Please check the data format.
        </AlertDescription>
      </Alert>
    );
  }

  const { variants, scoreTypes, matrix, minValue, maxValue } = heatmapConfig;
  
  // Calculate cell dimensions
  const cellWidth = Math.max(60, (width - 200) / scoreTypes.length); // Leave space for labels
  const cellHeight = Math.max(40, (height - 100) / variants.length);
  
  const chartWidth = cellWidth * scoreTypes.length + 200;
  const chartHeight = cellHeight * variants.length + 100;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {metadata?.totalScores && (
          <div className="text-sm text-muted-foreground">
            {metadata.totalScores} scores across {variants.length} variants
          </div>
        )}
      </div>
      
      <div className="overflow-auto border rounded-lg bg-white p-4">
        <svg width={chartWidth} height={chartHeight} className="font-mono">
          {/* Column headers (score types) */}
          {scoreTypes.map((scoreType, colIndex) => (
            <g key={`header-${scoreType}`}>
              <text
                x={150 + colIndex * cellWidth + cellWidth / 2}
                y={30}
                textAnchor="middle"
                className="fill-gray-700 text-xs font-medium"
                transform={`rotate(-45, ${150 + colIndex * cellWidth + cellWidth / 2}, 30)`}
              >
                {scoreType.replace('_', ' ').toUpperCase()}
              </text>
            </g>
          ))}

          {/* Row headers (variants) */}
          {variants.map((variant, rowIndex) => (
            <text
              key={`variant-${variant}`}
              x={140}
              y={70 + rowIndex * cellHeight + cellHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-gray-700 text-xs font-medium"
            >
              {variant}
            </text>
          ))}

          {/* Heatmap cells */}
          {matrix.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const x = 150 + colIndex * cellWidth;
              const y = 50 + rowIndex * cellHeight;
              const color = getColorScale(cell.value || 0, minValue, maxValue, cell.scoreType);
              
              return (
                <g key={`cell-${rowIndex}-${colIndex}`}>
                  {/* Cell background */}
                  <rect
                    x={x}
                    y={y}
                    width={cellWidth - 2}
                    height={cellHeight - 2}
                    fill={color}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    rx={2}
                  />
                  
                  {/* Cell value text */}
                  {cell.value !== null && (
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-800 text-xs font-medium"
                    >
                      {cell.value.toFixed(2)}
                    </text>
                  )}
                  
                  {/* Missing data indicator */}
                  {cell.value === null && (
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-400 text-xs"
                    >
                      N/A
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-200 border rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-600 border rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-200 border rounded"></div>
            <span>No Data</span>
          </div>
        </div>
        <div>
          Range: {minValue.toFixed(3)} - {maxValue.toFixed(3)}
        </div>
      </div>
      
      {/* Score type explanations */}
      <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
        <div><strong>Score Types:</strong></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {scoreTypes.includes('cadd') && <div>• CADD: Combined Annotation Dependent Depletion</div>}
          {scoreTypes.includes('revel') && <div>• REVEL: Rare Exome Variant Ensemble Learner</div>}
          {scoreTypes.includes('spliceai') && <div>• SpliceAI: Deep learning splice prediction</div>}
          {scoreTypes.includes('scent_max') && <div>• SCENT: Single-cell expression prediction</div>}
          {scoreTypes.includes('cv2f_avg') && <div>• CV2F: Conservation prediction across tissues</div>}
          {scoreTypes.includes('pgboost') && <div>• PGBoost: Ensemble prediction score</div>}
        </div>
      </div>
    </div>
  );
}

// Enhanced version that can handle tooltip interactions
export function InteractiveFunctionalScoresHeatmap({ 
  data, 
  width = 800, 
  height = 400, 
  title = "Functional Scores Heatmap",
  metadata 
}: FunctionalScoresHeatmapProps) {
  
  // This would use a more sophisticated charting library like D3 or a React wrapper
  // For now, let's use the basic version but add hover states with CSS
  
  return (
    <div className="relative">
      <FunctionalScoresHeatmap 
        data={data} 
        width={width} 
        height={height} 
        title={title}
        metadata={metadata}
      />
      
      <style jsx>{`
        .heatmap-cell {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .heatmap-cell:hover {
          stroke: #374151;
          stroke-width: 2;
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}