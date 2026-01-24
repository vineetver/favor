"use client";

import { VARIANT_NAVIGATION_CONFIG } from "@features/variant/config/hg38/navigation";
import { cn } from "@infra/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

interface NavigationSection {
  name: string;
  slug: string;
  subCategories: { text: string; slug: string }[];
}

interface PageNavConfig {
  title: string;
  basePath: (params: Record<string, string>) => string;
  sections: NavigationSection[];
}

const PAGE_NAV_CONFIGS: Record<string, PageNavConfig> = {
  variant: {
    title: "Variant Navigation",
    basePath: (params) => `/hg38/variant/${encodeURIComponent(params.vcf)}`,
    sections: VARIANT_NAVIGATION_CONFIG,
  },
  // Future: Add gene navigation here
  // gene: {
  //   title: "Gene Navigation",
  //   basePath: (params) => `/hg38/gene/${encodeURIComponent(params.geneId)}`,
  //   sections: GENE_NAVIGATION_CONFIG,
  // },
};

function detectPageType(pathname: string): string | null {
  if (pathname.includes("/variant/")) return "variant";
  if (pathname.includes("/gene/")) return "gene";
  return null;
}

interface PageNavDrawerProps {
  onNavigate: () => void;
}

export function PageNavDrawer({ onNavigate }: PageNavDrawerProps) {
  const params = useParams();
  const pathname = usePathname();
  const category = params.category as string;
  const subcategory = params.subcategory as string;

  const [expandedSection, setExpandedSection] = useState<string | null>(
    category ?? null,
  );

  const pageType = detectPageType(pathname);
  if (!pageType) return null;

  const config = PAGE_NAV_CONFIGS[pageType];
  if (!config) return null;

  const basePath = config.basePath(params as Record<string, string>);

  const toggleSection = (slug: string) => {
    setExpandedSection((prev) => (prev === slug ? null : slug));
  };

  return (
    <div className="px-4 py-6 border-b border-slate-100 space-y-1">
      <span className="block px-5 py-2 text-sm font-bold text-primary uppercase tracking-widest">
        {config.title}
      </span>

      {config.sections.map((section) => {
        const isExpanded = expandedSection === section.slug;
        const hasSubCategories = section.subCategories.length > 0;
        const isActiveSection = category === section.slug;

        return (
          <div key={section.slug}>
            {hasSubCategories ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleSection(section.slug)}
                  className={cn(
                    "w-full flex items-center justify-between",
                    "px-5 py-3.5 rounded-xl",
                    "text-sm font-semibold",
                    "transition-colors duration-200",
                    isActiveSection
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-primary/10",
                  )}
                >
                  <span>{section.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400",
                      "transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "transition-all duration-300 ease-out",
                    isExpanded
                      ? "max-h-[1000px] opacity-100 mb-4"
                      : "max-h-0 opacity-0 overflow-hidden",
                  )}
                >
                  <div className="ml-4 pl-4 border-l-2 border-slate-200 space-y-0.5">
                    {section.subCategories.map((sub) => {
                      const isActive =
                        category === section.slug && subcategory === sub.slug;
                      return (
                        <Link
                          key={sub.slug}
                          href={`${basePath}/${section.slug}/${sub.slug}`}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2",
                            "px-4 py-2.5 rounded-lg",
                            "text-sm font-medium",
                            "transition-colors duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-slate-500 hover:text-slate-900 hover:bg-primary/10",
                          )}
                        >
                          {isActive && (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          <span>{sub.text}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <Link
                href={`${basePath}/${section.slug}`}
                onClick={onNavigate}
                className={cn(
                  "block px-5 py-3.5 rounded-xl",
                  "text-sm font-semibold",
                  "transition-colors duration-200",
                  isActiveSection
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-700 hover:bg-primary/10",
                )}
              >
                {section.name}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
