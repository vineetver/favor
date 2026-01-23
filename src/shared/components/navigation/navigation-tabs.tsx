"use client";

import {
  Activity,
  Database,
  Dna,
  LayoutDashboard,
  Microscope,
  ScanLine,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@infra/utils";

interface NavigationItem {
  name: string;
  slug: string;
  hasSubCategories: boolean;
  defaultSubCategory?: string;
}

interface NavigationTabsProps {
  items: NavigationItem[];
  activeItem: string;
  basePath: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  summary: LayoutDashboard,
  "global-annotation": Database,
  "single-cell-tissue": Microscope,
  "genome-browser": ScanLine,
  "gene-level-annotation": Dna,
  "SNV-summary": Activity,
  "InDel-summary": Activity,
  "tissue-specific": Microscope,
  "full-tables": Table2,
  "open-targets": Database,
};

// Scroll state as single object (Commandment II: fewer invalid states)
type ScrollState = { left: boolean; right: boolean };

export function NavigationTabs({
  items,
  activeItem,
  basePath,
}: NavigationTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    left: false,
    right: false,
  });

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setScrollState({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1,
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  return (
    <div className="w-full relative">
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex items-center gap-1 min-w-fit">
          {items.map((item) => {
            const Icon = iconMap[item.slug];
            const isActive = activeItem === item.slug;

            return (
              <Link
                key={item.slug}
                href={`${basePath}/${item.slug}${item.hasSubCategories ? `/${item.defaultSubCategory || "basic"}` : ""}`}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5",
                  "rounded-xl whitespace-nowrap touch-manipulation",
                  "text-sm font-medium transition-all duration-200",
                  isActive && [
                    "bg-primary text-white",
                    "shadow-lg shadow-primary/25",
                  ],
                  !isActive && [
                    "text-slate-500 bg-slate-100",
                    "hover:text-slate-700 hover:bg-slate-200",
                  ],
                )}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {scrollState.right && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-background via-background/80 to-transparent pointer-events-none" />
      )}

      {scrollState.left && (
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-background via-background/80 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
