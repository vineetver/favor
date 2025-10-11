"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Database,
  LayoutDashboard,
  Microscope,
  ScanLine,
  Dna,
  FileBarChart2,
  Table2,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils/general";

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
};

export function NavigationTabs({
  items,
  activeItem,
  basePath,
}: NavigationTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollability);
      return () => container.removeEventListener("scroll", checkScrollability);
    }
  }, [items]);

  useEffect(() => {
    const handleResize = () => checkScrollability();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full relative">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <div className="inline-flex items-center gap-2 bg-muted/40 p-1.5 pl-1 rounded-xl min-w-fit">
          {items.map((item) => {
            const Icon = iconMap[item.slug];
            const isActive = activeItem === item.slug;

            return (
              <Link
                key={item.slug}
                href={`${basePath}/${item.slug}${item.hasSubCategories ? `/${item.defaultSubCategory || "basic"}` : ""}`}
                className={cn(
                  "relative flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5",
                  "rounded-lg whitespace-nowrap touch-manipulation",
                  "text-sm sm:text-base font-medium transition-all duration-300 ease-out",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  isActive && [
                    "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                    "hover:bg-primary/90",
                  ],
                  !isActive && [
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-background/60",
                  ],
                )}
              >
                {Icon && (
                  <Icon className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )} />
                )}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      )}

      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      )}
    </div>
  );
}
