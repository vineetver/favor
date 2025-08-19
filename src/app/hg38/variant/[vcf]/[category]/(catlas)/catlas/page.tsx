
import { fetchABCPeaks, fetchABCScores } from "@/lib/variant/abc/api";

interface CatlasPageProps {
  params: {
    vcf: string;
  };
}

export default async function CatlasPage({ params }: CatlasPageProps) {
  const { vcf } = params;

  const [peaks, scores] = await Promise.all([
    fetchABCPeaks(vcf),
    fetchABCScores(vcf),
  ]);

}
