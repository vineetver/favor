<p align="center">
  <h1 align="center">FAVOR</h1>
  <p align="center">
    Functional Annotation of Variants Online Resource
    <br />
    <a href="https://favor-beta.genohub.org">Beta</a> &middot; <a href="https://favor.genohub.org">Production</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/vineetver/favor/actions/workflows/ci.yml?query=branch%3Abeta"><img src="https://github.com/vineetver/favor/actions/workflows/ci.yml/badge.svg?branch=beta" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License"></a>
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js">
  <img src="https://img.shields.io/badge/react-19-61dafb" alt="React">
</p>

---

Web frontend for [FAVOR](https://favor-beta.genohub.org). Variant annotation, genome browsing, and an agent for functional interpretation.

## Features

### Agent
- **FAVOR Agent**: Claude Code for variant interpretation. For biobank-scale rare-variant analysis, see [FAVOR CLI](https://github.com/vineetver/favor-cli).
- **Structured RAG**: plain English compiles to one server-side plan across Kuzu, Clickhouse, parquet, and 50+ data APIs. Multi-hop in one round-trip.
- **Seven graph modes**: `chain` (multi-hop), `neighbors` (direct links), `context` (surrounding facts), `compare` (two entities side by side), `aggregate` (group and count), `enrich` (statistical overrepresentation), `paths` (shortest path between two entities).
- **Multi-step workflows** with stateful agents:
  - variant list → gene → function → pathway, with GWAS stats
  - variant → predicted cell effect (multi-omics, IGVF)
  - variant → measured cell effect (CRISPRi, MPRA, MAVE, base editing)
- **Tool surface**: 100+ data APIs collapsed into 5 tools (`read`, `search`, `state`, `run`, `askUser`) and 20+ `run` subcommands for retrieval and workflows.
- **Schema-aware**: progressive schema disclosure across Clickhouse, the Kuzu graph, and the data APIs. Coarse catalog at session start, full per-table schema fetched on demand.
- **Two-channel tool results**: large tables summarized in place. Summary to the LLM, full payload routed to the UI as an artifact.
- **Auto-relaxation**: too few results, the agent ranks and suggests broader filters in the same call.
- **Generative UI**: ten inline chat components (bar, comparison, distribution, enrichment, heatmap, network, protein structure, QQ, scatter, stat card).
- **Persistent workspace**: state carries across turns. Past results, pins, saved subsets, graph state.

### Search
- **Type-ahead over 8.9 billion variants**: RocksDB-backed prefix index serves rsID and coordinate (e.g. 1-10001-A-T) prefixes across the full variant catalog as you type.
- **Universal search** across 18 entity types (variants, genes, diseases, drugs, pathways, phenotypes, studies, GO terms, side effects, cCREs, metabolites, signals, protein domains, tissues, cell types, …). Tiered typeahead (exact → prefix → fuzzy → related) with intent routing.
- **One search box**: rsIDs, VCF coords, SPDI, gene symbols, ontology IDs. Partial input OK. Confidence-scored intent routing.

### Batch
- **Annotation pipeline**: variant list in, every FAVOR annotation joined out. Clinical, predicted, GWAS, regulatory, perturbation, all in one cohort.
- **Input shapes**: variant lists, GWAS summary stats, credible sets, fine-mapping.
- **Multi-format ingest**: CSV/TSV/TXT/VCF/parquet up to 50MB. Variant keys auto-inferred (rsID, SPDI, VID, 4-column VCF). Column auto-mapping with dry-run resolution rates.
- **Enrichment packs**: optional add-ons selected at submit. Analyses (gene/pathway/tissue overrepresentation, with per-analysis variant-count limits) and extra annotation tables (e.g. multi-omics, measured effects, regulatory tracks) that go beyond per-variant annotation.
- **Six-stage execution**: queued → resolving → sorting → processing → enriching → done. Two-phase polling.
- **In-browser SQL on results**: when a job finishes, query the cohort with DuckDB WASM over parquet, right in the browser. Schema cache survives presigned-URL rotation.

### Genome browser
- **8.9B-variant browser**: Gosling.js and HiGlass for browsing the full genetic and regulatory landscape around any locus.
- **13+ track types**: gene annotations, CADD per allele, AlphaMissense per allele, ClinVar, GERP-N/RS, Gnocchi non-coding constraint, H3K27ac/H3K4me3/ATAC/DNase/CTCF (ENCODE), cCREs, eQTL and CRISPRi link arcs, validated-enhancer arcs, Umap/Bismap mappability, recombination and local diversity.

### Pages
- **Variant** (24 sections): annotation and integrative scoring; clinical (ClinVar, PGx, somatic); predicted impact (SpliceAI, conservation, protein, MaveDB with ACMG-style tiers); GWAS (catalog, credible sets, locus-to-gene); population (gnomAD ancestry, local diversity, de novo rate); regulatory (chromatin, epigenetics, TFs, mappability).
- **Gene** (25+ sections): function, expression, phenotypes; constraints, PPI, pathway leverage; therapeutics (tractability, drug landscape, chemical probes, TEPs, safety, cancer); tissue context (accessibility, enhancers, cCREs, QTLs, ChromBPNet, V2F, perturbation across CRISPRi/MPRA/base-editing), plus AlphaGenome predictions (9 modalities × 18 tissue groups, up to 1Mb).
- **Region**: gene-page regulatory/functional stack scoped to coordinates. 1000bp summary bins precomputed server-side.
- **Disease**: profile and ontology, associated genes (Open Targets), drugs by phase, GWAS variants, studies, phenotypes.
- **Drug**: profile, targets (ChEMBL, DGIdb), indications by phase, pharmacogenomics, adverse effects, drug-drug interactions.

### Knowledge graph
- **Cross-domain queries in one traversal**: "diseases linked to variants in pathways targeted by approved drugs", "drugs targeting genes with regulatory hits in this region", "phenotypes shared between mouse knockouts and human patients with variants in this gene". Each is one query, not four databases stitched together.
- **Cytoscape and XYFlow visualization** over variant, gene, disease, drug. Color-coded by entity type and evidence. Graph, list, and split layouts. Inspector, path finder, intersection, settings panels.

### Platform
- **Auth**: cookies, quotas with adaptive polling, personal API keys, authenticated SSE proxy.
- **Shareable URLs**: deep links round-trip for browser, search, and agent state.
- **Type-safe API**: feature-isolated clients, boundary parsing into branded types.
- **Platform status**: aggregated live incidents across NERC, Vercel, and self-hosted services with scope and impact.
- **What's new**: in-app release notes and dismissible update notifications.
- **Settings**: profile, API keys with labels, expirations, revocation, and usage.
- **CLI bridge**: companion FAVOR CLI for VCF ingest, local annotation, STAAR rare-variant association, and MetaSTAAR cross-biobank meta-analysis.

## Quick Start

**Prerequisites:** Node.js 22+, [pnpm](https://pnpm.io/)

```bash
git clone https://github.com/vineetver/favor.git
cd favor
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://api-v2.genohub.org/api/v1
FAVOR_API_KEY=<your-token>
```

To get an API key: go to [favor-beta.genohub.org](https://favor-beta.genohub.org), log in, click your avatar, go to **Settings**, and generate a token.

```bash
pnpm dev   # http://localhost:3000
```

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, AI SDK (OpenAI + DeepSeek), Cytoscape, XYFlow, Gosling.js, DuckDB WASM, Plotly, Recharts.

## Deployment

| Environment | URL | Branch |
|-------------|-----|--------|
| Beta | [favor-beta.genohub.org](https://favor-beta.genohub.org) | `beta` |
| Production | [favor.genohub.org](https://favor.genohub.org) | `master` |

## Citation

> Zhou H, Verma V, Li X, et al. **FAVOR 2.0: A reengineered functional annotation of variants online resource for interpreting genomic variation.** *Nucleic Acids Research*, 54(D1), D1405-D1414 (2026). [DOI: 10.1093/nar/gkaf1217](https://doi.org/10.1093/nar/gkaf1217)

> Zhou H, Arapoglou T, Li X, et al. **FAVOR: functional annotation of variants online resource and annotator for variation across the human genome.** *Nucleic Acids Research*, 51(D1), D1300-D1311 (2023). [DOI: 10.1093/nar/gkac966](https://doi.org/10.1093/nar/gkac966)

> Li Z\*, Li X\*, Zhou H, et al. **A framework for detecting noncoding rare variant associations of large-scale whole-genome sequencing studies.** *Nature Methods*, 19(12), 1599-1611 (2022). [DOI: 10.1038/s41592-022-01640-x](https://doi.org/10.1038/s41592-022-01640-x)

> Li TC, Zhou H, Verma V, et al. **FAVOR-GPT: a generative natural language interface to whole genome variant functional annotations.** *Bioinformatics Advances*, 4(1), vbae143 (2024). [DOI: 10.1093/bioadv/vbae143](https://doi.org/10.1093/bioadv/vbae143)

## License

[GPL-3.0](LICENSE)
