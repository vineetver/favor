import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { FilteredItem } from "@/lib/annotations/types";
import { getVariantColumns } from "@/lib/variant/columns";

interface SpliceaiPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function SpliceaiPage({ params }: SpliceaiPageProps) {
  const { vcf, category } = params;

  const [variant, exome, genome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  variant.spliceai_ds_max_exome = exome?.spliceai_ds_max;
  variant.spliceai_ds_max_genome = genome?.spliceai_ds_max;
  variant.pangolin_largest_ds_genome = genome?.pangolin_largest_ds;
  variant.pangolin_largest_ds_exome = exome?.pangolin_largest_ds;

  const columns = getVariantColumns(category, "spliceai");
  const filteredItems = getFilteredItems(columns!, variant);

  const validItems: FilteredItem[] = filteredItems || [];

  return <AnnotationTable items={validItems} />;
}
