import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";
import { StatBanner } from "../_components/stat-banner";
import { DataFlowDiagram } from "../_components/data-flow-diagram";
import {
  FlowDiagram,
  FlowNode,
  FlowConnector,
} from "../_components/flow-diagram";

const TOC_ITEMS: TocItem[] = [
  { id: "what-you-can-upload", label: "What you can upload" },
  { id: "upload-to-insight", label: "Upload to insight" },
  { id: "what-makes-it-fast", label: "What makes it fast" },
  { id: "speed", label: "Speed" },
  { id: "key-resolution", label: "Key resolution" },
  { id: "what-you-get-back", label: "What you get back" },
  { id: "cohort-ready", label: "Once your cohort is ready" },
  { id: "knowledge-graph", label: "Connected to knowledge graph" },
];

export const metadata: Metadata = {
  title: "Batch Pipeline | FAVOR Docs",
  description:
    "Streaming annotation pipeline: 10K+ records/sec, zero-allocation decoding, 232 dimensions from 30+ sources, dual-format output.",
};

export default function BatchPipelineDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      {/* Hero */}
      <div>
        <Prose>
          <h1>Batch Pipeline</h1>
          <p>
            Upload a variant file &mdash; GWAS summary stats, credible sets,
            fine-mapping results, or any variant list. Get back a fully
            annotated, queryable cohort with{" "}
            <strong>232 annotation dimensions from 30+ sources</strong>,
            a complete analytics suite, and direct{" "}
            <Link href="/docs/agent-system">AI agent</Link> access.
            Preserved columns. Deterministic mappings. Queryable Parquet.
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "232", label: "Annotation Dimensions", detail: "Functional, conservation, population, regulatory" },
              { value: "30+", label: "Data Sources", detail: "gnomAD, ClinVar, CADD, LINSIGHT, and more" },
              { value: "10K+", label: "Records / sec", detail: "Per node, horizontally scalable" },
              { value: "4", label: "Input Formats", detail: "GWAS, credible sets, VCF, TSV/CSV" },
            ]}
          />
        </div>
      </div>

      {/* Supported inputs */}
      <section>
        <Prose>
          <h2 id="what-you-can-upload">What you can upload</h2>
          <p>
            Format, delimiters, columns, and identifier types are all
            auto-detected. Mixed identifier formats within a single file are
            handled transparently.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Format</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Details</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Column handling</th>
              </tr>
            </thead>
            <tbody>
              {[
                { fmt: "GWAS summary stats", det: "P-values, effect sizes, variant IDs", col: "Auto-mapped regardless of naming conventions" },
                { fmt: "Credible sets", det: "SuSiE, FINEMAP, PAINTOR output", col: "PIPs, credible set assignments, Bayes factors preserved" },
                { fmt: "VCF files", det: "Single or multi-sample", col: "CHROM, POS, REF, ALT extracted; INFO fields parsed" },
                { fmt: "TSV / CSV variant lists", det: "Any tabular file with variant IDs", col: "Delimiter auto-detected; rsID, VCF, VID formats mixed freely" },
              ].map((row) => (
                <tr key={row.fmt} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.fmt}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.det}</td>
                  <td className="py-3 text-muted-foreground">{row.col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <Prose>
          <h2 id="upload-to-insight">Upload to insight</h2>
          <p>
            Five stages, fully streaming and stateless. Files go to cloud
            storage, workers pull chunks in parallel, output lands as queryable
            Parquet without intermediate ETL.
          </p>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="upload-cloud"
              title="Upload"
              subtitle="Presigned upload to S3. File never passes through the application server."
              index={0}
            />
            <FlowConnector label="auto-detect format" />
            <FlowNode
              icon="check-circle"
              title="Validate"
              items={[
                "Auto-detect file type (GWAS, credible set, VCF, variant list)",
                "Infer delimiter, header row, and column mappings",
                "Classify identifier format per row (rsID, VCF, VID)",
                "Preview schema; adjust mappings before processing",
              ]}
              index={1}
            />
            <FlowConnector label="NATS JetStream dispatch" />
            <FlowNode
              icon="zap"
              title="Enrich"
              items={[
                "Stream S3 in 1-8 MB chunks (UTF-8 boundary-safe)",
                "Buffer 5K lines, classify keys, deduplicate VIDs",
                "RocksDB multi_get (~1,500 keys/call, 4 parallel threads)",
                "TLV decode to typed Variant struct (232 fields)",
              ]}
              index={2}
            />
            <FlowConnector label="dual output" />
            <FlowNode
              icon="database"
              title="Cohort ready"
              subtitle="Dual output: JSONL (streaming gzip) + Parquet (Arrow RecordBatches). DataFusion SQL directly over Parquet — no loading step."
              index={3}
            />
            <FlowConnector label="unlock capabilities" />
            <FlowNode
              icon="sparkles"
              title="Analyze"
              subtitle="Full analytics, AI agent, visualization, export, and sub-cohort derivation — immediately available."
              index={4}
            />
          </FlowDiagram>
        </div>

        {/* Input → Output example */}
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              What the pipeline adds
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Your columns</th>
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Mapped to</th>
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Annotations added</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { input: "SNP, P, BETA, SE", mapped: "variant_id, original_p_value, original_beta, original_se", added: "cadd_phred, gnomad_af, linsight, clinvar_sig, …228 more" },
                  { input: "rsID, PIP, CS_ID", mapped: "variant_id, pip, credible_set_id", added: "revel, phylop, sift_score, polyphen_score, …228 more" },
                  { input: "chr1:12345:A:G", mapped: "variant_id (VID format)", added: "gerp_rs, phastcons, fathmm_score, …229 more" },
                ].map((row) => (
                  <tr key={row.input} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs align-top">{row.input}</td>
                    <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs align-top">{row.mapped}</td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs align-top">{row.added}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What makes it fast */}
      <section>
        <Prose>
          <h2 id="what-makes-it-fast">What makes it fast</h2>
          <p>
            No single bottleneck gates the system. Storage I/O, decoding, and
            output generation are all pipelined and parallelized.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Technique</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Impact</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tech: "Sorted key batching", impact: "Incoming IDs sorted before RocksDB lookup. Improves storage locality across LSM-tree levels." },
                { tech: "Zero-allocation decoder", impact: "Custom TLV binary encoding (232 typed tags). Streaming decode, zero heap allocs per field." },
                { tech: "Parallel fetch threads", impact: "4 threads per worker saturate I/O. Each processes sorted key batches independently." },
                { tech: "Dual output, single decode", impact: "JSONL and Parquet from the same typed Variant struct. No re-parsing." },
                { tech: "CAS + lease scheduling", impact: "Compare-and-swap state transitions with heartbeat leases. Auto-recovery from worker failures." },
                { tech: "Horizontal scaling", impact: "NATS JetStream dispatches to worker pool. Linear throughput scaling. Priority queues for small vs large." },
              ].map((row) => (
                <tr key={row.tech} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.tech}</td>
                  <td className="py-3 text-muted-foreground">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Speed — moved up to follow "What makes it fast" */}
      <section>
        <Prose>
          <h2 id="speed">Speed</h2>
          <p>
            10,000+ records/sec per worker with horizontal scaling. Priority
            queues ensure small jobs never wait behind large ones.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Typical processing times"
            steps={[
              { label: "500 variants", detail: "Under 5 seconds" },
              { label: "5,000 variants", detail: "Under 15 seconds" },
              { label: "50,000 variants", detail: "Under 2 minutes" },
              { label: "200,000 variants", detail: "Under 5 minutes" },
            ]}
          />
        </div>
      </section>

      {/* Key resolution */}
      <section>
        <Prose>
          <h2 id="key-resolution">Key resolution</h2>
          <p>
            Mixed identifier formats in a single file. Each row classified and
            resolved independently.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Identifier resolution"
            steps={[
              { label: "Raw input", detail: "rsID, VCF, or VID" },
              { label: "Classify", detail: "Detect format per row" },
              { label: "Resolve", detail: "RocksDB lookup if needed" },
              { label: "Deduplicate", detail: "Canonical VIDs" },
              { label: "Fetch", detail: "multi_get, TLV decode, typed Variant" },
            ]}
          />
        </div>
      </section>

      {/* What you get back */}
      <section>
        <Prose>
          <h2 id="what-you-get-back">What you get back</h2>
          <p>
            232 dimensions per variant. Original columns preserved alongside
            the full annotation payload.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Category</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Annotations</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: "Functional scores", ann: "CADD, REVEL, MetaSVM, MutationTaster, SIFT, PolyPhen-2, PROVEAN" },
                { cat: "Conservation", ann: "PhyloP, phastCons, GERP++, SiPhy, LINSIGHT" },
                { cat: "Population frequency", ann: "gnomAD v4 allele frequencies, exome/genome coverage, homozygote counts" },
                { cat: "Regulatory context", ann: "Chromatin states, histone marks, DNase, TF binding, enhancer/promoter annotations" },
                { cat: "Clinical significance", ann: "ClinVar pathogenicity, OMIM associations, ACMG classification support" },
                { cat: "Protein impact", ann: "Amino acid changes, domain disruption, splice proximity, NMD prediction, stability effects" },
              ].map((row) => (
                <tr key={row.cat} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.cat}</td>
                  <td className="py-3 text-muted-foreground">{row.ann}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Post-annotation */}
      <section>
        <Prose>
          <h2 id="cohort-ready">Once your cohort is ready</h2>
          <p>
            Everything runs in one place against the same dataset. No separate
            exports or analysis environments.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Capability</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cap: "Filter, sort, query", desc: "Slice by any annotation dimension. Multi-filter, paginated, column-selectable." },
                { cap: "Rank & prioritize", desc: "Multi-criteria weighted composite scoring with automatic normalization." },
                { cap: "Derive sub-cohorts", desc: "Filtered subsets as independent cohorts with own analytics and agent access." },
                { cap: "Statistical analysis", desc: "PCA, regression, clustering, feature importance, bootstrap CIs, permutation tests. Auto-polling, chart generation, elastic net fallback." },
                { cap: "Group & aggregate", desc: "Histogram any column. Group by gene, consequence, chromosome. Count, mean, min, max, sum." },
                { cap: "AI agent handoff", desc: "Natural language questions, graph cross-reference, automated visualization." },
              ].map((row) => (
                <tr key={row.cap} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.cap}</td>
                  <td className="py-3 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Knowledge graph connection */}
      <section>
        <Prose>
          <h2 id="knowledge-graph">Connected to the knowledge graph</h2>
          <p>
            The{" "}
            <Link href="/docs/agent-system">AI agent</Link> cross-references
            your variants with gene-disease associations, drug targets, protein
            interactions, pathway memberships, and tissue expression across
            the{" "}
            <Link href="/docs/knowledge-graph">14.8M-entity knowledge graph</Link>.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="From upload to discovery"
            steps={[
              { label: "Your file", detail: "GWAS, credible sets, VCF, or variant list" },
              { label: "Annotated cohort", detail: "232 dimensions, queryable" },
              { label: "AI agent", detail: "Natural language queries, stats" },
              { label: "Knowledge graph", detail: "14.8M entities, 52 edge types" },
              { label: "Insights", detail: "Drug targets, pathways, phenotypes" },
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section>
        <Callout variant="info" title="Try it now">
          Go to{" "}
          <Link href="/batch-annotation" className="text-primary hover:underline font-medium">
            Batch Annotation
          </Link>{" "}
          to upload your first file. Every cohort is immediately available to
          the{" "}
          <Link href="/docs/agent-system" className="text-primary hover:underline font-medium">
            AI agent
          </Link>.
        </Callout>
      </section>
    </div>
  );
}
