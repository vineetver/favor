/**
 * Transform chart data from tool outputs to component format
 */

export type ChartType = 'scatter' | 'bar' | 'line' | 'heatmap' | 'network' | 'manhattan' | 'volcano' | 'area' | 'pie';

/**
 * Transform data based on chart type
 */
export function transformChartData(data: any, chartType: ChartType): any[] {
  if (!data) return [];

  try {
    switch (chartType) {
      case 'bar':
        return transformBarData(data);
      case 'line':
      case 'area':
        return transformLineAreaData(data);
      case 'scatter':
      case 'manhattan':
        return transformScatterData(data);
      case 'heatmap':
        return transformHeatmapData(data);
      case 'pie':
        return transformPieData(data);
      case 'network':
        return transformNetworkData(data);
      case 'volcano':
        return transformVolcanoData(data);
      default:
        return Array.isArray(data) ? data : [data];
    }
  } catch (error) {
    console.warn(`Error transforming ${chartType} data:`, error);
    return Array.isArray(data) ? data : [data];
  }
}

/**
 * Transform data for bar charts
 */
function transformBarData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: item.name || item.label || item.category || `Item ${index + 1}`,
          value: item.value || item.count || item.frequency || 0,
          ...item
        };
      }
      return { name: `Item ${index + 1}`, value: item };
    });
  }

  // Handle xLabels + multiple yValues structure (gnomAD format)
  if (data.xLabels && Array.isArray(data.xLabels)) {
    const result: any[] = [];
    data.xLabels.forEach((label: string, index: number) => {
      const item: any = { name: label };
      
      // Find all yValues properties
      Object.keys(data).forEach(key => {
        if (key.startsWith('yValues_') && Array.isArray(data[key])) {
          const seriesName = key.replace('yValues_', '');
          item[seriesName] = data[key][index] || 0;
        }
      });
      
      result.push(item);
    });
    return result;
  }

  // Handle population frequency data structure
  if (data.datasets && data.labels) {
    const result: any[] = [];
    data.labels.forEach((label: string, index: number) => {
      const item: any = { name: label };
      data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const key = dataset.label || `Dataset ${datasetIndex + 1}`;
        item[key] = dataset.data[index] || 0;
      });
      result.push(item);
    });
    return result;
  }

  // Handle object with keys as categories
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      value: typeof value === 'number' ? value : 0
    }));
  }

  return [{ name: 'Data', value: data }];
}

/**
 * Transform data for line and area charts
 */
function transformLineAreaData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: item.x || item.name || item.label || index,
          value: item.y || item.value || 0,
          ...item
        };
      }
      return { name: index, value: item };
    });
  }

  // Handle xLabels + multiple yValues structure (same as bar chart)
  if (data.xLabels && Array.isArray(data.xLabels)) {
    const result: any[] = [];
    data.xLabels.forEach((label: string, index: number) => {
      const item: any = { name: label };
      
      // Find all yValues properties
      Object.keys(data).forEach(key => {
        if (key.startsWith('yValues_') && Array.isArray(data[key])) {
          const seriesName = key.replace('yValues_', '');
          item[seriesName] = data[key][index] || 0;
        }
      });
      
      result.push(item);
    });
    return result;
  }

  return transformBarData(data);
}

/**
 * Transform data for scatter plots and manhattan plots
 */
function transformScatterData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          x: item.x || item.position || index,
          y: item.y || item.value || item.score || 0,
          size: item.size || 4,
          color: item.color || item.category,
          label: item.label || item.name,
          ...item
        };
      }
      return { x: index, y: item, size: 4 };
    });
  }

  // Handle xLabels + multiple yValues structure 
  if (data.xLabels && Array.isArray(data.xLabels)) {
    const result: any[] = [];
    data.xLabels.forEach((label: string, index: number) => {
      // Create separate points for each yValues series
      Object.keys(data).forEach(key => {
        if (key.startsWith('yValues_') && Array.isArray(data[key])) {
          const seriesName = key.replace('yValues_', '');
          result.push({
            x: index,
            y: data[key][index] || 0,
            label: label,
            series: seriesName,
            size: 4
          });
        }
      });
    });
    return result;
  }

  // Handle manhattan plot data
  if (data.data && Array.isArray(data.data)) {
    return data.data.map((item: any) => ({
      x: item.position || item.trait,
      y: item.logP || -Math.log10(item.pValue || 0.1),
      chromosome: item.chromosome,
      trait: item.trait,
      pValue: item.pValue,
      mappedGene: item.mappedGene,
      ...item
    }));
  }

  return [{ x: 0, y: data, size: 4 }];
}

