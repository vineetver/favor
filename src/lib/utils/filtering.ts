import type { FilterParams } from './data-interfaces';

export function createFilterParams(filters: FilterParams): URLSearchParams {
  const params = new URLSearchParams();
  
  // Add threshold filters
  if (filters.thresholds) {
    Object.entries(filters.thresholds).forEach(([field, value]) => {
      params.append(`${field}[gte]`, String(value));
    });
  }
  
  // Add categorical filters
  if (filters.categories?.length) {
    filters.categories.forEach(category => {
      params.append('category', category);
    });
  }
  
  if (filters.tissues?.length) {
    filters.tissues.forEach(tissue => {
      params.append('tissue', tissue);
    });
  }
  
  if (filters.cellTypes?.length) {
    filters.cellTypes.forEach(cellType => {
      params.append('cell_type', cellType);
    });
  }
  
  if (filters.experimentalMethods?.length) {
    filters.experimentalMethods.forEach(method => {
      params.append('experimental_method', method);
    });
  }
  
  if (filters.regulatoryMarks?.length) {
    filters.regulatoryMarks.forEach(mark => {
      params.append('regulatory_mark', mark);
    });
  }
  
  if (filters.regulatoryTypes?.length) {
    filters.regulatoryTypes.forEach(type => {
      params.append('regulatory_type', type);
    });
  }
  
  if (filters.interactionTypes?.length) {
    filters.interactionTypes.forEach(type => {
      params.append('interaction_type', type);
    });
  }
  
  if (filters.evidenceTypes?.length) {
    filters.evidenceTypes.forEach(type => {
      params.append('evidence_type', type);
    });
  }
  
  // Add numeric range filters
  if (filters.confidenceMin !== undefined) {
    params.append('confidence[gte]', String(filters.confidenceMin));
  }
  
  if (filters.pValueMax !== undefined) {
    params.append('p_value[lte]', String(filters.pValueMax));
  }
  
  if (filters.scoreMin !== undefined) {
    params.append('score[gte]', String(filters.scoreMin));
  }
  
  if (filters.scoreMax !== undefined) {
    params.append('score[lte]', String(filters.scoreMax));
  }
  
  return params;
}

export function applyClientSideFilters<T extends Record<string, any>>(
  data: T[],
  filters: FilterParams
): T[] {
  return data.filter(item => {
    // Apply threshold filters
    if (filters.thresholds) {
      for (const [field, minValue] of Object.entries(filters.thresholds)) {
        const itemValue = item[field];
        if (typeof itemValue === 'number' && itemValue < minValue) {
          return false;
        }
      }
    }
    
    // Apply categorical filters
    if (filters.categories?.length && filters.categories.length > 0) {
      const itemCategory = item.category || item.type;
      if (itemCategory && !filters.categories.includes(itemCategory)) {
        return false;
      }
    }
    
    if (filters.tissues?.length && filters.tissues.length > 0) {
      const itemTissue = item.tissue || item.tissue_type;
      if (itemTissue && !filters.tissues.includes(itemTissue)) {
        return false;
      }
    }
    
    // Apply numeric range filters
    if (filters.confidenceMin !== undefined) {
      const confidence = item.confidence || item.score || item.confidence_score;
      if (typeof confidence === 'number' && confidence < filters.confidenceMin) {
        return false;
      }
    }
    
    if (filters.pValueMax !== undefined) {
      const pValue = item.p_value || item.pvalue || item['p-value'];
      if (typeof pValue === 'number' && pValue > filters.pValueMax) {
        return false;
      }
    }
    
    if (filters.scoreMin !== undefined) {
      const score = item.score || item.confidence || item.abc_score;
      if (typeof score === 'number' && score < filters.scoreMin) {
        return false;
      }
    }
    
    if (filters.scoreMax !== undefined) {
      const score = item.score || item.confidence || item.abc_score;
      if (typeof score === 'number' && score > filters.scoreMax) {
        return false;
      }
    }
    
    return true;
  });
}

export function createSortFunction<T extends Record<string, any>>(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): (a: T, b: T) => number {
  if (!sortBy) {
    return () => 0;
  }
  
  return (a: T, b: T) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal === bVal) return 0;
    
    let comparison: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  };
}