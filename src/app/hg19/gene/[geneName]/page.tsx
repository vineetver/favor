import { redirect } from "next/navigation";

interface GeneRedirectProps {
  params: {
    geneName: string;
  };
}

export default function GeneRedirect({ params }: GeneRedirectProps) {
  const { geneName } = params;
  redirect(`/hg19/gene/${geneName}/gene-level-annotation/info-and-ids`);
}
