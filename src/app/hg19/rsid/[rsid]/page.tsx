import { redirect } from "next/navigation";

interface RsidRedirectProps {
  params: {
    rsid: string;
  };
}

export default function RsidRedirect({ params }: RsidRedirectProps) {
  const { rsid } = params;
  redirect(`/hg19/rsid/${rsid}/global-annotation/llm-summary`);
}
