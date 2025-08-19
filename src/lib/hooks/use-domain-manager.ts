"use client";

import { useState, useMemo, useCallback } from "react";
import type { DomainChrInterval } from "@/components/gosling";
import { GenomicDomainManager } from "@/lib/utils/domain-manager";

interface DomainPreset {
  name: string;
  description: string;
  windowSize: number;
  icon: string;
}

const DOMAIN_PRESETS: DomainPreset[] = [
  {
    name: "Focused",
    description: "Focused variant-centered view (~25kb)",
    windowSize: 25000,
    icon: "target",
  },
  {
    name: "Detail View",
    description: "Detailed nucleotide-level view (~10kb)",
    windowSize: 10000,
    icon: "search",
  },
  {
    name: "Gene View",
    description: "Balanced gene-level view (~100kb)",
    windowSize: 100000,
    icon: "eye",
  },
  {
    name: "Region View",
    description: "Regulatory region context (~500kb)",
    windowSize: 500000,
    icon: "activity",
  },
  {
    name: "Chromosome View",
    description: "Large structural context (~2Mb)",
    windowSize: 2000000,
    icon: "layers",
  },
];

interface UseDomainManagerProps {
  vcfParam?: string;
  regionParam?: string;
  initialPreset?: string;
  trackTypes?: string[];
}

interface DomainManagerReturn {
  domain: DomainChrInterval | null;
  selectedPreset: string;
  customWindowSize: number | null;
  setDomain: (domain: DomainChrInterval | null) => void;
  setSelectedPreset: (preset: string) => void;
  setCustomWindowSize: (size: number | null) => void;
  zoom: (factor: number) => void;
  applyPreset: (presetName: string) => void;
  availablePresets: DomainPreset[];
}

export function useDomainManager({
  vcfParam,
  regionParam,
  initialPreset = "Focused",
  trackTypes = [],
}: UseDomainManagerProps): DomainManagerReturn {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [customWindowSize, setCustomWindowSize] = useState<number | null>(null);
  const [domain, setDomain] = useState<DomainChrInterval | null>(null);

  // Create adaptive domain based on input parameters
  const initialDomain = useMemo(() => {
    const inputParam = regionParam || vcfParam;
    if (!inputParam) return null;

    const windowSize =
      customWindowSize ||
      DOMAIN_PRESETS.find((p) => p.name === selectedPreset)?.windowSize ||
      100000;

    return GenomicDomainManager.createAdaptiveDomain(inputParam, trackTypes, {
      windowSize,
      centerOnVariant: regionParam ? false : true, // Center on variant for VCF, use region bounds for region
    });
  }, [vcfParam, regionParam, trackTypes, selectedPreset, customWindowSize]);

  // Update domain when initialDomain changes
  useMemo(() => {
    if (initialDomain && !domain) {
      setDomain(initialDomain);
    }
  }, [initialDomain, domain]);

  const zoom = useCallback(
    (factor: number) => {
      if (!domain) return;

      const newDomain =
        factor > 1
          ? GenomicDomainManager.expandDomain(domain, factor)
          : GenomicDomainManager.contractDomain(domain, Math.abs(factor));

      const newWindowSize = GenomicDomainManager.getDomainSize(newDomain);
      setCustomWindowSize(newWindowSize);
      setDomain(newDomain);
    },
    [domain],
  );

  const applyPreset = useCallback(
    (presetName: string) => {
      const preset = DOMAIN_PRESETS.find((p) => p.name === presetName);
      if (!preset) return;

      setSelectedPreset(presetName);
      setCustomWindowSize(null);

      // Recreate domain with new preset window size
      const inputParam = regionParam || vcfParam;
      if (inputParam) {
        const newDomain = GenomicDomainManager.createAdaptiveDomain(
          inputParam,
          trackTypes,
          {
            windowSize: preset.windowSize,
            centerOnVariant: regionParam ? false : true,
          },
        );
        setDomain(newDomain);
      }
    },
    [vcfParam, regionParam, trackTypes],
  );

  return {
    domain,
    selectedPreset,
    customWindowSize,
    setDomain,
    setSelectedPreset,
    setCustomWindowSize,
    zoom,
    applyPreset,
    availablePresets: DOMAIN_PRESETS,
  };
}
