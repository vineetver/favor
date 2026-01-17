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
  { label: "API", href: "https://docs.genohub.org", external: true },
];

export const RESOURCES: NavItem[] = [
  {
    label: "Annotation Description",
    href: "https://docs.genohub.org/data",
    external: true,
  },
  {
    label: "FAVOR GPT",
    href: "https://docs.genohub.org/favor-gpt",
    external: true,
  },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Terms", href: "/terms" },
];
