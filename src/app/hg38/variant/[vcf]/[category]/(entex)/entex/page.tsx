import { EntexDisplay } from "@/components/features/variant/entex/entex-display";
import { fetchEntexDefault, fetchEntexPooled } from "@/lib/variant/entex/api";

interface EntexPageProps {
  params: {
    vcf: string;
  };
}

export default async function EntexPage({ params }: EntexPageProps) {
  const { vcf } = params;

  const [defaultData, pooledData] = await Promise.all([
    fetchEntexDefault(vcf),
    fetchEntexPooled(vcf),
  ]);

  return <EntexDisplay defaultData={defaultData} pooledData={pooledData} />;
}
