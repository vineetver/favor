"use client";

import { cn } from "@infra/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  queryString?: string;
}

// Scroll state as single object (Commandment II: fewer invalid states)
type ScrollState = { left: boolean; right: boolean };

export function NavigationTabs({
  items,
  activeItem,
  basePath,
  queryString = "",
}: NavigationTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    left: false,
    right: false,
  });

  // Use ref-based pattern to avoid listener re-attachment
  // The handler is defined once and accesses current container via ref
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setScrollState({
        left: scrollLeft > 0,
        right: scrollLeft < scrollWidth - clientWidth - 1,
      });
    };

    // Initial check
    updateScrollState();

    // Use passive listeners for scroll performance
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []); // Empty deps - listener attached once on mount

  return (
    <div className="w-full relative">
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex items-center gap-2 min-w-fit">
          {items.map((item) => {
            const isActive = activeItem === item.slug;

            return (
              <Link
                key={item.slug}
                href={`${basePath}/${item.slug}${item.hasSubCategories ? `/${item.defaultSubCategory || "basic"}` : ""}${queryString}`}
                className={cn(
                  "relative px-4 py-2.5",
                  "rounded-xl whitespace-nowrap touch-manipulation",
                  "text-sm font-medium transition-all duration-200",
                  isActive && [
                    "bg-primary text-white",
                    "shadow-lg shadow-primary/25",
                  ],
                  !isActive && [
                    "text-muted-foreground bg-muted/60",
                    "hover:text-foreground hover:bg-accent",
                  ],
                )}
              >
                {item.name}
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
