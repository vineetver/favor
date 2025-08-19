"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { RuntimeError } from "@/components/ui/error-states";
import { DistanceSlider } from "@/components/features/ccre/filters/distance-slider";
import { CCRETableView } from "@/components/features/ccre/table/table-view";
import { getCCREByRegion, getCCREByVCF } from "@/lib/variant/ccre/api";
import type { CCRE } from "@/lib/variant/ccre/types";

interface CCREDisplayProps {
  vcf?: string;
  region?: string;
  initialData?: CCRE[] | null;
}

export function CCREDisplay({ vcf, region, initialData }: CCREDisplayProps) {
  const [searchDistance, setSearchDistance] = useState([0]);
  const [debouncedSearchDistance, setDebouncedSearchDistance] = useState([0]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchDistanceChange = useCallback((distance: number[]) => {
    setSearchDistance(distance);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearchDistance(distance);
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const {
    data: cCREsData,
    isLoading: isCCRELoading,
    error: cCREError,
    refetch: refetchCCRE,
  } = useQuery({
    queryKey: ["ccre", vcf || region, debouncedSearchDistance[0]],
    queryFn: () => {
      if (!vcf && !region) return Promise.resolve(initialData || []);
      if (vcf) {
        return getCCREByVCF(vcf, debouncedSearchDistance[0]);
      } else if (region) {
        return getCCREByRegion(region, debouncedSearchDistance[0]);
      }
      return Promise.resolve(initialData || []);
    },
  });

  const sharedProps = {
    vcf,
    region,
    searchDistance,
    debouncedSearchDistance,
    cCREsData,
    isCCRELoading,
  };

  // Handle error state
  if (cCREError) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 lg:flex-shrink-0 space-y-4">
          <DistanceSlider
            searchDistance={searchDistance}
            onDistanceChange={handleSearchDistanceChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <RuntimeError
            error={cCREError as Error}
            reset={() => refetchCCRE()}
            categoryName="cCRE Data"
            description="We encountered an error while loading cCRE data. This could be due to a network issue or a temporary server problem."
          />
        </div>
      </div>
    );
  }

  const tabsData = [
    {
      id: "table",
      value: "table",
      label: "Table View",
      content: (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 lg:flex-shrink-0 space-y-4">
            <DistanceSlider
              searchDistance={searchDistance}
              onDistanceChange={handleSearchDistanceChange}
            />
            </div>
          <div className="flex-1 min-w-0">
            <CCRETableView {...sharedProps} />
          </div>
        </div>
      ),
    },
    {
      id: "browser",
      value: "browser",
      label: "Browser View",
      content: (
        <div className="min-h-[800px]">
          {/* Browser implementation coming soon */}
        </div>
      ),
    },
  ];

  return (
      <ResponsiveTabs
        defaultValue="table"
        tabs={tabsData}
      />
  );
}
