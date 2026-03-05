import type { Metadata } from "next";
import Link from "next/link";
import { ApiEndpoint } from "../_components/api-doc-blocks";
import { MediaSlot } from "../_components/media-slot";

export const metadata: Metadata = {
  title: "Batch Annotation | FAVOR Docs",
  description:
    "Upload and process variant files with FAVOR batch annotation.",
};

export default function BatchAnnotationDocsPage() {
  return (
    <div className="max-w-5xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Cohorts + Batch pipeline
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Batch Annotation (Contracts and Flow)
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Frontend workflows run on <code>/cohorts/*</code> endpoints, while the
          backend queue/worker pipeline materializes cohort artifacts. This page
          mirrors those packets one-to-one.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Workflow path</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <code>POST /cohorts/presign-upload</code>
          </li>
          <li>S3 PUT upload from browser</li>
          <li>
            <code>POST /cohorts/validate</code> (typed/variant detection + schema preview)
          </li>
          <li>
            <code>POST /cohorts</code> with <code>source=upload</code> or{" "}
            <code>source=inline</code>
          </li>
          <li>
            poll <code>GET /cohorts/{`{id}`}/status</code>, then read{" "}
            <code>GET /cohorts/{`{id}`}</code>
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          UI entrypoint:{" "}
          <Link href="/batch-annotation" className="text-primary hover:underline">
            /batch-annotation
          </Link>
        </p>
      </section>

      <section className="mt-8 space-y-5">
        <ApiEndpoint
          method="POST"
          path="/cohorts/presign-upload"
          auth="Authenticated"
          summary="Create a presigned upload target and input_uri."
          requestFields={[
            { name: "filename", type: "string", required: true },
            { name: "content_type", type: "string", notes: "Optional; defaulted by backend." },
          ]}
          responseFields={[
            { name: "upload_url", type: "string" },
            { name: "input_uri", type: "s3://..." },
          ]}
        />
        <ApiEndpoint
          method="POST"
          path="/cohorts/validate"
          auth="Authenticated"
          summary="Validate upload and return typed cohort inference."
          requestFields={[
            { name: "input_uri", type: "string", required: true },
            { name: "hint_data_type", type: "variant_list | gwas_sumstats | ..." },
            { name: "hint_column_map", type: "ColumnMapping[]" },
            { name: "hint_has_header", type: "boolean" },
          ]}
          responseFields={[
            { name: "ok/data_type/confidence", type: "validation result" },
            { name: "schema_preview", type: "column sample list" },
            { name: "suggested_column_map", type: "ColumnMapping[]" },
            { name: "variant_key_strategy", type: "string" },
            { name: "variant_key_columns", type: "string[]" },
            { name: "row_count_estimate", type: "number" },
            { name: "delimiter/has_header", type: "detected parsing traits" },
            { name: "warnings/errors", type: "string[]" },
          ]}
        />
        <ApiEndpoint
          method="POST"
          path="/cohorts"
          auth="Authenticated"
          summary="Create cohort and dispatch processing (or inline resolve path)."
          requestFields={[
            { name: "source", type: "inline | upload", required: true },
            { name: "references", type: "string[]", notes: "Inline mode." },
            { name: "input_uri", type: "string", notes: "Upload mode." },
            { name: "label", type: "string" },
            { name: "idempotency_key", type: "string" },
            { name: "data_type", type: "typed cohort data type" },
            { name: "column_map", type: "ColumnMapping[]" },
          ]}
          responseFields={[
            { name: "id", type: "uuid" },
            { name: "status", type: "queued | validating | running | ..." },
            { name: "created_at", type: "ISO timestamp" },
          ]}
        />
        <ApiEndpoint
          method="GET"
          path="/cohorts/{id}/status"
          auth="Authenticated"
          summary="Lightweight polling packet."
          responseFields={[
            { name: "id", type: "uuid" },
            { name: "status", type: "cohort status" },
            { name: "progress", type: "object | null" },
            { name: "is_terminal", type: "boolean" },
            { name: "poll_hint_ms", type: "number | null" },
          ]}
        />
        <ApiEndpoint
          method="GET"
          path="/cohorts/{id}"
          auth="Authenticated"
          summary="Full detail packet including timing, output links, and error metadata."
          requestFields={[
            { name: "include_urls", type: "boolean", notes: "Presign result URLs when ready." },
          ]}
          responseFields={[
            { name: "status/source/label/variant_count", type: "cohort identity" },
            { name: "progress/poll/timing/eta", type: "runtime telemetry" },
            { name: "input/output", type: "artifact + URL expiry details" },
            { name: "error_code/error_message/retryable", type: "failure info" },
            { name: "attempt", type: "retry attempt count" },
          ]}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Screenshot slot: upload and config panel"
          description="Add a labeled screenshot of the upload/configuration UI."
        />
        <MediaSlot
          type="video"
          title="Video slot: batch run lifecycle"
          description="Add a screen recording from upload to completed result review."
        />
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">
          Post-processing cohort operations
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code>/cohorts/{`{id}`}/schema</code>, <code>/rows</code>,{" "}
            <code>/groupby</code>, <code>/correlation</code>
          </li>
          <li>
            <code>/cohorts/{`{id}`}/compute</code>, <code>/prioritize</code>,{" "}
            <code>/derive</code>, <code>/export</code>
          </li>
          <li>
            analytics routes under <code>/cohorts/{`{id}`}/analytics/*</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
