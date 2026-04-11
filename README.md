<p align="center">
  <h1 align="center">FAVOR</h1>
  <p align="center">
    Functional Annotation of Variants Online Resource
    <br />
    <strong>Search. Annotate. Interpret. ~8.9 billion variants.</strong>
    <br />
    <br />
    <a href="#features">Features</a> &middot; <a href="#quick-start">Quick Start</a> &middot; <a href="#architecture">Architecture</a> &middot; <a href="#deployment">Deployment</a> &middot; <a href="#citation">Citation</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/vineetver/favor/actions/workflows/ci.yml"><img src="https://github.com/vineetver/favor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License"></a>
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js">
  <img src="https://img.shields.io/badge/react-19-61dafb" alt="React">
  <img src="https://img.shields.io/badge/typescript-5-3178c6" alt="TypeScript">
</p>

---

## Features

FAVOR is a Next.js App Router frontend for a genomics platform covering:

### Scale and visualization
- **Genome-wide browsing at 8.9B-variant scale** — Gosling.js + higlass tile servers stream zoomable tracks across the entire human genome with no client-side aggregation
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

```bash
git clone https://github.com/vineetver/favor.git
cd favor
pnpm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL, FAVOR_API_KEY, GA_TRACKING_ID
pnpm dev                     # http://localhost:3000
```

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build (Next.js + webpack) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome auto-format |

## Architecture

```
src/
├── app/                  Next.js App Router routes + local API
│   └── api/              Local API (chat, AI text stream)
├── features/             Domain modules, self-contained
│   ├── search/           Universal search and typeahead
│   ├── variant/          Variant detail pages
│   ├── gene/             Gene detail pages
│   ├── disease/          Disease detail pages
│   ├── drug/             Drug detail pages
│   ├── enrichment/       Regulatory and tissue data
│   ├── perturbation/     CRISPR / Perturb-seq / MAVE
│   ├── genome-browser/   Gosling.js genome browser
│   ├── alphagenome/      AlphaGenome predictions
│   ├── batch/            Cohort annotation workflow
│   ├── agent/            AI agent workspace
│   └── settings/         Auth, quotas, API keys
├── shared/               Presentational UI and hooks
├── infrastructure/       Lower-level clients (OpenTargets, AI text)
└── config/               App-level config (API base, site metadata)
```

Import aliases: `@/*` → `src/*`, `@features/*` → `src/features/*`, `@shared/*` → `src/shared/*`, `@infra/*` → `src/infrastructure/*`.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** + shadcn/ui primitives
- **TanStack Query** for server state
- **AI SDK** — `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/deepseek`
- **Cytoscape** + **XYFlow** for knowledge graph
- **Gosling.js** + **DuckDB WASM** for genomics
- **Plotly** + **Recharts** for charts

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1   # backend base URL
FAVOR_API_KEY=                                      # server-side only, for SSE proxy
GA_TRACKING_ID=                                     # Google Analytics ID
```

## Deployment

Deployed on Vercel:

- **Beta** — [favor-beta.genohub.org](https://favor-beta.genohub.org) (active development)
- **Production** — [favor.genohub.org](https://favor.genohub.org)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Citation

FAVOR is the frontend for the [FAVOR](https://favor.genohub.org) functional annotation database. If you use FAVOR, please cite:

> Zhou H, Verma V, Li X, et al. **FAVOR 2.0: A reengineered functional annotation of variants online resource for interpreting genomic variation.** *Nucleic Acids Research*, 54(D1), D1405-D1414 (2026). [DOI: 10.1093/nar/gkaf1217](https://doi.org/10.1093/nar/gkaf1217)

> Zhou H, Arapoglou T, Li X, et al. **FAVOR: functional annotation of variants online resource and annotator for variation across the human genome.** *Nucleic Acids Research*, 51(D1), D1300-D1311 (2023). [DOI: 10.1093/nar/gkac966](https://doi.org/10.1093/nar/gkac966)

> Li Z\*, Li X\*, Zhou H, et al. **A framework for detecting noncoding rare variant associations of large-scale whole-genome sequencing studies.** *Nature Methods*, 19(12), 1599-1611 (2022). [DOI: 10.1038/s41592-022-01640-x](https://doi.org/10.1038/s41592-022-01640-x)

> Li TC, Zhou H, Verma V, et al. **FAVOR-GPT: a generative natural language interface to whole genome variant functional annotations.** *Bioinformatics Advances*, 4(1), vbae143 (2024). [DOI: 10.1093/bioadv/vbae143](https://doi.org/10.1093/bioadv/vbae143)

## License

[GPL-3.0](LICENSE)
