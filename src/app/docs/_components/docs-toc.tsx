"use client";

import { cn } from "@infra/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TocItem {
  id: string;
  label: string;
  /** Visual indent depth. 0 = top-level (default). */
  depth?: number;
}

/* ------------------------------------------------------------------ */
/*  DocsToc                                                            */
/*                                                                     */
/*  Renders an "On this page" navigation into the right-column slot    */
/*  defined by docs/layout.tsx (#docs-toc-slot) via a React portal.    */
/*  Pages render <DocsToc items={...} /> anywhere in their tree;       */
/*  the DOM target lives in the layout so the column reserves space.   */
/* ------------------------------------------------------------------ */

export function DocsToc({ items }: { items: TocItem[] }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  // Find the portal target after mount.
  useEffect(() => {
    setSlot(document.getElementById("docs-toc-slot"));
  }, []);

  // Track which heading is currently in view.
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Activate when heading reaches ~96px below the top (under the navbar).
        // Drop activation once heading scrolls past 60% from the top.
        rootMargin: "-96px 0px -60% 0px",
        threshold: 0,
      },
    );

    const targets: Element[] = [];
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) {
        observer.observe(el);
        targets.push(el);
      }
    }

    return () => {
      for (const t of targets) observer.unobserve(t);
      observer.disconnect();
    };
  }, [items]);

  if (!slot) return null;

  return createPortal(
    <nav
      aria-label="On this page"
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
    >
      <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        On this page
      </p>
      <ul className="mt-3 border-l border-border">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const indent = item.depth && item.depth > 0 ? "pl-7" : "pl-3";
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block -ml-px border-l py-1.5 pr-2 text-xs leading-snug transition-colors",
                  indent,
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>,
    slot,
  );
}
