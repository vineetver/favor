# FAVOR

**Functional Annotation of Variants Online Resource**

An open-access variant functional annotation portal for whole genome sequencing (WGS/WES) data. FAVOR contains ~9 billion variants (all possible SNVs and observed indels).

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Lint and format
pnpm lint
pnpm format
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/              # Next.js pages (App Router)
├── features/         # Domain modules (disease, drug, search, variant)
├── shared/           # Reusable components
├── infrastructure/   # External service clients (ES, OpenTargets, etc.)
├── config/           # App configuration
└── generated/        # Auto-generated types (Prisma)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

## Tech Stack

- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **TanStack Query/Table**
- **Radix UI**
- **Recharts**
- **Gosling.js** (genomic visualization)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
ELASTICSEARCH_URL=
OPENAI_API_KEY=
UPSTASH_REDIS_URL=
GA_TRACKING_ID=
```
