import { RegionHeader } from "@features/region/components/region-header";
import { REGION_NAVIGATION_CONFIG } from "@features/region/config/navigation";
import { parseRegion } from "@features/region/utils/parse-region";
import { MobileSubNavigation } from "@shared/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@shared/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { notFound } from "next/navigation";

interface VariantsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ loc: string }>;
}

export default async function VariantsLayout({
  children,
  params,
}: VariantsLayoutProps) {
  const { loc: rawLoc } = await params;
  const loc = decodeURIComponent(rawLoc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const category = "variants";
  const currentCategory = REGION_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background">
        <div className="max-w-page mx-auto px-6 lg:px-12">
          <RegionHeader region={region} />

          <div className="hidden lg:block mb-6">
            <NavigationTabs
              items={REGION_NAVIGATION_CONFIG.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                hasSubCategories: cat.subCategories.length > 0,
                defaultSubCategory:
                  cat.subCategories.length > 0
                    ? cat.subCategories[0].slug
                    : undefined,
              }))}
              activeItem={category}
              basePath={`/hg38/region/${encodeURIComponent(loc)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/region/${encodeURIComponent(loc)}/${category}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-page mx-auto px-6 lg:px-12 pb-12">
        <div className="flex gap-6">
          {(currentCategory.groups?.length ?? 0) > 0 && (
            <NavigationSidebar
              items={currentCategory.subCategories}
              groups={currentCategory.groups}
              basePath={`/hg38/region/${encodeURIComponent(loc)}/${category}`}
            />
          )}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
