"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@infra/utils";
import { DOCS_NAV_ITEMS } from "../_lib/nav";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="lg:sticky lg:top-24 rounded-2xl border border-border bg-card p-3">
        <p className="px-3 pt-2 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          FAVOR Docs
        </p>
        <nav className="space-y-1">
          {DOCS_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-xl px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

