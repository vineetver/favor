export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

const API_DOCS_URL = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return "/docs";
  try { return new URL("/docs", base).href; } catch { return "/docs"; }
})();

export const NAV_ITEMS: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Annotator", href: "/favor-annotator" },
  { label: "Forums", href: "https://discussion.genohub.org", external: true },
  { label: "Team", href: "/team" },
  { label: "API", href: API_DOCS_URL, external: true },
];

export const RESOURCES: NavItem[] = [
  { label: "Documentation", href: "/docs" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Terms", href: "/terms" },
];
