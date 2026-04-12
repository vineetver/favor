import type { ReactNode } from "react";
import { DocsSidebar } from "./_components/docs-sidebar";
import { DOCS_NAV_ITEMS } from "./_lib/nav";
import Link from "next/link";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background py-10 sm:py-14">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="mb-6 lg:hidden overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {DOCS_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 xl:gap-12">
          <div className="hidden lg:block">
            <DocsSidebar />
          </div>
          <div className="min-w-0 flex-1 max-w-3xl [&_:is(h2,h3)[id]]:scroll-mt-24">
            {children}
          </div>
          <aside
            id="docs-toc-slot"
            aria-label="On this page"
            className="hidden lg:block w-48 shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
