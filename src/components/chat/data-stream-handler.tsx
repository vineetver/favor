'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDataStream } from './data-stream-provider';
import { toast } from 'sonner';

// FAVOR-specific data stream types
type FavorStreamType = 
  | 'variant-annotation'
  | 'gene-expression' 
  | 'pathway-analysis'
  | 'interaction-network'
  | 'genomic-region'
  | 'chart-data'
  | 'error'
  | 'status';

interface StreamMetadata {
  timestamp: number;
  sessionId: string;
  streamType: FavorStreamType;
  isComplete: boolean;
}

export function DataStreamHandler() {
  const { dataStream, addDataPoint } = useDataStream();
  const lastProcessedIndex = useRef(-1);
  const processingRef = useRef(false);

  // Process genomics data chunks
  const processGenomicsData = useCallback((delta: any) => {
    try {
      switch (delta.type) {
        case 'variant-annotation':
          // Handle variant annotation data
          if (delta.data?.rsid) {
            addDataPoint({
              type: 'data-variant-annotation',
              data: {
                rsid: delta.data.rsid,
                chromosome: delta.data.chromosome,
                position: delta.data.position,
                refAllele: delta.data.refAllele,
                altAllele: delta.data.altAllele,
                functionalImpact: delta.data.functionalImpact,
              }
            });
          }
          break;

        case 'gene-expression':
          // Handle gene expression data
          if (delta.data?.geneSymbol) {
            addDataPoint({
              type: 'data-gene-expression',
              data: {
                geneSymbol: delta.data.geneSymbol,
                tissueType: delta.data.tissueType,
                expressionLevel: delta.data.expressionLevel,
                pValue: delta.data.pValue,
              }
            });
          }
          break;

        case 'pathway-analysis':
          // Handle pathway analysis data
          if (delta.data?.pathwayId) {
            addDataPoint({
              type: 'data-pathway-analysis',
              data: {
                pathwayId: delta.data.pathwayId,
                pathwayName: delta.data.pathwayName,
                genes: delta.data.genes || [],
                enrichmentScore: delta.data.enrichmentScore,
              }
            });
          }
          break;

        case 'interaction-network':
          // Handle protein interaction data
          if (delta.data?.sourceGene && delta.data?.targetGene) {
            addDataPoint({
              type: 'data-interaction-network',
              data: {
                sourceGene: delta.data.sourceGene,
                targetGene: delta.data.targetGene,
                interactionType: delta.data.interactionType,
                confidence: delta.data.confidence,
              }
            });
          }
          break;

        case 'chart-data':
          // Handle visualization data
          if (delta.data) {
            // This could trigger chart updates in the UI
            console.log('Chart data received:', delta.data);
          }
          break;

        case 'error':
          // Handle FAVOR database errors
          if (delta.data?.message) {
            toast.error(`FAVOR Database: ${delta.data.message}`);
          }
          break;

        case 'status':
          // Handle status updates
          if (delta.data?.status) {
            console.log('FAVOR Status:', delta.data.status);
          }
          break;

        default:
          // Log unknown data types for debugging
          console.log('Unknown data stream type:', delta.type, delta.data);
      }
    } catch (error) {
      console.error('Error processing genomics data:', error);
      toast.error('Error processing genomics data');
    }
  }, [addDataPoint]);

  // Handle database query results
  const handleDatabaseResults = useCallback((delta: any) => {
    if (delta.type === 'database-result') {
      const { resultType, data } = delta.data || {};
      
      switch (resultType) {
        case 'variant-search':
          // Process variant search results
          if (data?.variants) {
            data.variants.forEach((variant: any) => {
              processGenomicsData({
                type: 'variant-annotation',
                data: variant
              });
            });
          }
          break;

        case 'gene-search':
          // Process gene search results
          if (data?.genes) {
            data.genes.forEach((gene: any) => {
              processGenomicsData({
                type: 'gene-expression',
                data: gene
              });
            });
          }
          break;

        case 'pathway-enrichment':
          // Process pathway enrichment results
          if (data?.pathways) {
            data.pathways.forEach((pathway: any) => {
              processGenomicsData({
                type: 'pathway-analysis',
                data: pathway
              });
            });
          }
          break;

        default:
          console.log('Unknown database result type:', resultType);
      }
    }
  }, [processGenomicsData]);

  // Main effect to process new data stream items
  useEffect(() => {
    if (!dataStream?.length || processingRef.current) return;

    processingRef.current = true;

    try {
      const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
      lastProcessedIndex.current = dataStream.length - 1;

      newDeltas.forEach((delta) => {
        // Add metadata tracking
        const metadata: StreamMetadata = {
          timestamp: Date.now(),
          sessionId: 'current-session', // Could be dynamic
          streamType: delta.type as FavorStreamType,
          isComplete: false,
        };

        // Process different types of data
        if (delta.type?.startsWith('database-')) {
          handleDatabaseResults(delta);
        } else {
          processGenomicsData(delta);
        }

        // Log for debugging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Processed data stream item:', {
            type: delta.type,
            metadata,
            hasData: !!delta.data
          });
        }
      });
    } catch (error) {
      console.error('Error in data stream handler:', error);
      toast.error('Error processing data stream');
    } finally {
      processingRef.current = false;
    }
  }, [dataStream, processGenomicsData, handleDatabaseResults]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      processingRef.current = false;
    };
  }, []);

  return null;
}