import Link from "next/link";

const PLATFORM_LINKS = [
  { label: "Search", href: "/" },
  { label: "Batch Annotation", href: "/batch-annotation" },
  { label: "FAVOR-GPT", href: "/agent" },
  { label: "CLI", href: "/cli" },
  { label: "Annotator", href: "/favor-annotator" },
];

const DOCS_LINKS = [
  { label: "Documentation", href: "/docs" },
  { label: "Search Guide", href: "/docs/search" },
  { label: "Batch Pipeline", href: "/docs/batch-annotation" },
  { label: "Agent Guide", href: "/docs/agent" },
  { label: "Knowledge Graph", href: "/docs/knowledge-graph" },
];

const PROJECT_LINKS = [
  { label: "About", href: "/about" },
  { label: "Team", href: "/team" },
  { label: "Terms of Use", href: "/terms" },
  {
    label: "Forums",
    href: "https://discussion.genohub.org",
    external: true,
  },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-page mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
              FAVOR
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Functional Annotation of Variants Online Resource. An open-access
              portal for whole genome variant annotation.
            </p>
          </div>

          <FooterColumn title="Platform" links={PLATFORM_LINKS} />
          <FooterColumn title="Documentation" links={DOCS_LINKS} />
          <FooterColumn title="Project" links={PROJECT_LINKS} />
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2023–{currentYear} Harvard T.H. Chan School of Public Health.
            All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Lin Lab, Department of Biostatistics
          </p>
        </div>
      </div>
    </footer>
  );
}
