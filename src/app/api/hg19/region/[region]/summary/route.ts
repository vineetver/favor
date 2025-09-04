import { NextRequest, NextResponse } from 'next/server';
import { fetchHg19RegionSummary } from '@/lib/hg19/region/summary/api';

interface RouteParams {
  params: {
    region: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { region } = params;
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category');

  if (!region) {
    return NextResponse.json(
      { error: 'Region parameter is required' },
      { status: 400 }
    );
  }

  try {
    const summary = await fetchHg19RegionSummary(region, categorySlug || undefined);
    if (!summary) {
      return NextResponse.json(
        { error: 'Region summary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching HG19 region summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}