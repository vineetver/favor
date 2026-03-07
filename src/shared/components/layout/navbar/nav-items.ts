export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Annotator", href: "/favor-annotator" },
  { label: "Forums", href: "https://discussion.genohub.org", external: true },
  { label: "Team", href: "/team" },
  { label: "API", href: "http://localhost:8000/docs", external: true },
];

export const RESOURCES: NavItem[] = [
  { label: "Documentation", href: "/docs" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Terms", href: "/terms" },
];
