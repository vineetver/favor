import { notFound } from "next/navigation";
import { GeneHeader } from "@/components/features/gene/gene-header";
import { MobileSubNavigation } from "@/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@/components/navigation/navigation-tabs";
import { HG19_GENE_NAVIGATION } from "@/lib/hg19/gene/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";

interface GeneLayoutProps {
  children: React.ReactNode;
  params: {
    geneName: string;
  };
}

export default async function GeneLayout({
  children,
  params,
}: GeneLayoutProps) {
  const { geneName } = params;
  const category = "gene-level-annotation";

  const currentCategory = HG19_GENE_NAVIGATION.find((cat) => cat.slug === category);

  if (!currentCategory) {
    notFound();
  }

  const geneData = await fetchGeneAnnotation(geneName);
  if (!geneData) {
    notFound();
  }
  

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background lg:ml-80">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <GeneHeader geneData={geneData} />

          <div className="mb-6">
            <NavigationTabs
              items={HG19_GENE_NAVIGATION.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                hasSubCategories: cat.subCategories.length > 0,
                defaultSubCategory:
                  cat.subCategories.length > 0
                    ? cat.subCategories[0].slug
                    : undefined,
              }))}
              activeItem={category}
              basePath={`/hg19/gene/${encodeURIComponent(geneName)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg19/gene/${encodeURIComponent(geneName)}/${category}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {currentCategory.subCategories.length > 0 && (
          <NavigationSidebar
            items={currentCategory.subCategories}
            basePath={`/hg19/gene/${encodeURIComponent(geneName)}/${category}`}
          />
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
