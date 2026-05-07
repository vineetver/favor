"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface RegionLinkProps {
  /** FAVOR loc key — `${chromosome}-${start}-${end}`, half-open. */
  loc: string;
  tooltip?: string;
}

export function RegionLink({ loc, tooltip }: RegionLinkProps) {
  return (
    <Link
      href={`/hg38/region/${encodeURIComponent(loc)}/regulatory/overview`}
      title={tooltip ?? `Region ${loc}`}
      className="group inline-flex items-center gap-0.5 text-xs font-mono text-foreground hover:text-primary transition-colors"
    >
      <span className="group-hover:underline underline-offset-2">{loc}</span>
      <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
