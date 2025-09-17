import { WhatsNewContent } from "@/components/features/whats-new/whats-new-content";
import { getReleaseFeatures } from "@/lib/mdx";

export default async function WhatsNewPage() {
  const features = await getReleaseFeatures();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl mb-6">
          What's New in FAVOR
        </h1>
        <p className="text-lg leading-8 text-muted-foreground max-w-4xl">
          Discover the latest features, improvements, and updates we've made to
          enhance your genomic analysis experience.
        </p>
      </div>

      <WhatsNewContent features={features} />
    </main>
  );
}
