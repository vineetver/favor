import Link from "next/link";
import { Dash } from "./dash";

/** Reusable table cell: variant VCF link + position subtext */
export function VariantCell({
  vcf,
  position,
}: {
  vcf: string | null | undefined;
  position?: number | null;
}) {
  if (!vcf) return <Dash />;
  return (
    <div>
      <Link
        href={`/hg38/variant/${encodeURIComponent(vcf)}`}
        className="font-mono text-xs text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {vcf}
      </Link>
      {position != null && (
        <span className="block text-xs tabular-nums text-muted-foreground">
          pos {position.toLocaleString()}
        </span>
      )}
    </div>
  );
}
