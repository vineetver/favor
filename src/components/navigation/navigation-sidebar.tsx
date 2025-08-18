"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <aside className="hidden lg:block w-80 bg-card p-6 rounded-lg">
      <nav className="space-y-1">
        {items.map((item) => (
          <Button
            key={item.slug}
            variant={isActiveItem(item.slug) ? "default" : "ghost"}
            className="w-full justify-start h-9 px-3 font-normal text-base"
            asChild
          >
            <Link href={`${basePath}/${item.slug}`}>{item.text}</Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
