import { Fragment } from "react";
import Link from "next/link";
import type { GraphCcre, EdgeCounts } from "../types";

interface CcreHeaderProps {
  ccre: GraphCcre;
  counts?: EdgeCounts;
}

function fmtBp(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mb`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} kb`;
  return `${n} bp`;
}

function fmtCoord(n: number): string {
  return n.toLocaleString("en-US");
}

export function CcreHeader({ ccre, counts }: CcreHeaderProps) {
  const size = ccre.end_position - ccre.start_position;
  const regionLoc = `chr${ccre.chromosome}:${ccre.start_position}-${ccre.end_position}`;

  const metaParts: string[] = [];
  if (ccre.annotation_label) metaParts.push(ccre.annotation_label);
  metaParts.push(
    `chr${ccre.chromosome}:${fmtCoord(ccre.start_position)}-${fmtCoord(ccre.end_position)}`,
  );
  metaParts.push(fmtBp(size));

  const assocParts: string[] = [];
  if (counts?.CCRE_REGULATES_GENE)
    assocParts.push(
      `${counts.CCRE_REGULATES_GENE} regulated gene${counts.CCRE_REGULATES_GENE !== 1 ? "s" : ""}`,
    );
  if (counts?.VARIANT_OVERLAPS_CCRE)
    assocParts.push(
      `${counts.VARIANT_OVERLAPS_CCRE} overlapping variant${counts.VARIANT_OVERLAPS_CCRE !== 1 ? "s" : ""}`,
    );

  return (
    <div className="py-8 space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-breadcrumb">
        <span className="text-subtle">cCREs</span>
        <span className="text-border">&#9656;</span>
        <span className="text-breadcrumb-mono">{ccre.id}</span>
      </div>

      {/* Title */}
      <h1 className="text-page-title font-mono">{ccre.id}</h1>

      {/* Metadata line */}
      {metaParts.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          {metaParts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-border">&middot;</span>}
              <span>{part}</span>
            </Fragment>
          ))}
        </div>
      )}

      {/* Association counts */}
      {assocParts.length > 0 && (
        <p className="text-sm text-muted-foreground/80">
          {assocParts.join(" · ")}
        </p>
      )}

      {/* External links */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground/70 flex-wrap">
        <a
          href={`https://screen.encodeproject.org/search/?q=${ccre.id}&assembly=GRCh38`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          ENCODE SCREEN:{" "}
          <span className="font-mono">{ccre.id}</span>
        </a>
        {ccre.nearest_gene_symbol && (
          <Link
            href={`/hg38/gene/${ccre.nearest_gene_id}/gene-level-annotation/summary`}
            className="hover:text-foreground transition-colors"
          >
            Nearest gene:{" "}
            <span className="font-medium">{ccre.nearest_gene_symbol}</span>
            <span className="ml-1 text-muted-foreground/50">
              ({fmtBp(ccre.distance_to_nearest_tss)})
            </span>
          </Link>
        )}
        <Link
          href={`/hg38/variant/region?loc=${encodeURIComponent(regionLoc)}`}
          className="hover:text-foreground transition-colors"
        >
          Genome Browser
        </Link>
      </div>
    </div>
  );
}
