import { z } from 'zod';
import { tool } from 'ai';

export function analyzeDataDistribution() {
  return tool({
    description: 'Analyze statistical distribution of numeric data',
    inputSchema: z.object({
      data: z.array(z.number()).describe('Array of numeric values'),
      fieldName: z.string().describe('Name of the data field being analyzed')
    }),
    execute: async ({ data, fieldName }) => {
      if (data.length === 0) {
        return { error: 'No data provided for analysis' };
      }

      const sorted = [...data].sort((a, b) => a - b);
      const n = data.length;
      const sum = data.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      
      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const medianIndex = Math.floor(n * 0.5);
      
      return {
        field: fieldName,
        statistics: {
          count: n,
          mean: Math.round(mean * 1000) / 1000,
          median: sorted[medianIndex],
          min: sorted[0],
          max: sorted[n - 1],
          q1: sorted[q1Index],
          q3: sorted[q3Index],
          standardDeviation: Math.round(stdDev * 1000) / 1000,
          variance: Math.round(variance * 1000) / 1000
        },
        metadata: {
          dataType: 'statistical_analysis',
          analysisType: 'distribution'
        }
      };
    }
  });
}

export function filterAndSortData() {
  return tool({
    description: 'Filter and sort data based on specified criteria',
    inputSchema: z.object({
      data: z.array(z.record(z.unknown())).describe('Array of data objects'),
      filters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
        value: z.unknown()
      })).optional().describe('Filter criteria'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results to return')
    }),
    execute: async ({ data, filters = [], sortBy, sortOrder = 'asc', limit }) => {
      let result = [...data];
      
      // Apply filters
      for (const filter of filters) {
        result = result.filter(item => {
          const value = item[filter.field];
          switch (filter.operator) {
            case 'eq': return value === filter.value;
            case 'ne': return value !== filter.value;
            case 'gt': return (value as number) > (filter.value as number);
            case 'gte': return (value as number) >= (filter.value as number);
            case 'lt': return (value as number) < (filter.value as number);
            case 'lte': return (value as number) <= (filter.value as number);
            case 'contains': return String(value).includes(String(filter.value));
            case 'startsWith': return String(value).startsWith(String(filter.value));
            case 'endsWith': return String(value).endsWith(String(filter.value));
            default: return true;
          }
        });
      }
      
      // Apply sorting
      if (sortBy) {
        result.sort((a, b) => {
          const aVal = a[sortBy] as any;
          const bVal = b[sortBy] as any;
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }
      
      // Apply limit
      if (limit && limit > 0) {
        result = result.slice(0, limit);
      }
      
      return {
        data: result,
        metadata: {
          originalCount: data.length,
          filteredCount: result.length,
          filtersApplied: filters.length,
          sortedBy: sortBy,
          sortOrder,
          limit
        }
      };
    }
  });
}

