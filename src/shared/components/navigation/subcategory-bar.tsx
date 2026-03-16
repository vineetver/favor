"use client";

import { cn } from "@infra/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";

interface SubcategoryBarProps {
  items: { text: string; slug: string }[];
  basePath: string;
  disabledSlugs?: string[];
}

export function SubcategoryBar({
  items,
  basePath,
  disabledSlugs,
}: SubcategoryBarProps) {
  const params = useParams();
  const pathname = usePathname();
  const disabledSet = useMemo(
    () => new Set(disabledSlugs),
    [disabledSlugs],
  );

  const activeSlug = useMemo(() => {
    const sub = params.subcategory as string | undefined;
    if (sub) return sub;
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [params.subcategory, pathname]);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted rounded-lg min-w-fit">
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          const isDisabled = disabledSet.has(item.slug);

          if (isDisabled) {
            return (
              <span
                key={item.slug}
                title="No data available"
                className="px-3 py-1.5 text-xs text-muted-foreground/40 whitespace-nowrap cursor-default"
              >
                {item.text}
              </span>
            );
          }

          return (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
              className={cn(
                "px-3 py-1.5 text-xs whitespace-nowrap rounded-md transition-colors",
                isActive
                  ? "text-foreground font-medium bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.text}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
