<p align="center">
  <h1 align="center">FAVOR</h1>
  <p align="center">
    Functional Annotation of Variants Online Resource
    <br />
    <a href="https://favor-beta.genohub.org">Beta</a> &middot; <a href="https://favor.genohub.org">Production</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/vineetver/favor/actions/workflows/ci.yml"><img src="https://github.com/vineetver/favor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License"></a>
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js">
  <img src="https://img.shields.io/badge/react-19-61dafb" alt="React">
</p>

---

Web frontend for [FAVOR](https://favor-beta.genohub.org), an AI-first whole-genome variant functional annotation platform covering WGS, single-cell, and multi-omics datasets to accelerate drug discovery and disease association through fast variant interpretation.

## Features

### Scale and visualization
- **Genome-wide browsing at 8.9B-variant scale** — Gosling.js + HiGlass tile servers stream zoomable tracks across the entire human genome with no client-side aggregation
- **In-browser SQL over parquet** — DuckDB WASM runs queries on cohort files client-side, no server round-trips for millions of rows
- **Server-side tables** — TanStack Table wired to backend pagination, sorting, filtering, and column selection for variant and cohort datasets
- **Interactive knowledge graphs** — Cytoscape and XYFlow render variant-gene-disease-drug relationships as navigable graphs
- **Statistical and locus plots** — Manhattan, QQ, tissue heatmaps, allele-frequency distributions via Plotly and Recharts

### Search and discovery
- **Universal search** across variants, genes, diseases, drugs, and studies with typeahead and intent routing
- **Variant detail pages** — annotation, GWAS, gnomAD population ancestry, per-tissue QTLs, ChromBPNet scores, allelic imbalance, methylation
- **Gene detail pages** — variant scanning, summary statistics, pathway and drug-target lookups
- **Disease and drug pages** — Open Targets GraphQL integration, evidence summaries
- **Regulatory genomics** — cCRE, QTL, enhancer-gene links, chromatin states, loops, perturbation data (CRISPR / Perturb-seq / MAVE)

### AI and agent workflows
- **AI agent workspace** — graph-aware multi-turn LLM agent with tool use, cohort context, and persistent memory
- **AI entity summaries** — on-demand LLM summaries for variants, genes, and diseases, streamed via SSE
- **Multi-model support** — OpenAI and DeepSeek, switchable per session
- **Async job orchestration** — AlphaGenome variant prediction with submit-and-poll and progress tracking

### Platform
- **Batch annotation** — authenticated cohort upload, parquet validation, column derivation, analytics runs, tissue-specific enrichment packs
- **Authenticated workflows** — cookie-based auth, quota display, personal API keys, authenticated SSE proxy for streaming
- **Shareable URL state** — deep links that round-trip for genome browser coordinates, search, and agent sessions
- **Type-safe API layer** — feature-isolated clients, responses parsed at the boundary into branded types

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
