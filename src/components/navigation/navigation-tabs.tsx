"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
        className="cursor-pointer -mb-px flex items-center border-b border-border overflow-x-auto scrollbar-hide"
      >
        <div className="flex items-center min-w-fit">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}${item.hasSubCategories ? `/${item.defaultSubCategory || "basic"}` : ""}`}
              className={cn(
                "h-[42px] px-3 sm:px-5 py-6 flex items-center justify-center shadow-sm whitespace-nowrap",
                "text-muted-foreground border-b-2 border-transparent min-w-0 flex-shrink-0",
                "hover:text-foreground hover:bg-foreground/10 touch-manipulation",
                "transition-all duration-200 ease-in text-sm sm:text-base",
                activeItem === item.slug && [
                  "border-b-primary",
                  "text-foreground bg-foreground/10",
                ],
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      )}

      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      )}
    </div>
  );
}
