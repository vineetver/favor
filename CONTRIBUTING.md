# Contributing

## Build

```bash
git clone https://github.com/vineetver/favor.git
cd favor
pnpm install
pnpm dev              # local dev server at http://localhost:3000
pnpm build            # production build
pnpm lint             # Biome check
pnpm format           # Biome auto-format
```

Node 22+ and pnpm 10+ required.

## Workflow

1. Fork the repo and create a branch from `beta`
2. Make your changes
3. `pnpm lint` passes with zero warnings
4. `pnpm build` succeeds locally
5. Open a pull request against `beta`

## Code standards

**Every line ships.** No commented-out code, placeholder TODOs, or dead code.

| Principle | In practice |
|-----------|-------------|
| Parse at the boundary | Zod-validate API responses into branded types. Never trust `unknown`. |
| Discriminated unions | Model UI state as unions, not boolean soup. |
| Flat control flow | Early returns and guard clauses. No four-level nesting. |
| Feature isolation | Domain logic lives in `src/features/*`, never in `src/shared`. |
| Dumb shared components | `src/shared/components/ui` is presentational, no feature-specific logic. |
| Thin infrastructure | `src/infrastructure/*` is IO only: clients, fetchers, parsing. |
| Narrow exports | Export only what's used. Prefer feature-level `index.ts` barrels. |

## Architecture

```
src/
  app/              Next.js pages, layouts, local API routes
  features/         Domain modules (search, variant, gene, disease, drug, ...)
  shared/           Reusable components and hooks
  infrastructure/   External service clients
  config/           App-level config
```

Import aliases (see `tsconfig.json`):

- `@/*` → `src/*`
- `@features/*` → `src/features/*`
- `@shared/*` → `src/shared/*`
- `@infra/*` → `src/infrastructure/*`

## Adding a feature

1. Create `src/features/<name>/` — colocate components, hooks, API client, and types
2. Expose only the cross-feature surface via `src/features/<name>/index.ts`
3. Keep shared UI in `src/shared/components/ui` — never put feature logic there
4. If a shadcn/ui component already exists or should exist, prefer that over a bespoke primitive

## Bugs

Use the [bug report template](https://github.com/vineetver/favor/issues/new?template=bug_report.yml). Include the URL where the bug happened and any browser console errors.

## License

By contributing you agree your contributions are licensed under [GPL-3.0](LICENSE).
