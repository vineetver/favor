export interface DocsNavItem {
  title: string;
  href: string;
  description: string;
}

export const DOCS_NAV_ITEMS: DocsNavItem[] = [
  {
    title: "Overview",
    href: "/docs",
    description: "Documentation hub and recommended learning paths.",
  },
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    description: "First-session setup and core workflows.",
  },
  {
    title: "AI Agent",
    href: "/docs/ai-agent",
    description: "Complete FAVOR-GPT guide with architecture and data flow.",
  },
  {
    title: "Search & Explore",
    href: "/docs/search-and-explore",
    description: "Entity search, interpretation, and exploration patterns.",
  },
  {
    title: "Batch Annotation",
    href: "/docs/batch-annotation",
    description: "Upload, process, monitor jobs, and review outputs.",
  },
  {
    title: "Data & Scope",
    href: "/docs/data-and-scope",
    description: "Coverage, practical expectations, and validation guidance.",
  },
];