export function aggregateData() {
  return tool({
    description: 'Aggregate data by grouping and applying statistical functions',
    inputSchema: z.object({
      data: z.array(z.record(z.unknown())).describe('Array of data objects'),
      groupBy: z.string().describe('Field to group by'),
      aggregations: z.array(z.object({
        field: z.string(),
        function: z.enum(['count', 'sum', 'avg', 'min', 'max', 'median']),
        alias: z.string().optional()
      })).describe('Aggregation functions to apply')
    }),
    execute: async ({ data, groupBy, aggregations }) => {
      const groups = data.reduce((acc, item) => {
        const key = String((item as any)[groupBy]);
        if (!acc[key]) acc[key] = [];
        (acc[key] as any[]).push(item);
        return acc;
      }, {} as Record<string, any[]>);
      
      const result = Object.entries(groups).map(([key, items]) => {
        const aggregated: any = { [groupBy]: key };
        
        for (const agg of aggregations) {
          const alias = agg.alias || `${agg.function}_${agg.field}`;
          const values = (items as any[]).map((item: any) => item[agg.field]).filter((v: any) => v != null);
          
          switch (agg.function) {
            case 'count':
              aggregated[alias] = (items as any[]).length;
              break;
            case 'sum':
              aggregated[alias] = values.reduce((a: any, b: any) => a + b, 0);
              break;
            case 'avg':
              aggregated[alias] = values.length > 0 ? values.reduce((a: any, b: any) => a + b, 0) / values.length : 0;
              break;
            case 'min':
              aggregated[alias] = values.length > 0 ? Math.min(...values) : null;
              break;
            case 'max':
              aggregated[alias] = values.length > 0 ? Math.max(...values) : null;
              break;
            case 'median':
              if (values.length > 0) {
                const sorted = values.sort((a: any, b: any) => a - b);
                const mid = Math.floor(sorted.length / 2);
                aggregated[alias] = sorted.length % 2 === 0 
                  ? (sorted[mid - 1] + sorted[mid]) / 2 
                  : sorted[mid];
              } else {
                aggregated[alias] = null;
              }
              break;
          }
        }
        
        return aggregated;
      });
      
      return {
        data: result,
        metadata: {
          originalCount: data.length,
          groupCount: Object.keys(groups).length,
          groupBy,
          aggregations: aggregations.map(a => `${a.function}(${a.field})`)
        }
      };
    }
  });
}

export function calculateCorrelation() {
  return tool({
    description: 'Calculate correlation between two numeric fields',
    inputSchema: z.object({
      data: z.array(z.record(z.unknown())).describe('Array of data objects'),
      field1: z.string().describe('First numeric field'),
      field2: z.string().describe('Second numeric field'),
      method: z.enum(['pearson', 'spearman']).optional().describe('Correlation method')
    }),
    execute: async ({ data, field1, field2, method = 'pearson' }) => {
      const pairs = data
        .map(item => [item[field1], item[field2]])
        .filter(([x, y]) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y));
      
      if (pairs.length < 2) {
        return { error: 'Insufficient valid data points for correlation analysis' };
      }
      
      let correlation: number;
      
      if (method === 'pearson') {
        const n = pairs.length;
        const sumX = pairs.reduce((sum, [x]) => sum + (x as number), 0);
        const sumY = pairs.reduce((sum, [, y]) => sum + (y as number), 0);
        const sumXY = pairs.reduce((sum, [x, y]) => sum + (x as number) * (y as number), 0);
        const sumX2 = pairs.reduce((sum, [x]) => sum + (x as number) * (x as number), 0);
        const sumY2 = pairs.reduce((sum, [, y]) => sum + (y as number) * (y as number), 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        correlation = denominator === 0 ? 0 : numerator / denominator;
      } else {
        // Spearman rank correlation (simplified)
        const ranks1 = pairs.map(([x]) => x as number).sort((a, b) => a - b);
        const ranks2 = pairs.map(([, y]) => y as number).sort((a, b) => a - b);
        
        const rankedPairs = pairs.map(([x, y]) => [
          ranks1.indexOf(x as number) + 1,
          ranks2.indexOf(y as number) + 1
        ]);
        
        const n = rankedPairs.length;
        const sumD2 = rankedPairs.reduce((sum, [r1, r2]) => sum + Math.pow(r1 - r2, 2), 0);
        correlation = 1 - (6 * sumD2) / (n * (n * n - 1));
      }
      
      return {
        correlation: Math.round(correlation * 1000) / 1000,
        method,
        sampleSize: pairs.length,
        fields: [field1, field2],
        interpretation: {
          strength: Math.abs(correlation) >= 0.7 ? 'strong' : 
                   Math.abs(correlation) >= 0.3 ? 'moderate' : 'weak',
          direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none'
        },
        metadata: {
          dataType: 'correlation_analysis',
          method
        }
      };
    }
  });
}

