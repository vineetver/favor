import type { Drug, DrugResponse } from '../types';
import { fetchOrNull } from '@/infrastructure/api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchDrug(chemblId: string): Promise<Drug | null> {
  if (!chemblId) return null;

  const response = await fetchOrNull<DrugResponse>(
    `${API_BASE}/drugs/${encodeURIComponent(chemblId)}?view=full&include=links,stats`
  );

  if (!response || 'error' in response) return null;

  return response;
}
