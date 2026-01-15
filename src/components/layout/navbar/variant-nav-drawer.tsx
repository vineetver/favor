"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { VARIANT_NAVIGATION_CONFIG } from "@/features/variant/config/hg38/navigation";

interface VariantNavDrawerProps {
  onNavigate: () => void;
}

export function VariantNavDrawer({ onNavigate }: VariantNavDrawerProps) {
  const params = useParams();
  const vcf = params.vcf as string;
  const category = params.category as string;
  const subcategory = params.subcategory as string;

  const [expandedSection, setExpandedSection] = useState<string | null>(
    category ?? null
  );

  if (!vcf) return null;

  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}`;

  const toggleSection = (slug: string) => {
    setExpandedSection((prev) => (prev === slug ? null : slug));
  };

  return (
    <div className="space-y-1">
      <span className="block px-5 py-2 text-sm font-bold text-primary uppercase tracking-wider">
        Variant Navigation
      </span>

      {VARIANT_NAVIGATION_CONFIG.map((section) => {
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
                    "text-[15px] font-semibold",
                    "transition-colors duration-200",
                    isActiveSection
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-primary/10"
                  )}
                >
                  <span>{section.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400",
                      "transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "overflow-hidden",
                    "transition-all duration-300 ease-out",
                    isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-4 pl-4 border-l-2 border-slate-200 space-y-0.5 py-2">
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
                            "text-[14px] font-medium",
                            "transition-colors duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-slate-500 hover:text-slate-900 hover:bg-primary/10"
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
                  "text-[15px] font-semibold",
                  "transition-colors duration-200",
                  isActiveSection
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-700 hover:bg-primary/10"
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
