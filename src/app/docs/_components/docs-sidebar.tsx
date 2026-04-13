"use client";

import { cn } from "@infra/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DOCS_NAV_GROUPS,
  type DocsNavGroup,
  type DocsNavItem,
} from "../_lib/nav";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-48 shrink-0">
      <nav className="lg:sticky lg:top-24 space-y-6">
        {DOCS_NAV_GROUPS.map((group) => {
          if (group.contextual && !isGroupActive(group, pathname)) {
            return null;
          }
          return (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-2 space-y-0.5">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function isGroupActive(group: DocsNavGroup, pathname: string): boolean {
  return group.items.some(
    (item) =>
      pathname === item.href ||
      (item.children?.some((c) => pathname === c.href) ?? false),
  );
}

function SidebarItem({
  item,
  pathname,
}: {
  item: DocsNavItem;
  pathname: string;
}) {
  const isActive = pathname === item.href;
  const hasActiveChild =
    item.children?.some((c) => pathname === c.href) ?? false;
  const inActivePath = isActive || hasActiveChild;
  const showChildren = inActivePath;

  return (
    <div>
      <Link
        href={item.href}
        className={cn(
          "block rounded-lg px-3 py-2 text-sm transition-colors",
          isActive && "bg-primary/10 text-primary font-medium",
          !isActive && hasActiveChild && "text-foreground font-medium",
          !inActivePath &&
            "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {item.title}
      </Link>
      {showChildren && item.children && item.children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-lg py-2 pl-7 pr-3 text-sm transition-colors",
                  childActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {child.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
