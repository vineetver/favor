import { ExternalLink } from "@shared/components/ui/external-link";
import type { Metadata } from "next";
import { DatasetTabs } from "./dataset-tabs";

export const metadata: Metadata = {
  title: "FAVOR Annotator | FAVOR",
  description:
    "FAVORannotator - an open source R program for performing offline functional annotation of WGS/WES studies using the FAVOR database.",
};

export default function FavorAnnotatorPage() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            FAVOR Annotator
          </h1>

          <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
            <p>
              FAVORannotator is an open source R program (
              <ExternalLink
                iconSize="sm"
                href="https://github.com/zhouhufeng/FAVORannotator"
              >
                GitHub
              </ExternalLink>
              ) for performing offline functional annotation of whole-genome/
              whole-exome sequencing (WGS/WES) studies using the{" "}
              <ExternalLink
                iconSize="sm"
                href="https://academic.oup.com/nar/article/51/D1/D1300/6814464"
              >
                FAVOR
              </ExternalLink>{" "}
              database. It combines the functional annotation data with the
              input genotype data (VCF) to create an all-in-one aGDS file. The
              aGDS format allows for both the genotype and functional annotation
              data to be contained in a single file.
            </p>
            <p>
              It converts a genotype VCF input file into a GDS file, searches
              the variants in the GDS file using the FAVOR database for their
              functional annotations (in PostgreSQL), and then integrates these
              annotations into the GDS file to create an aGDS file. This aGDS
              file allows both genotype and functional annotation data to be
              stored in a single file.
            </p>
            <p>
              FAVORannotator can be conveniently integrated into the
              STAARpipeline (
              <ExternalLink
                iconSize="sm"
                href="https://github.com/xihaoli/STAARpipeline"
              >
                GitHub
              </ExternalLink>{" "}
              |{" "}
              <ExternalLink
                iconSize="sm"
                href="https://www.nature.com/articles/s41592-022-01640-x"
              >
                Paper
              </ExternalLink>
              ), a rare variant association analysis tool for WGS/WES studies,
              to perform association analysis of large-scale genetic data.
            </p>
            <p>
              FAVORannotator&apos;s database (containing 20 essential annotation
              scores) can be downloaded from the following links:
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-sm text-foreground">
            <p className="font-medium">Heads up — these are 2024 datasets.</p>
            <p className="mt-1 text-muted-foreground">
              The downloads below are from the 2024 FAVOR release, not the 2026
              version. For access to the 2026 datasets, contact{" "}
              <a
                href="mailto:favor@genohub.org"
                className="text-primary hover:underline"
              >
                favor@genohub.org
              </a>
              .
            </p>
          </div>

          <div className="mt-10">
            <DatasetTabs />
          </div>
        </div>
      </div>
    </div>
  );
}
