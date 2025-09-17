import type { DomainChrInterval } from "@/components/gosling";

export interface GenomicRegion {
  chromosome: string;
  start: number;
  end: number;
}

export interface DomainConfig {
  region?: GenomicRegion;
  windowSize?: number;
  padding?: number;
  minSize?: number;
  maxSize?: number;
  centerOnVariant?: boolean;
}

export interface VariantInfo {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  raw: string;
}

export class GenomicDomainManager {
  private static readonly DEFAULT_WINDOW_SIZE = 100000; // 100kb
  private static readonly MIN_WINDOW_SIZE = 1000; // 1kb
  private static readonly MAX_WINDOW_SIZE = 10000000; // 10Mb
  private static readonly DEFAULT_PADDING = 0.1; // 10% padding on each side

  static parseAnyGenomicInput(
    input: string,
  ): GenomicRegion | VariantInfo | null {
    if (!input) return null;

    // Try region format first (1-123456-789012)
    const region = this.parseRegionString(input);
    if (region) {
      return region;
    }

    // Try VCF format (1-123456-A-T, 1:123456:A:T)
    const variant = this.parseVcfString(input);
    if (variant) {
      return variant;
    }

    return null;
  }

  static validateGenomicInput(input: string): {
    isValid: boolean;
    type: "region" | "variant" | null;
    error?: string;
  } {
    if (!input || typeof input !== "string") {
      return { isValid: false, type: null, error: "Input is required" };
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return { isValid: false, type: null, error: "Input cannot be empty" };
    }

    // Try region format
    const region = this.parseRegionString(trimmed);
    if (region) {
      if (region.start >= region.end) {
        return {
          isValid: false,
          type: "region",
          error: "Start position must be less than end position",
        };
      }
      return { isValid: true, type: "region" };
    }

    // Try variant format
    const variant = this.parseVcfString(trimmed);
    if (variant) {
      if (variant.position <= 0) {
        return {
          isValid: false,
          type: "variant",
          error: "Position must be greater than 0",
        };
      }
      return { isValid: true, type: "variant" };
    }

    return {
      isValid: false,
      type: null,
      error:
        "Invalid format. Expected: chr1-123456-789012 (region) or chr1-123456-A-T (variant)",
    };
  }

  static createOptimalDomain(
    input: string,
    trackTypes: string[] = [],
    options: {
      preferredSize?: number;
      minSize?: number;
      maxSize?: number;
    } = {},
  ): DomainChrInterval | null {
    const validation = this.validateGenomicInput(input);
    if (!validation.isValid) {
      console.warn(`Invalid genomic input: ${validation.error}`);
      return null;
    }

    const adaptedConfig = this.adaptConfigForTracks(trackTypes, {
      windowSize: options.preferredSize,
      minSize: options.minSize,
      maxSize: options.maxSize,
    });

    return this.createAdaptiveDomain(input, trackTypes, adaptedConfig);
  }

  static parseRegionString(regionString: string): GenomicRegion | null {
    if (!regionString) return null;

    // Parse format: 1-123456-789012 (chromosome-start-end)
    const regionMatch = regionString.match(/^(\d+|[XY])-(\d+)-(\d+)$/i);

    if (regionMatch) {
      const [, chr, startStr, endStr] = regionMatch;
      const chromosome = `chr${chr}`;
      const start = parseInt(startStr);
      const end = parseInt(endStr);

      // Validate coordinates
      if (start <= 0 || end <= 0 || start >= end) {
        return null;
      }

      return {
        chromosome,
        start,
        end,
      };
    }

    return null;
  }

  static parseVariantVcf = this.parseVcfString;

  static parseVcfString(vcfString: string): VariantInfo | null {
    if (!vcfString) return null;

    const formats = [
      /^(chr)?(\d+|[XY])-(\d+)-([ATCG]+)-([ATCG]+)$/i, // chr1-123456-A-T
      /^(chr)?(\d+|[XY]):(\d+):([ATCG]+):([ATCG]+)$/i, // chr1:123456:A:T
      /^(chr)?(\d+|[XY]):(\d+)-(\d+)$/i, // chr1:123456-123457 (range)
    ];

    for (const format of formats) {
      const match = vcfString.match(format);
      if (match) {
        const [, chrPrefix, chr, pos, refOrEnd, alt] = match;
        const chromosome = `chr${chr}`;
        const position = parseInt(pos);

        if (format === formats[2]) {
          // Range format
          return {
            chromosome,
            position,
            ref: "",
            alt: "",
            raw: vcfString,
          };
        } else {
          // Variant format
          return {
            chromosome,
            position,
            ref: refOrEnd,
            alt: alt || "",
            raw: vcfString,
          };
        }
      }
    }

    return null;
  }

  static createDomainFromVariant(
    vcfString: string,
    config: DomainConfig = {},
  ): DomainChrInterval | null {
    const variant = this.parseVcfString(vcfString);
    if (!variant) return null;

    const {
      windowSize = this.DEFAULT_WINDOW_SIZE,
      centerOnVariant = true,
      minSize = this.MIN_WINDOW_SIZE,
      maxSize = this.MAX_WINDOW_SIZE,
    } = config;

    const effectiveWindowSize = Math.max(
      minSize,
      Math.min(maxSize, windowSize),
    );

    let start: number;
    let end: number;

    if (centerOnVariant) {
      const halfWindow = Math.floor(effectiveWindowSize / 2);
      start = Math.max(1, variant.position - halfWindow);
      end = variant.position + halfWindow;
    } else {
      start = Math.max(1, variant.position);
      end = variant.position + effectiveWindowSize;
    }

    return {
      chromosome: variant.chromosome,
      interval: [start, end],
    };
  }

