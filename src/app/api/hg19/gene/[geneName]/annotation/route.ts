import { NextRequest, NextResponse } from 'next/server';
import { clickHouseClient } from '@/lib/clickhouse/client';

interface RouteParams {
  params: {
    geneName: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { geneName } = params;

  if (!geneName) {
    return NextResponse.json(
      { error: 'Gene name parameter is required' },
      { status: 400 }
    );
  }

  try {
    const annotation = await fetchHg19GeneAnnotation(geneName);
    
    if (!annotation) {
      return NextResponse.json(
        { error: 'Gene annotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Error fetching HG19 gene annotation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchHg19GeneAnnotation(geneName: string) {
  try {
    const query = `
      SELECT 
        gene_name,
        chromosome,
        start_position,
        end_position
      FROM production.gene_loci
      WHERE gene_name = {geneName:String}
      LIMIT 1
    `;

    const result = await clickHouseClient.query({ 
      query,
      query_params: { geneName }
    });
    
    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Error fetching HG19 gene annotation from ClickHouse:', error);
    throw error;
  }
}