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

### AI and agent workflows
- **FAVOR Agent**: Claude Code for variant interpretation. For biobank-scale rare-variant analysis, see [FAVOR CLI](https://github.com/vineetver/favor-cli).
- **Structured RAG over the knowledge graph**: plain-English queries compile into one server-side plan across Kuzu, ClickHouse, and parquet. N-hop traversals finish in one round-trip instead of N API calls.
- **Seven graph modes**:
  - `chain`: multi-hop (Disease <-> Gene <-> Drug, Variant <-> Gene <-> Pathway)
  - `neighbors`: direct links
  - `context`: surrounding facts
  - `compare`: two entities side by side
  - `aggregate`: group and count
  - `enrich`: statistical overrepresentation
  - `paths`: shortest path between two entities
- **Multi-step workflows** with stateful agents, e.g.:
  - variant list → gene → function → pathway, with GWAS stats
  - variant → predicted cell effect (multi-omics, IGVF)
  - variant → measured cell effect (CRISPRi, MPRA, MAVE, base editing)
- **Generative UI**: ten inline chat components (bar, comparison, distribution, enrichment, heatmap, network, protein structure, QQ, scatter, stat card).
- **Persistent workspace**: variant lists, tool outputs, pinned entities across turns.
- **AlphaGenome**: async submit-and-poll for DeepMind's variant-effect predictor.

### Scale and visualization
- **8.9B-variant genome browser**: Gosling.js and HiGlass, no client-side aggregation.
- **In-browser SQL**: DuckDB WASM over parquet.
- **Server-side tables**: TanStack Table with backend pagination, sort, filter, column select.
- **Interactive knowledge graphs**: Cytoscape and XYFlow over variant, gene, disease, drug.
- **Locus plots**: Manhattan, QQ, tissue heatmaps, allele-frequency distributions.

### Search and discovery
- **Universal search** across variants, genes, diseases, drugs, studies. Typeahead, intent routing.
- **Variant pages**: annotation, GWAS, gnomAD ancestry, tissue QTLs, ChromBPNet, allelic imbalance, methylation.
- **Gene pages**: variant scan, summary stats, pathways, drug targets.
- **Disease and drug pages**: Open Targets GraphQL, evidence summaries.
- **Regulatory genomics**: cCRE, QTL, enhancer-gene links, chromatin states, loops.

### Platform
- **Batch annotation**: variant list upload, parquet validation, analytics runs, tissue enrichment packs.
- **Auth**: cookies, quotas, personal API keys, authenticated SSE proxy.
- **Shareable URLs**: deep links round-trip for browser, search, and agent state.
- **Type-safe API**: feature-isolated clients, boundary parsing into branded types.

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
