import type { Disease, DiseaseResponse } from '../types';
import { fetchOrNull } from '@infra/api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchDisease(diseaseId: string): Promise<Disease | null> {
  if (!diseaseId) return null;

  const response = await fetchOrNull<DiseaseResponse>(
    `${API_BASE}/diseases/${encodeURIComponent(diseaseId)}?view=full&include=links,stats`
  );

  if (!response || 'error' in response) return null;

  return response;
}
