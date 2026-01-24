# FAVOR Project Guidelines

## Key Files
- `docs/DESIGN_SYSTEM.md` - **Full design system documentation** (READ THIS FIRST)
- `src/app/globals.css` - Theme tokens and CSS component classes
- `src/app/page.tsx` - Reference implementation for styling patterns

## Typography Classes (defined in globals.css)

| Use Case | Class | Example |
|----------|-------|---------- |
| Page titles | `text-page-title` | `<h1 className="text-page-title">` |
| Card section headers | `text-label` | `<CardTitle className="text-label">` |
| Definition terms | `text-dt` | `<dt className="text-dt">` |
| Breadcrumb text | `text-breadcrumb` | Container class |
| Breadcrumb IDs | `text-breadcrumb-mono` | Monospace IDs |
| Stats numbers | `text-stat-value` | Large display numbers |
| Stats labels | `text-stat-label` | Labels below stats |
| Data values | `text-data` | Mono, 15px |
| Nav links | `text-nav` | 16px medium |

## Semantic Colors

| Token | Class | Usage |
|-------|-------|-------|
| Headings | `text-heading` | Important text, titles |
| Body | `text-body` | Secondary text (slate-500) |
| Muted | `text-subtle` | Labels, hints (slate-400) |

## Quick Rules

1. **Page container**: `max-w-[1400px] mx-auto px-6 lg:px-12`
2. **Page header**: `py-8` vertical padding
3. **Borders**: Always `border-slate-200`
4. **Card titles**: Use `text-label` (not inline styles)
5. **Definition lists**: Use `text-dt` for `<dt>` elements

## Don'ts

- ❌ Don't use `text-xs font-bold uppercase tracking-widest` → use `text-label`
- ❌ Don't use `text-slate-900` directly → use `text-heading`
- ❌ Don't use `text-slate-400` for labels → use `text-subtle`

## Tech Stack
- Next.js (App Router)
- Tailwind CSS v4
- TanStack Table
- Recharts
- Radix UI primitives
