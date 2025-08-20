"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScentTable } from "@/components/features/variant/scent/scent-table";
import {
  fetchScentTissueByVCF,
  fetchScentTissueByRegion,
} from "@/lib/variant/scent/api";
import type { ScentTissue } from "@/lib/variant/scent/types";
import { DistanceSlider } from "@/components/features/ccre/filters/distance-slider";

interface ScentDisplayProps {
  vcf?: string;
  region?: string;
  initialData?: ScentTissue[] | null;
}

export function ScentDisplay({ vcf, region, initialData }: ScentDisplayProps) {
  const [searchDistance, setSearchDistance] = useState([0]);
  const [debouncedSearchDistance, setDebouncedSearchDistance] = useState([0]);

  const handleSearchDistanceChange = useCallback((distance: number[]) => {
    setSearchDistance(distance);
    const timeoutId = setTimeout(() => {
      setDebouncedSearchDistance(distance);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data: scentData, isLoading } = useQuery({
    queryKey: ["scent", vcf || region, debouncedSearchDistance[0]],
    queryFn: () => {
      if (!vcf && !region) return Promise.resolve(initialData || []);
      if (vcf) {
        return fetchScentTissueByVCF(vcf, debouncedSearchDistance[0]);
      } else if (region) {
        return fetchScentTissueByRegion(region, debouncedSearchDistance[0]);
      }
      return Promise.resolve(initialData || []);
    },
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-80 lg:flex-shrink-0">
        <DistanceSlider
          searchDistance={searchDistance}
          onDistanceChange={handleSearchDistanceChange}
        />
      </div>
      <div className="flex-1 min-w-0">
        <ScentTable
          data={scentData || []}
          title="SCENT Tissue-Specific Regulatory Data"
          description="Single-cell gene regulatory network predictions showing tissue-specific variant-gene associations"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
