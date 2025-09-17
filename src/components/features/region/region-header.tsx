import { Badge } from "@/components/ui/badge";

interface RegionInfo {
  chromosome: string;
  start: number;
  end: number;
  size: number;
}

interface RegionHeaderProps {
  region: string;
}

function parseRegion(region: string): RegionInfo | null {
  if (region.includes(":")) {
    const [chromosome, positions] = region.split(":");
    const [startStr, endStr] = positions.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);

    if (isNaN(start) || isNaN(end)) return null;

    return {
      chromosome,
      start,
      end,
      size: end - start + 1,
    };
  }

  const parts = region.split("-");
  if (parts.length !== 3) return null;

  const [chromosome, startStr, endStr] = parts;
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);

  if (isNaN(start) || isNaN(end)) return null;

  return {
    chromosome,
    start,
    end,
    size: end - start + 1,
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function RegionHeader({ region }: RegionHeaderProps) {
  const regionInfo = parseRegion(region);

  if (!regionInfo) {
    return (
      <div className="py-6">
        <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <h3 className="text-2xl font-semibold mt-2">
              Invalid region format: {region}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-semibold mt-2">{region}</h3>
            <Badge variant="secondary" className="text-xs">
              Chr {regionInfo.chromosome}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Genomic region ({formatNumber(regionInfo.size)} bp)
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col text-sm text-muted-foreground space-y-1">
        <span>Chromosome: {regionInfo.chromosome}</span>
        <span>Start position: {regionInfo.start.toLocaleString()}</span>
        <span>End position: {regionInfo.end.toLocaleString()}</span>
      </div>
    </div>
  );
}
