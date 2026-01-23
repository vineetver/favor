import { notFound } from "next/navigation";

import { MobileSubNavigation } from "@shared/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@shared/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { fetchVariant } from "@features/variant/api";
import { VariantHeader } from "@features/variant/components/header/variant-header";
import { VARIANT_NAVIGATION_CONFIG } from "@features/variant/config/hg38/navigation";

interface VariantLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function VariantLayout({
  children,
  params,
}: VariantLayoutProps) {
  const { vcf, category } = await params;

  const currentCategory = VARIANT_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) {
    notFound();
  }

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <VariantHeader variant={variant} />

          <div className="mb-6">
            <NavigationTabs
              items={VARIANT_NAVIGATION_CONFIG.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                hasSubCategories: cat.subCategories.length > 0,
                defaultSubCategory:
                  cat.subCategories.length > 0
                    ? cat.subCategories[0].slug
                    : undefined,
              }))}
              activeItem={category}
              basePath={`/hg38/variant/${encodeURIComponent(vcf)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/variant/${encodeURIComponent(vcf)}/${category}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex">
          {(currentCategory.groups ||
            currentCategory.subCategories.length > 0) && (
            <NavigationSidebar
              items={currentCategory.subCategories}
              groups={currentCategory.groups}
              basePath={`/hg38/variant/${encodeURIComponent(vcf)}/${category}`}
            />
          )}

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
