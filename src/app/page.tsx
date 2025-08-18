import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HeroPattern } from "@/components/layout/hero-pattern";
import { Search } from "@/components/features/search/genomic-search";
import { Button } from "@/components/ui/button"
import { WhatsNewBanner } from "@/components/ui/whats-new-banner";

export default function HomePage() {
  return (
    <>
      <HeroPattern />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 md:max-w-5xl">
        <div className="py-6">
          <WhatsNewBanner className="mb-8" />
        </div>
        <div className="py-8 text-center sm:py-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
            <span className="block xl:inline">
              Functional Annotation of Variants
            </span>{" "}
            <span className="text-primary xl:inline">Online Resource</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            An open-access variant functional annotation portal for whole genome
            sequencing (WGS/WES) data. FAVOR contains total 8,892,915,237
            variants (all possible 8,812,917,339 SNVs and 79,997,898 Observed
            indels).
          </p>
          <h1 className="text-2xl font-bold tracking-tight mb-4 mt-5">
            Start Exploring
          </h1>
          <Search />

          <div className="relative mt-8 md:mt-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-base text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <div>
            <p className="mt-6 text-base leading-7 text-muted-foreground">
              With FAVOR&apos;s batch annotation feature, users can save time
              and effort by uploading a file with multiple variants or rsID to
              be annotated in batches, making it a valuable resource for
              researchers and clinicians working with WGS/WES data.
            </p>
            <div className="mx-auto mt-8 flex max-w-md justify-center gap-4 md:mt-12">
              <Button variant="default" asChild>
                <Link href="/batch-annotation">Upload Now</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/about">
                  <ArrowUpRight />
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
