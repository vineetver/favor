export interface DocsNavItem {
  title: string;
  href: string;
  /** Optional sub-items, revealed when the parent or any child is active. */
  children?: DocsNavItem[];
}

export interface DocsNavGroup {
  label: string;
  items: DocsNavItem[];
}

export const DOCS_NAV_GROUPS: DocsNavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Overview", href: "/docs" }],
  },
  {
    label: "Portal Guide",
    items: [
      {
        title: "Data & Annotations",
        href: "/docs/data",
        children: [{ title: "Changelog", href: "/docs/data/changelog" }],
      },
      { title: "Search & Explore", href: "/docs/search" },
      { title: "Batch Annotation", href: "/docs/batch-annotation" },
      { title: "AI Agent", href: "/docs/agent" },
    ],
  },
  {
    label: "Deep Dives",
    items: [
      { title: "Architecture", href: "/docs/architecture" },
      { title: "Knowledge Graph", href: "/docs/knowledge-graph" },
      { title: "AI Agent", href: "/docs/agent-system" },
      { title: "Batch Pipeline", href: "/docs/batch-pipeline" },
      { title: "Search Engine", href: "/docs/search-engine" },
    ],
  },
];

/** Flat list for mobile pill bar */
export const DOCS_NAV_ITEMS: DocsNavItem[] = DOCS_NAV_GROUPS.flatMap(
  (g) => g.items,
);
