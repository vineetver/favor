import { notFound } from "next/navigation";
import { RegionHeader } from "@/components/features/region/region-header";
import { MobileSubNavigation } from "@/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@/components/navigation/navigation-tabs";
import { REGION_NAVIGATION } from "@/lib/region/navigation";

interface RegionLayoutProps {
  children: React.ReactNode;
  params: {
    region: string;
  };
}

export default async function RegionTissueSpecificLayout({
  children,
  params,
}: RegionLayoutProps) {
  const { region } = params;
  const category = "tissue-specific";

  const currentCategory = REGION_NAVIGATION.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background lg:ml-80">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <RegionHeader region={region} />

          <div className="mb-6">
            <NavigationTabs
              items={REGION_NAVIGATION.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                hasSubCategories: cat.subCategories.length > 0,
                defaultSubCategory:
                  cat.subCategories.length > 0
                    ? cat.subCategories[0].slug
                    : undefined,
              }))}
              activeItem={category}
              basePath={`/hg38/region/${encodeURIComponent(region)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/region/${encodeURIComponent(region)}/${category}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {currentCategory.subCategories.length > 0 && (
          <NavigationSidebar
            items={currentCategory.subCategories}
            basePath={`/hg38/region/${encodeURIComponent(region)}/${category}`}
          />
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
