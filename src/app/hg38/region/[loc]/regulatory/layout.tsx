import { fetchRegionSummary } from "@features/enrichment/api/region";
import { RegionNavBar } from "@features/enrichment/components/region-nav-bar";
import { RegionHeader } from "@features/region/components/region-header";
import { REGION_NAVIGATION_CONFIG } from "@features/region/config/navigation";
import { parseRegion } from "@features/region/utils/parse-region";
import { MobileSubNavigation } from "@shared/components/navigation/mobile-sub-navigation";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { notFound } from "next/navigation";

interface RegulatoryLayoutProps {
  children: React.ReactNode;
  params: Promise<{ loc: string }>;
}

export default async function RegulatoryLayout({
  children,
  params,
}: RegulatoryLayoutProps) {
  const { loc: rawLoc } = await params;
  const loc = decodeURIComponent(rawLoc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const category = "regulatory";
  const currentCategory = REGION_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) notFound();

  const summary = await fetchRegionSummary(region.loc).catch(() => null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header + primary nav */}
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

      {/* RegionNavBar */}
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {summary && (
          <div className="hidden lg:block">
            <RegionNavBar
              summary={summary}
              basePath={`/hg38/region/${encodeURIComponent(loc)}/${category}`}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-page mx-auto px-6 lg:px-12 pb-12">
        <main>{children}</main>
      </div>
    </div>
  );
}
