import { Badge } from "@/components/ui/badge";
import type { GeneLevelAnnotation } from "@/lib/gene/types";

interface GeneHeaderProps {
  geneData: GeneLevelAnnotation;
}

export function GeneHeader({ geneData }: GeneHeaderProps) {
  return (
    <div className="py-6">
      <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-semibold mt-2">{geneData.symbol}</h3>
            {geneData.locus_type && (
              <Badge variant="secondary" className="text-xs">
                {geneData.locus_type}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {geneData.gene_full_name || "Gene name not available"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col text-sm text-muted-foreground space-y-1">
        <span>Start position: {geneData.genomic_position_start}</span>
        <span>End position: {geneData.genomic_position_end}</span>
      </div>
    </div>
  );
}
