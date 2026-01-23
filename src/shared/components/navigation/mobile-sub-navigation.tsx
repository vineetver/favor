"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@shared/components/ui/button";

interface NavigationItem {
  text: string;
  slug: string;
}

interface MobileSubNavigationProps {
  items: NavigationItem[];
  basePath: string;
}

export function MobileSubNavigation({
  items,
  basePath,
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
          className="w-full justify-between h-12 px-4 text-base font-medium touch-manipulation"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ml-2 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-1">
              {items.map((item) => (
                <Link
                  key={item.slug}
                  href={`${basePath}/${item.slug}`}
                  className={`block w-full text-left px-4 py-3 text-base rounded-md transition-colors touch-manipulation ${
                    isActiveItem(item.slug)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.text}
                </Link>
              ))}
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
