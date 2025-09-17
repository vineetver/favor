import { Suspense } from "react";
import { getVariantConsequences } from "@/lib/opentargets/api";
import { fetchVariant } from "@/lib/variant/api";
import { VariantConsequencesDisplay } from "@/components/features/opentargets/variant-consequences-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatVariantId } from "@/lib/opentargets/api";

interface ConsequencesPageProps {
  params: {
    vcf: string;
  };
}

async function ConsequencesContent({ vcf }: { vcf: string }) {
  const variantData = await fetchVariant(vcf);

  if (!variantData?.variant_vcf) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Incomplete variant data for {vcf}
        </p>
      </div>
    );
  }

  const variantId = formatVariantId(
    variantData.variant_vcf.split("-")[0],
    Number(variantData.variant_vcf.split("-")[1]),
    variantData.variant_vcf.split("-")[2],
    variantData.variant_vcf.split("-")[3],
  );

  try {
    const { variant } = await getVariantConsequences(variantId);

    return <VariantConsequencesDisplay variant={variant} vcf={vcf} />;
  } catch (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Failed to load variant consequences from OpenTargets
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
}

export default async function ConsequencesPage({
  params,
}: ConsequencesPageProps) {
  const { vcf } = params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Variant Consequences
        </h1>
        <p className="text-muted-foreground mt-2">
          Functional consequences and transcript effects for variant {vcf} from
          OpenTargets Platform
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <ConsequencesContent vcf={vcf} />
      </Suspense>
    </div>
  );
}
