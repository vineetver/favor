"use client";

import type { Gene } from "@features/gene/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { ShareButton } from "@shared/components/share-button";

interface GeneHeaderProps {
  gene: Gene;
  genome?: "hg38" | "hg19";
}

export function GeneHeader({ gene, genome = "hg38" }: GeneHeaderProps) {
  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-3">
        <BreadcrumbList className="text-xs font-semibold tracking-wide uppercase">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{genome.toUpperCase()}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Gene</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Content Row */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-page-title">{gene.gene_symbol}</h1>
            <span className="text-lg font-mono text-muted-foreground">
              {gene.gene_id_versioned}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm">
            {gene.gene_name && (
              <span className="text-body">{gene.gene_name}</span>
            )}

            <span className="font-mono text-subtle">
              {gene.chromosome}:{gene.start_position}-{gene.end_position}
            </span>

            {gene.gene_type && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                {gene.gene_type}
              </span>
            )}
          </div>
        </div>

        <ShareButton label={gene.gene_symbol} />
      </div>
    </div>
  );
}
