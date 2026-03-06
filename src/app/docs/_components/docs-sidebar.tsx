"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@infra/utils";
import { DOCS_NAV_GROUPS } from "../_lib/nav";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <nav className="lg:sticky lg:top-24 space-y-6">
        {DOCS_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
