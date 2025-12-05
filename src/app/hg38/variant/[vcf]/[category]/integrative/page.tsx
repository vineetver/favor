import { fetchVariant, fetchGnomadExome, fetchGnomadGenome } from "@/features/variant/api/hg38";
import { IntegrativeVisualization } from "@/features/variant/components/integrative-visualization";
import { variantDetailedColumns } from "@/features/variant/config/hg38";
import { enrichData } from "@/lib/data-display/enricher";
import { notFound } from "next/navigation";

interface IntegrativePageProps {
    params: {
        vcf: string;
        category: string;
    };
}

export default async function IntegrativePage({ params }: IntegrativePageProps) {
    const { vcf, category } = await params;

    const [variant, gnomadExome, gnomadGenome] = await Promise.all([
        fetchVariant(vcf),
        fetchGnomadExome(vcf),
        fetchGnomadGenome(vcf),
    ]);

    if (!variant) {
        notFound();
    }

    // Merge gnomAD data into variant
    variant.gnomad_exome = gnomadExome;
    variant.gnomad_genome = gnomadGenome;

    const enrichedVariant = enrichData(variant, variantDetailedColumns);

    return (
        <div className="space-y-6">
            <IntegrativeVisualization
                enrichedData={enrichedVariant}
                category={category}
                subcategory="integrative"
            />
        </div>
    );
}
