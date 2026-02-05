import { fetchGene } from "@features/gene/api";
import { GeneHeader } from "@features/gene/components/header/gene-header";
import { GENE_NAVIGATION_CONFIG } from "@features/gene/config/hg38/navigation";
import { MobileSubNavigation } from "@shared/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@shared/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { notFound } from "next/navigation";

interface DiseaseTherapeuticsLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

const CATEGORY_SLUG = "disease-and-therapeutics";

export default async function DiseaseTherapeuticsLayout({
  children,
  params,
}: DiseaseTherapeuticsLayoutProps) {
  const { id } = await params;

  const currentCategory = GENE_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === CATEGORY_SLUG,
  );

  if (!currentCategory) {
    notFound();
  }

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <GeneHeader gene={gene} />

          <div className="hidden lg:block mb-6">
            <NavigationTabs
              items={GENE_NAVIGATION_CONFIG.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                hasSubCategories: cat.subCategories.length > 0,
                defaultSubCategory:
                  cat.subCategories.length > 0
                    ? cat.subCategories[0].slug
                    : undefined,
              }))}
              activeItem={CATEGORY_SLUG}
              basePath={`/hg38/gene/${encodeURIComponent(id)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/gene/${encodeURIComponent(id)}/${CATEGORY_SLUG}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-12">
        <div className="flex gap-6">
          {(currentCategory.groups ||
            currentCategory.subCategories.length > 0) && (
            <NavigationSidebar
              items={currentCategory.subCategories}
              groups={currentCategory.groups}
              basePath={`/hg38/gene/${encodeURIComponent(id)}/${CATEGORY_SLUG}`}
              showIcons={currentCategory.showIcons}
            />
          )}

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