  static createDomainFromRegion(
    region: GenomicRegion,
    config: DomainConfig = {},
  ): DomainChrInterval {
    const {
      windowSize = this.DEFAULT_WINDOW_SIZE,
      padding = this.DEFAULT_PADDING,
      minSize = this.MIN_WINDOW_SIZE,
      maxSize = this.MAX_WINDOW_SIZE,
      centerOnVariant = false,
    } = config;

    // If windowSize is specified and different from default, use it
    if (windowSize && windowSize !== this.DEFAULT_WINDOW_SIZE) {
      const regionCenter = Math.floor((region.start + region.end) / 2);
      const halfWindow = Math.floor(windowSize / 2);

      const start = Math.max(1, regionCenter - halfWindow);
      const end = regionCenter + halfWindow;

      return {
        chromosome: region.chromosome,
        interval: [start, end],
      };
    }

    // For initial view, show the actual region bounds with padding
    const regionSize = region.end - region.start;
    const paddingSize = Math.floor(regionSize * padding);

    const start = Math.max(1, region.start - paddingSize);
    const end = Math.min(region.end + paddingSize, region.start + maxSize);

    // Ensure minimum size
    const finalSize = end - start;
    if (finalSize < minSize) {
      const center = Math.floor((start + end) / 2);
      const halfMin = Math.floor(minSize / 2);
      return {
        chromosome: region.chromosome,
        interval: [Math.max(1, center - halfMin), center + halfMin],
      };
    }

    return {
      chromosome: region.chromosome,
      interval: [start, end],
    };
  }

  static createAdaptiveDomain(
    input: string | GenomicRegion,
    trackTypes: string[] = [],
    config: DomainConfig = {},
  ): DomainChrInterval | null {
    // Analyze track types to determine optimal window size
    const adaptedConfig = this.adaptConfigForTracks(trackTypes, config);

    if (typeof input === "string") {
      // First try to parse as region format (1-123456-789012)
      const parsedRegion = this.parseRegionString(input);
      if (parsedRegion) {
        return this.createDomainFromRegion(parsedRegion, adaptedConfig);
      }

      // Fall back to VCF format parsing
      return this.createDomainFromVariant(input, adaptedConfig);
    } else {
      return this.createDomainFromRegion(input, adaptedConfig);
    }
  }

  private static adaptConfigForTracks(
    trackTypes: string[],
    baseConfig: DomainConfig,
  ): DomainConfig {
    let adaptedWindowSize = baseConfig.windowSize || this.DEFAULT_WINDOW_SIZE;

    // Adjust window size based on track types
    const trackTypeAdaptations = {
      gene: 1.0, // Baseline
      clinical: 0.5, // Smaller window for focused variant analysis
      "eqtl-simple": 1.5, // Larger window to capture regulatory context
      "eqtl-comprehensive": 2.0, // Much larger window for regulatory networks
      chromatin: 3.0, // Very large window for chromatin structure
      conservation: 0.8, // Smaller window for detailed conservation
    };

    // Find the maximum adaptation factor
    const maxFactor = trackTypes.reduce((max, trackType) => {
      const factor =
        trackTypeAdaptations[trackType as keyof typeof trackTypeAdaptations] ||
        1.0;
      return Math.max(max, factor);
    }, 1.0);

    adaptedWindowSize = Math.floor(adaptedWindowSize * maxFactor);

    return {
      ...baseConfig,
      windowSize: adaptedWindowSize,
    };
  }

  static formatDomainAsString(domain: DomainChrInterval): string {
    return `${domain.chromosome}:${domain.interval[0].toLocaleString()}-${domain.interval[1].toLocaleString()}`;
  }

  static getDomainSize(domain: DomainChrInterval): number {
    return domain.interval[1] - domain.interval[0];
  }

  static expandDomain(
    domain: DomainChrInterval,
    factor: number = 2,
  ): DomainChrInterval {
    const currentSize = this.getDomainSize(domain);
    const newSize = Math.floor(currentSize * factor);
    const center = Math.floor((domain.interval[0] + domain.interval[1]) / 2);
    const halfSize = Math.floor(newSize / 2);

    return {
      chromosome: domain.chromosome,
      interval: [Math.max(1, center - halfSize), center + halfSize],
    };
  }

  static contractDomain(
    domain: DomainChrInterval,
    factor: number = 0.5,
  ): DomainChrInterval {
    const currentSize = this.getDomainSize(domain);
    const newSize = Math.max(
      this.MIN_WINDOW_SIZE,
      Math.floor(currentSize * factor),
    );
    const center = Math.floor((domain.interval[0] + domain.interval[1]) / 2);
    const halfSize = Math.floor(newSize / 2);

    return {
      chromosome: domain.chromosome,
      interval: [center - halfSize, center + halfSize],
    };
  }

  static createPresetDomains(
    variant: string,
  ): Record<string, DomainChrInterval | null> {
    return {
      focused: this.createDomainFromVariant(variant, {
        windowSize: 100,
        centerOnVariant: true,
      }),
      standard: this.createDomainFromVariant(variant, {
        windowSize: 100000,
        centerOnVariant: true,
      }),
      regulatory: this.createDomainFromVariant(variant, {
        windowSize: 500000,
        centerOnVariant: true,
      }),
      structural: this.createDomainFromVariant(variant, {
        windowSize: 2000000,
        centerOnVariant: true,
      }),
    };
  }
}
