import { notFound } from "next/navigation";
import { RegionHeader } from "@features/region/components/region-header";
import { parseRegion } from "@features/region/utils/parse-region";
import { REGION_NAVIGATION_CONFIG } from "@features/region/config/navigation";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";

interface GenomeBrowserLayoutProps {
  children: React.ReactNode;
  params: Promise<{ loc: string }>;
}

export default async function GenomeBrowserLayout({
  children,
  params,
}: GenomeBrowserLayoutProps) {
  const { loc: rawLoc } = await params;
  const loc = decodeURIComponent(rawLoc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const category = "genome-browser";
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
        </div>
      </div>

      <div className="max-w-page mx-auto px-6 lg:px-12 pb-12">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
