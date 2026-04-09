import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "what-it-does", label: "What it does" },
  { id: "inputs", label: "What you can upload" },
  { id: "stages", label: "Stages of a run" },
  { id: "identifiers", label: "Identifiers" },
  { id: "outputs", label: "What you get back" },
];

export const metadata: Metadata = {
  title: "Batch Pipeline | FAVOR Docs",
  description:
    "How a variant upload becomes a queryable annotated variant list. A short description of the pipeline.",
};

export default function BatchPipelineDocsPage() {
  return (
    <div className="space-y-12">
      <DocsToc items={TOC_ITEMS} />

      <div>
        <Prose>
          <h1>Batch Pipeline</h1>
          <p>
            You upload a variant file. We hand back an annotated variant
            list you can query, analyse, and hand to the AI agent. This page
            is a short description of how that works and what you can rely
            on.
          </p>
        </Prose>

        <Callout variant="info" title="Engineering notes, not a contract">
          This page describes the current pipeline. Throughput, chunk sizes,
          and worker counts change over time. For the user guide, see the{" "}
          <Link href="/docs/batch-annotation">Batch Annotation</Link> guide.
          For release-to-release changes, read the{" "}
          <Link href="/docs/release-notes">release notes</Link>.
        </Callout>
      </div>

      <section>
        <Prose>
          <h2 id="what-it-does">What it does</h2>
          <p>
            The pipeline takes a file with variant identifiers in it and
            returns the same rows, in the same order, with a large set of
            functional annotations attached to each one. Your original
            columns are preserved, the annotation columns come from the
            annotation database, and the result is a variant list you can
            query without a separate load step.
          </p>
          <p>
            You do not need to tell it what format your file is in. It
            detects the format, the delimiter, the header row, and the
            identifier style by looking at the file.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="inputs">What you can upload</h2>
          <p>
            Any tabular file with variant identifiers, plus a few scientific
            formats we recognise and parse specially.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">
                  Format
                </th>
                <th className="text-left py-2.5 font-semibold text-foreground">
                  What the pipeline does with it
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  fmt: "GWAS summary stats",
                  body: "Recognises p values, effect sizes, and variant identifiers regardless of column naming. Your statistical columns are kept alongside the annotations.",
                },
                {
                  fmt: "Credible sets",
                  body: "Fine mapping output from tools like SuSiE, FINEMAP, or PAINTOR. Posterior probabilities and credible set assignments are preserved.",
                },
                {
                  fmt: "VCF files",
                  body: "Single or multi sample. Chromosome, position, reference, and alternate alleles are extracted. Relevant INFO fields are parsed.",
                },
                {
                  fmt: "Plain variant lists",
                  body: "Any TSV or CSV with a variant identifier column. rsID, VCF style, and internal identifiers can be mixed in the same file.",
                },
              ].map((row) => (
                <tr
                  key={row.fmt}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">
                    {row.fmt}
                  </td>
                  <td className="py-3 text-muted-foreground">{row.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Prose>
          <h2 id="stages">Stages of a run</h2>
          <p>
            A run goes through five stages. Each one has a single job, so a
            failure in one stage can be retried without redoing the
            others.
          </p>
          <ol>
            <li>
              <strong>Upload.</strong> The file goes to object storage
              directly from your browser via a presigned URL.
            </li>
            <li>
              <strong>Validate.</strong> The pipeline looks at the first
              chunk of the file and figures out the format, the delimiter,
              the header row, and which column holds the identifier. You
              get a preview before anything runs so you can correct the
              guess if it is wrong.
            </li>
            <li>
              <strong>Enrich.</strong> Workers stream the file in chunks,
              resolve identifiers, look up annotations, and stream results
              back out. Nothing gets loaded into memory in full. This is
              the stage where the annotation database does the heavy
              lifting.
            </li>
            <li>
              <strong>Materialise.</strong> The output is written in a
              queryable columnar format, so the next stage does not need a
              separate load step. You can start querying the moment the
              variant list is marked ready.
            </li>
            <li>
              <strong>Hand off.</strong> The variant list becomes available
              to filtering, analytics, the AI agent, and export.
            </li>
          </ol>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="identifiers">Identifiers</h2>
          <p>
            One of the ugliest parts of variant analysis is that the same
            variant has several names. The pipeline handles this on your
            behalf.
          </p>
          <ul>
            <li>
              <strong>Mixed identifiers per file.</strong> rsIDs, VCF style
              coordinates, and internal identifiers can live side by side
              in the same upload. Each row is classified and resolved
              independently.
            </li>
            <li>
              <strong>Canonical resolution.</strong> Every row that refers
              to the same variant resolves to the same canonical identifier
              in the output, so two rows that looked different in the
              input behave the same downstream.
            </li>
            <li>
              <strong>Unresolved rows are kept.</strong> A row with an
              identifier we cannot resolve is still included in the output
              with a clear flag. You can decide how to handle it instead
              of having it quietly dropped.
            </li>
          </ul>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="outputs">What you get back</h2>
          <p>
            A variant list with your original columns on the left and the
            full annotation payload on the right. The annotation side
            covers the same categories documented in the{" "}
            <Link href="/docs/data">Data and Annotations</Link> guide,
            which is the canonical reference for which columns ship in the
            current release.
          </p>
        </Prose>
      </section>

      <section>
        <Callout variant="info" title="Try it">
          Go to{" "}
          <Link
            href="/batch-annotation"
            className="text-primary hover:underline font-medium"
          >
            Batch Annotation
          </Link>{" "}
          to upload your first file. Every variant list is immediately
          available to the{" "}
          <Link
            href="/docs/agent"
            className="text-primary hover:underline font-medium"
          >
            AI agent
          </Link>
          .
        </Callout>
      </section>
    </div>
  );
}
