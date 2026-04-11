import { fetchRegionSummary } from "@features/enrichment/api/region";
import { RegionNavBar } from "@features/enrichment/components/region-nav-bar";
import { fetchGene } from "@features/gene/api";
import { GeneHeader } from "@features/gene/components/header/gene-header";
import { geneDataChecks } from "@features/gene/config/hg38/data-availability";
import { GENE_NAVIGATION_CONFIG } from "@features/gene/config/hg38/navigation";
import { MobileSubNavigation } from "@shared/components/navigation/mobile-sub-navigation";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { getDisabledSlugs } from "@shared/utils/data-availability";
import { notFound } from "next/navigation";

interface TissueSpecificLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function TissueSpecificLayout({
  children,
  params,
}: TissueSpecificLayoutProps) {
  const { id } = await params;
  const category = "tissue-specific";

  const currentCategory = GENE_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) {
    notFound();
  }

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const disabledSlugs = getDisabledSlugs(gene, geneDataChecks);

  const summary = await fetchRegionSummary(loc).catch(() => null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header + primary nav */}
      <div className="bg-background">
        <div className="max-w-page mx-auto px-6 lg:px-12">
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
              activeItem={category}
              basePath={`/hg38/gene/${encodeURIComponent(id)}`}
              disabledSlugs={disabledSlugs}
            />
          </div>

          {/* Mobile fallback */}
          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/gene/${encodeURIComponent(id)}/${category}`}
                disabledSlugs={disabledSlugs}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav: sits between primary nav and content, visually attached to content */}
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {summary && (
          <div className="hidden lg:block">
            <RegionNavBar
              summary={summary}
              basePath={`/hg38/gene/${encodeURIComponent(id)}/${category}`}
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