/**
 * Transform data for heatmap
 */
function transformHeatmapData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          x: item.x || item.variant || item.xAxis,
          y: item.y || item.scoreType || item.yAxis, 
          value: item.value || item.score || 0,
          ...item
        };
      }
      return { x: 'X', y: index, value: item };
    });
  }

  // Handle xLabels + multiple yValues structure (create heatmap cells)
  if (data.xLabels && Array.isArray(data.xLabels)) {
    const result: any[] = [];
    
    // Get all yValues series
    const yValueKeys = Object.keys(data).filter(key => key.startsWith('yValues_'));
    
    data.xLabels.forEach((xLabel: string, xIndex: number) => {
      yValueKeys.forEach((yKey, yIndex) => {
        const yLabel = yKey.replace('yValues_', '');
        const value = data[yKey][xIndex] || 0;
        
        result.push({
          x: xLabel,
          y: yLabel,
          value: value
        });
      });
    });
    
    return result;
  }

  return [{ x: 'X', y: 'Y', value: data }];
}

/**
 * Transform data for pie charts
 */
function transformPieData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: item.name || item.label || `Slice ${index + 1}`,
          value: item.value || item.count || 0,
          ...item
        };
      }
      return { name: `Slice ${index + 1}`, value: item };
    });
  }

  // Handle xLabels + single yValues structure (take first yValues series for pie chart)
  if (data.xLabels && Array.isArray(data.xLabels)) {
    const result: any[] = [];
    const firstYValuesKey = Object.keys(data).find(key => key.startsWith('yValues_'));
    
    if (firstYValuesKey && Array.isArray(data[firstYValuesKey])) {
      data.xLabels.forEach((label: string, index: number) => {
        result.push({
          name: label,
          value: data[firstYValuesKey][index] || 0
        });
      });
      return result;
    }
  }

  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      value: typeof value === 'number' ? value : 0
    }));
  }

  return [{ name: 'Data', value: data }];
}

/**
 * Transform data for network graphs
 */
function transformNetworkData(data: any): any {
  // Network data typically has nodes and edges
  if (data.nodes && data.edges) {
    return {
      nodes: data.nodes.map((node: any) => ({
        id: node.id || node.name,
        label: node.label || node.name,
        size: node.size || 10,
        color: node.color || '#1f77b4',
        ...node
      })),
      edges: data.edges.map((edge: any) => ({
        source: edge.source || edge.from,
        target: edge.target || edge.to,
        weight: edge.weight || edge.value || 1,
        ...edge
      }))
    };
  }

  return data;
}

/**
 * Transform data for volcano plots  
 */
function transformVolcanoData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      x: item.logFC || item.foldChange || 0,
      y: item.logP || -Math.log10(item.pvalue || 0.1),
      gene: item.gene || item.name,
      significant: item.significant || false,
      pvalue: item.pvalue,
      foldChange: item.logFC || item.foldChange,
      ...item
    }));
  }

  return data.data || [];
}

/**
 * Validate if data can be rendered as a chart
 */
export function validateChartData(data: any, chartType: ChartType): boolean {
  if (!data) return false;

  try {
    const transformed = transformChartData(data, chartType);
    return Array.isArray(transformed) && transformed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get chart data statistics
 */
export function getChartDataStats(data: any, chartType: ChartType): any {
  const transformed = transformChartData(data, chartType);
  
  if (!Array.isArray(transformed)) {
    return { dataPoints: 0 };
  }

  return {
    dataPoints: transformed.length,
    hasValidData: transformed.length > 0,
    fields: transformed.length > 0 ? Object.keys(transformed[0]) : [],
    chartType
  };
}