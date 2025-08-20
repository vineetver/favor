import { GenomeBrowserErrorBoundary } from "@/components/features/browser/genome-browser/error-boundary";
import dynamic from "next/dynamic";

const DynamicGenomeBrowser = dynamic(
  () =>
    import("@/components/features/browser/genome-browser/genome-browser").then(
      (mod) => ({ default: mod.GenomeBrowser }),
    ),
  {
    ssr: false,
  },
);

export default async function RegionGenomeBrowserPage({
  params,
}: {
  params: { region: string };
}) {
  const { region } = params;

  return (
    <GenomeBrowserErrorBoundary>
      <DynamicGenomeBrowser 
        regionParam={region} 
        initialTracks={[]} 
      />
    </GenomeBrowserErrorBoundary>
  );
}