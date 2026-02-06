"use client";

import { Button } from "@shared/components/ui/button";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

interface NavigationItem {
  text: string;
  slug: string;
}

interface MobileSubNavigationProps {
  items: NavigationItem[];
  basePath: string;
  queryString?: string;
}

export function MobileSubNavigation({
  items,
  basePath,
  queryString = "",
}: MobileSubNavigationProps) {
  const params = useParams();
  const pathname = usePathname();
  const currentSubcategory = params.subcategory as string;
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const isActiveItem = (itemSlug: string) => {
    if (currentSubcategory === itemSlug) {
      return true;
    }
    return pathname.endsWith(`/${itemSlug}`);
  };

  const activeItem = items.find((item) => isActiveItem(item.slug));
  const displayText = activeItem ? activeItem.text : "Select subcategory";

  return (
    <div className="w-full">
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between h-11 px-4 text-sm font-medium rounded-xl border-border touch-manipulation"
        >
          <span className="truncate text-heading">{displayText}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-border rounded-xl shadow-lg shadow-border/50 max-h-64 overflow-y-auto">
            <div className="p-1.5">
              {items.map((item) => {
                const isActive = isActiveItem(item.slug);
                return (
                  <Link
                    key={item.slug}
                    href={`${basePath}/${item.slug}${queryString}`}
                    className={`block w-full text-left px-3.5 py-2.5 text-sm rounded-lg transition-all duration-150 touch-manipulation ${
                      isActive
                        ? "bg-primary/[0.08] text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.text}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
