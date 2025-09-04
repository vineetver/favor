import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { RsidHeader } from "@/components/features/variant/header/rsid-header";
import { MobileSubNavigation } from "@/components/navigation/mobile-sub-navigation";
import { NavigationTabs } from "@/components/navigation/navigation-tabs";
import { VARIANT_NAVIGATION } from "@/lib/variant/navigation";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { clearRsidVariantCookie } from "@/lib/variant/actions";

interface RsidGenomeBrowserLayoutProps {
  children: React.ReactNode;
  params: {
    rsid: string;
  };
}

export default async function RsidGenomeBrowserLayout({
  children,
  params,
}: RsidGenomeBrowserLayoutProps) {
  const { rsid } = params;
  const category = "genome-browser";

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const currentCategory = VARIANT_NAVIGATION.find(
    (cat) => cat.slug === category,
  );

  if (!currentCategory) {
    notFound();
  }

  const variants = await fetchHg19VariantsByRsid(rsid);

  if (!variants || variants.length === 0) {
    notFound();
  }

  const validatedVariantVcf = validateVariantForRsid(
    variants,
    selectedVariantVcfFromCookie,
  );

  if (selectedVariantVcfFromCookie && !validatedVariantVcf) {
    await clearRsidVariantCookie(rsid);
  }

  const selectedVariant = selectVariantFromList(
    variants,
    validatedVariantVcf || undefined,
  );

  if (!selectedVariant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background lg:ml-80">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <RsidHeader
            rsid={rsid}
            variants={variants}
            selectedVariant={selectedVariant}
          />

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
              basePath={`/hg38/rsid/${encodeURIComponent(rsid)}`}
            />
          </div>

          {currentCategory.subCategories.length > 0 && (
            <div className="mb-6 lg:hidden">
              <MobileSubNavigation
                items={currentCategory.subCategories}
                basePath={`/hg38/rsid/${encodeURIComponent(rsid)}/${category}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