export function generateDataSummary() {
  return tool({
    description: 'Generate a comprehensive summary of a dataset',
    inputSchema: z.object({
      data: z.array(z.record(z.unknown())).describe('Array of data objects'),
      title: z.string().optional().describe('Title for the summary')
    }),
    execute: async ({ data, title = 'Data Summary' }) => {
      if (data.length === 0) {
        return { error: 'No data provided for summary' };
      }
      
      const fields = Object.keys(data[0] || {});
      const summary: any = {
        title,
        recordCount: data.length,
        fields: {},
        overview: {}
      };
      
      for (const field of fields) {
        const values = data.map(item => item[field]).filter(v => v != null);
        const nonNullCount = values.length;
        const nullCount = data.length - nonNullCount;
        
        const fieldSummary: any = {
          nonNullCount,
          nullCount,
          nullPercentage: Math.round((nullCount / data.length) * 100)
        };
        
        if (values.length > 0) {
          const sampleValue = values[0];
          const dataType = typeof sampleValue;
          fieldSummary.dataType = dataType;
          
          if (dataType === 'number') {
            const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
            if (numericValues.length > 0) {
              const sorted = [...numericValues].sort((a: number, b: number) => a - b);
              const sum = numericValues.reduce((a: number, b: number) => a + b, 0);
              fieldSummary.statistics = {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: Math.round((sum / numericValues.length) * 100) / 100,
                median: sorted[Math.floor(sorted.length / 2)]
              };
            }
          } else if (dataType === 'string') {
            const uniqueValues = Array.from(new Set(values));
            fieldSummary.uniqueCount = uniqueValues.length;
            fieldSummary.samples = uniqueValues.slice(0, 5);
          }
        }
        
        summary.fields[field] = fieldSummary;
      }
      
      // Overview statistics
      summary.overview = {
        totalFields: fields.length,
        numericFields: Object.values(summary.fields).filter((f: any) => f.dataType === 'number').length,
        textFields: Object.values(summary.fields).filter((f: any) => f.dataType === 'string').length,
        completenessScore: Math.round(
          (Object.values(summary.fields).reduce((sum: number, f: any) => sum + f.nonNullCount, 0) / 
           (data.length * fields.length)) * 100
        )
      };
      
      return {
        ...summary,
        metadata: {
          dataType: 'data_summary',
          generatedAt: new Date().toISOString()
        }
      };
    }
  });
}

export function performEnrichmentAnalysis() {
  return tool({
    description: 'Perform pathway/functional enrichment analysis on gene lists',
    inputSchema: z.object({
      genes: z.array(z.string()).describe('List of gene names'),
      background: z.array(z.string()).optional().describe('Background gene set'),
      categories: z.array(z.string()).optional().describe('Functional categories to test'),
      pThreshold: z.number().optional().describe('P-value threshold for significance')
    }),
    execute: async ({ genes, background, categories = ['pathway', 'go_bp', 'go_mf'], pThreshold = 0.05 }) => {
      // This is a placeholder implementation
      // In a real system, you would integrate with pathway databases
      const mockResults = categories.map(category => ({
        category,
        enrichedTerms: [
          {
            term: `Mock ${category} term 1`,
            pValue: 0.001,
            geneCount: Math.floor(genes.length * 0.3),
            totalGenes: genes.length,
            genes: genes.slice(0, Math.floor(genes.length * 0.3))
          },
          {
            term: `Mock ${category} term 2`,
            pValue: 0.01,
            geneCount: Math.floor(genes.length * 0.2),
            totalGenes: genes.length,
            genes: genes.slice(0, Math.floor(genes.length * 0.2))
          }
        ].filter(term => term.pValue <= pThreshold)
      }));
      
      return {
        input: {
          geneCount: genes.length,
          backgroundCount: background?.length || 20000,
          categories,
          pThreshold
        },
        results: mockResults,
        metadata: {
          dataType: 'enrichment_analysis',
          note: 'This is a mock implementation. Integrate with real pathway databases for production use.'
        }
      };
    }
  });
}