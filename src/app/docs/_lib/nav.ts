export interface DocsNavItem {
  title: string;
  href: string;
  /** Optional sub-items, revealed when the parent or any child is active. */
  children?: DocsNavItem[];
}

export interface DocsNavGroup {
  label: string;
  items: DocsNavItem[];
  /**
   * If true, the group only renders when the current pathname matches one
   * of its items. Used to keep the sidebar clean on casual pages but let
   * readers hop between related pages once they are inside the section.
   */
  contextual?: boolean;
}

export const DOCS_NAV_GROUPS: DocsNavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Overview", href: "/docs" }],
  },
  {
    label: "Portal Guide",
    items: [
      { title: "Data & Annotations", href: "/docs/data" },
      { title: "Search & Explore", href: "/docs/search" },
      { title: "Batch Annotation", href: "/docs/batch-annotation" },
      { title: "AI Agent", href: "/docs/agent" },
    ],
  },
  {
    label: "Release notes",
    items: [{ title: "Release notes", href: "/docs/release-notes" }],
  },
  {
    label: "Under the hood",
    contextual: true,
    items: [
      { title: "Architecture", href: "/docs/architecture" },
      { title: "Knowledge Graph", href: "/docs/knowledge-graph" },
      { title: "AI Agent", href: "/docs/agent-system" },
      { title: "Batch Pipeline", href: "/docs/batch-pipeline" },
      { title: "Search Engine", href: "/docs/search-engine" },
    ],
  },
];

/**
 * Flat list for the mobile pill bar. Contextual groups are excluded so
 * casual pages stay clean, matching the sidebar behaviour on desktop.
 */
export const DOCS_NAV_ITEMS: DocsNavItem[] = DOCS_NAV_GROUPS.filter(
  (g) => !g.contextual,
).flatMap((g) => g.items);

/** All hrefs belonging to contextual groups, used to decide when to reveal them. */
export const CONTEXTUAL_HREFS: Set<string> = new Set(
  DOCS_NAV_GROUPS.filter((g) => g.contextual).flatMap((g) =>
    g.items.map((i) => i.href),
  ),
);
