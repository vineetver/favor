import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { MobileSubNavigation } from "@/components/navigation/mobile-sub-navigation";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { NavigationTabs } from "@/components/navigation/navigation-tabs";
import { VARIANT_NAVIGATION } from "@/lib/variant/navigation";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  getRsidBasePath,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { RsidHeader } from "@/components/features/variant/header/rsid-header";
import { clearRsidVariantCookie } from "@/lib/variant/actions";

interface RsidLayoutProps {
  children: React.ReactNode;
  params: {
    rsid: string;
    category: string;
  };
}

export default async function RsidLayout({
  children,
  params,
}: RsidLayoutProps) {
  const { rsid, category } = params;

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

  const variants = await fetchVariantsByRsid(rsid);

  if (!variants || variants.length === 0) {
    notFound();
  }

  // Validate that the stored variant actually exists for this rsID
  const validatedVariantVcf = validateVariantForRsid(
    variants,
    selectedVariantVcfFromCookie,
  );

  // If stored variant is invalid for this rsID, clear the cookie
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

  const basePath = getRsidBasePath(rsid, category);

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
                basePath={basePath}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {currentCategory.subCategories.length > 0 && (
          <NavigationSidebar
            items={currentCategory.subCategories}
            basePath={basePath}
          />
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
