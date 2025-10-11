"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/general";

interface NavigationItem {
  text: string;
  slug: string;
}

interface NavigationSidebarProps {
  items: NavigationItem[];
  basePath: string;
}

export function NavigationSidebar({ items, basePath }: NavigationSidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const currentSubcategory = params.subcategory as string;

  if (items.length === 0) {
    return null;
  }

  const isActiveItem = (itemSlug: string) => {
    if (currentSubcategory === itemSlug) {
      return true;
    }
    return pathname.endsWith(`/${itemSlug}`);
  };

  return (
    <aside className="hidden lg:block w-80 px-4">
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = isActiveItem(item.slug);

          return (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2.5 rounded-md",
                "text-sm transition-all duration-200",
                "hover:bg-muted/50",
                isActive && [
                  "text-foreground font-medium bg-muted/70",
                  "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                  "before:h-5 before:w-1 before:rounded-r-full before:bg-primary",
                ],
                !isActive && "text-muted-foreground"
              )}
            >
              <span className="flex-1">{item.text}</span>
              <ChevronRight
                className={cn(
                  "w-3.5 h-3.5 transition-all duration-200",
                  isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0"
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
