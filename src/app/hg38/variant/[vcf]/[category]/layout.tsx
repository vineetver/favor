import { notFound } from "next/navigation";
import { VariantHeader } from "@/components/features/variant/header/variant-header";
import { MobileSubNavigation } from "@/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@/components/navigation/navigation-tabs";
import { fetchVariant } from "@/lib/variant/api";
import { VARIANT_NAVIGATION } from "@/lib/variant/navigation";

interface VariantLayoutProps {
  children: React.ReactNode;
  params: {
    vcf: string;
    category: string;
  };
}

export default async function VariantLayout({
  children,
  params,
}: VariantLayoutProps) {
  const { vcf, category } = params;

  const currentCategory = VARIANT_NAVIGATION.find(
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
      <div className="bg-background lg:ml-80">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <VariantHeader variant={variant} />

          <div className="mb-6">
            <NavigationTabs
              items={VARIANT_NAVIGATION.map((cat) => ({
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

      <div className="flex">
        {currentCategory.subCategories.length > 0 && (
          <NavigationSidebar
            items={currentCategory.subCategories}
            basePath={`/hg38/variant/${encodeURIComponent(vcf)}/${category}`}
          />
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
