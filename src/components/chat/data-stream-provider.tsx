'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { DataUIPart } from 'ai';

// FAVOR-specific UI data types for genomics
interface FavorUIDataTypes {
  [key: string]: any;
  variantAnnotation: {
    rsid: string;
    chromosome: string;
    position: number;
    refAllele: string;
    altAllele: string;
    functionalImpact: string;
  };
  geneExpression: {
    geneSymbol: string;
    tissueType: string;
    expressionLevel: number;
    pValue: number;
  };
  pathwayAnalysis: {
    pathwayId: string;
    pathwayName: string;
    genes: string[];
    enrichmentScore: number;
  };
  interactionNetwork: {
    sourceGene: string;
    targetGene: string;
    interactionType: string;
    confidence: number;
  };
}

interface DataStreamContextValue {
  dataStream: DataUIPart<FavorUIDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<FavorUIDataTypes>[]>
  >;
  clearDataStream: () => void;
  addDataPoint: (data: DataUIPart<FavorUIDataTypes>) => void;
}

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<FavorUIDataTypes>[]>([]);

  const clearDataStream = () => setDataStream([]);
  
  const addDataPoint = (data: DataUIPart<FavorUIDataTypes>) => {
    setDataStream(prev => [...prev, data]);
  };

  const value = useMemo(
    () => ({ 
      dataStream, 
      setDataStream, 
      clearDataStream, 
      addDataPoint 
    }), 
    [dataStream]
  );

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error('useDataStream must be used within a DataStreamProvider');
  }
  return context;
}

// Utility functions for FAVOR-specific data handling
export function isVariantData(data: any): data is FavorUIDataTypes['variantAnnotation'] {
  return data && typeof data.rsid === 'string' && typeof data.chromosome === 'string';
}

export function isGeneExpressionData(data: any): data is FavorUIDataTypes['geneExpression'] {
  return data && typeof data.geneSymbol === 'string' && typeof data.tissueType === 'string';
}

export function isPathwayData(data: any): data is FavorUIDataTypes['pathwayAnalysis'] {
  return data && typeof data.pathwayId === 'string' && Array.isArray(data.genes);
}

export function isInteractionData(data: any): data is FavorUIDataTypes['interactionNetwork'] {
  return data && typeof data.sourceGene === 'string' && typeof data.targetGene === 'string';
}