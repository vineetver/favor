"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VistaEnhancerTable } from "@/components/features/region/vista-enhancer/vista-enhancer-table";
import { fetchVistaEnhancerByRegion } from "@/lib/region/vista-enhancers/api";
import type { VistaEnhancer } from "@/lib/region/vista-enhancers/types";
import { DistanceSlider } from "@/components/features/ccre/filters/distance-slider";

interface VistaEnhancerDisplayProps {
  vcf?: string;
  region?: string;
  initialData?: VistaEnhancer[] | null;
}

export function VistaEnhancerDisplay({
  vcf,
  region,
  initialData,
}: VistaEnhancerDisplayProps) {
  const [searchDistance, setSearchDistance] = useState([0]);
  const [debouncedSearchDistance, setDebouncedSearchDistance] = useState([0]);

  const handleSearchDistanceChange = useCallback((distance: number[]) => {
    setSearchDistance(distance);
    const timeoutId = setTimeout(() => {
      setDebouncedSearchDistance(distance);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data: vistaEnhancerData, isLoading } = useQuery({
    queryKey: ["vista-enhancers", vcf || region, debouncedSearchDistance[0]],
    queryFn: () => {
      if (!vcf && !region) return Promise.resolve(initialData || []);
      if (region) {
        return fetchVistaEnhancerByRegion(region);
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
        <VistaEnhancerTable
          data={vistaEnhancerData || []}
          title="VISTA Enhancers"
          description="Experimentally validated enhancer elements from the VISTA database"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
