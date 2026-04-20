import { VariantHeader } from "@features/variant/components/header/variant-header";
import { variantDataChecks } from "@features/variant/config/hg38/data-availability";
import { VARIANT_NAVIGATION_CONFIG } from "@features/variant/config/hg38/navigation";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { NavigationTabs } from "@shared/components/navigation/navigation-tabs";
import { getDisabledSlugs } from "@shared/utils/data-availability";
import { notFound } from "next/navigation";

interface GenomeBrowserLayoutProps {
  children: React.ReactNode;
  params: Promise<{ vcf: string }>;
}

export default async function GenomeBrowserLayout({
  children,
  params,
}: GenomeBrowserLayoutProps) {
  const { vcf } = await params;
  const category = "genome-browser";

  const currentCategory = VARIANT_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === category,
  );
  if (!currentCategory) notFound();

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const disabledSlugs = getDisabledSlugs(result.selected, variantDataChecks);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background">
        <div className="max-w-page mx-auto px-6 lg:px-12">
          <VariantHeader result={result} />

          <div className="hidden lg:block mb-6">
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
              disabledSlugs={disabledSlugs}
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
