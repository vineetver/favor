import { GENE_NAVIGATION_CONFIG } from "@features/gene/config/hg38/navigation";
import { Construction } from "lucide-react";
import { notFound } from "next/navigation";

interface VariantSubcategoryPageProps {
  params: Promise<{
    id: string;
    subcategory: string;
  }>;
}

export default async function VariantSubcategoryPage({
  params,
}: VariantSubcategoryPageProps) {
  const { subcategory } = await params;

  const variantsConfig = GENE_NAVIGATION_CONFIG.find(
    (cat) => cat.slug === "variants",
  );

  const subCategory = variantsConfig?.subCategories.find(
    (sub) => sub.slug === subcategory,
  );

  if (!subCategory) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Construction className="h-14 w-14 text-muted-foreground/30 mb-5" />
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {subCategory.text}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        This section is under active development and will be available soon.
        Check back later for detailed {subCategory.text.toLowerCase()} analysis.
      </p>
    </div>
  );
}
