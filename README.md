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

Web frontend for [FAVOR](https://favor.genohub.org), an AI-first whole-genome variant functional annotation platform covering WGS, single-cell, and multi-omics datasets to accelerate drug discovery and disease association through fast variant interpretation.

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

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome auto-format |

## Project Structure

```
src/
├── app/                  Routes + local API (chat, AI text stream)
├── features/             Domain modules (search, variant, gene, disease,
│                         drug, enrichment, batch, agent, etc.)
├── shared/               Reusable UI components and hooks
├── infrastructure/       API clients (OpenTargets, AI text)
└── config/               App-level config
```

Import aliases: `@/*` → `src/*`, `@features/*`, `@shared/*`, `@infra/*`.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, AI SDK (OpenAI + DeepSeek), Cytoscape, XYFlow, Gosling.js, DuckDB WASM, Plotly, Recharts.

## Deployment

Deployed on Vercel:

| Environment | URL | Branch |
|-------------|-----|--------|
| Beta | [favor-beta.genohub.org](https://favor-beta.genohub.org) | `beta` |
| Production | [favor.genohub.org](https://favor.genohub.org) | `master` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## Citation

> Zhou H, Verma V, Li X, et al. **FAVOR 2.0: A reengineered functional annotation of variants online resource for interpreting genomic variation.** *Nucleic Acids Research*, 54(D1), D1405-D1414 (2026). [DOI: 10.1093/nar/gkaf1217](https://doi.org/10.1093/nar/gkaf1217)

> Zhou H, Arapoglou T, Li X, et al. **FAVOR: functional annotation of variants online resource and annotator for variation across the human genome.** *Nucleic Acids Research*, 51(D1), D1300-D1311 (2023). [DOI: 10.1093/nar/gkac966](https://doi.org/10.1093/nar/gkac966)

> Li Z\*, Li X\*, Zhou H, et al. **A framework for detecting noncoding rare variant associations of large-scale whole-genome sequencing studies.** *Nature Methods*, 19(12), 1599-1611 (2022). [DOI: 10.1038/s41592-022-01640-x](https://doi.org/10.1038/s41592-022-01640-x)

> Li TC, Zhou H, Verma V, et al. **FAVOR-GPT: a generative natural language interface to whole genome variant functional annotations.** *Bioinformatics Advances*, 4(1), vbae143 (2024). [DOI: 10.1093/bioadv/vbae143](https://doi.org/10.1093/bioadv/vbae143)

## License

[GPL-3.0](LICENSE)
