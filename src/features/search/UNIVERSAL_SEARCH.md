# UniversalSearch Component

A modern, production-ready replacement for `GenomicSearch` built following the 10 Commandments of software engineering.

## Overview

`UniversalSearch` is a complete rewrite that integrates with the new typeahead API (`/api/v1/typeahead`) and provides search across all entity types: genes, variants, diseases, drugs, and pathways.

## Key Improvements

### 1. **Follows the 10 Commandments**

#### ✅ Commandment I: Parse, Not Validate
```tsx
// ❌ Old way: strings everywhere
const genome = "hg38"; // Could be anything

// ✅ New way: branded types
type GenomeBuild = "hg38" | "hg19";
const genome: GenomeBuild = "hg38"; // Type-safe
```

#### ✅ Commandment II: Make Invalid States Unrepresentable
```tsx
// ❌ Old way: boolean flags
{
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// ✅ New way: discriminated union
type SearchState =
  | { type: "idle" }
  | { type: "typing"; query: string }
  | { type: "error"; message: string };
```

#### ✅ Commandment III: Separate Commands from Queries
```tsx
// Query: Pure function - no side effects
function createSuggestionOptions(results) {
  // Pure derivation, always same output for same input
  return options;
}

// Command: Explicit mutation
function handleSelectSuggestion(suggestion) {
  // Clear side effect: navigation
  router.push(url);
}
```

#### ✅ Commandment V: Flatten Control Flow
```tsx
// ❌ Old way: nested ifs
if (query) {
  if (suggestions.length > 0) {
    if (firstSuggestion.entity) {
      // Logic here
    }
  }
}

// ✅ New way: guard clauses
if (!query.trim()) {
  setError("Empty query");
  return;
}

if (suggestions.length === 0) {
  setError("No results");
  return;
}

// Happy path: zero indentation
handleNavigation(firstSuggestion);
```

#### ✅ Commandment VI: Handle All Outcomes
```tsx
// No .unwrap() or .expect()
// All branches handled explicitly
const url = buildNavigationUrl(suggestion, genome);

if (url) {
  router.push(url);
} else {
  setError("Page coming soon");
}
```

#### ✅ Commandment X: Inject Dependencies
```tsx
// Hook injected, not hardcoded
const { query, setQuery, results, isLoading } = useTypeahead({
  minLength: 2,
  debounce: 200,
});
```

### 2. **React 19 Best Practices**

```tsx
// useCallback for stable references
const handleSubmit = useCallback((e: FormEvent) => {
  e.preventDefault();
  // Logic...
}, [query, suggestions, genome]);

// Proper type safety
interface SuggestionOption {
  id: string;
  value: string;
  type: "entity" | "empty";
  entity?: TypeaheadSuggestion;
}

// No unnecessary renders
const suggestions = createSuggestionOptions(results); // Derived
```

### 3. **Integration with New API**

Uses the new typeahead endpoint:
- `/api/v1/typeahead` - Fast autocomplete
- Returns all entity types
- Rich metadata (descriptions, link counts, previews)

### 4. **Feature Parity with GenomicSearch**

✅ Genome selection (HG38/HG19)
✅ Rich autocomplete suggestions
✅ Error handling with alerts
✅ Submit on Enter
✅ Loading states
✅ Clean, accessible UI

## Usage

### Replace GenomicSearch

```tsx
// Before
import { GenomicSearch } from '@/features/search/components/genomic-search';

export default function Page() {
  return <GenomicSearch />;
}
```

```tsx
// After
import { UniversalSearch } from '@/features/search';

export default function Page() {
  return <UniversalSearch />;
}
```

### Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UniversalSearch } from './universal-search';

test('shows error for empty search', () => {
  render(<UniversalSearch />);

  const button = screen.getByText('Search');
  fireEvent.click(button);

  expect(screen.getByText(/Please enter a search term/i)).toBeInTheDocument();
});
```

## Architecture

### Pure Functions (Queries)

```tsx
// createSuggestionOptions: Results → SuggestionOption[]
// buildNavigationUrl: (Suggestion, Genome) → URL | null
```

These have **zero side effects**. Safe to call multiple times. Easy to test.

### Effectful Functions (Commands)

```tsx
// handleSubmit: FormEvent → void
// handleSelectSuggestion: Suggestion → void
// handleInputChange: string → void
```

These cause **mutations** (navigation, state changes). Called explicitly.

### State Management

```tsx
type SearchState =
  | { type: "idle" }                      // Initial state
  | { type: "typing"; query: string }     // User typing
  | { type: "error"; message: string };   // Error occurred
```

Impossible to be in two states at once. Compiler enforces exhaustiveness.

## Entity Type Support

| Entity    | Navigation       | Status      |
|-----------|------------------|-------------|
| Genes     | Direct page      | ✅ Working   |
| Variants  | Direct page      | ✅ Working   |
| Diseases  | Coming soon msg  | 🔄 Pending  |
| Drugs     | Coming soon msg  | 🔄 Pending  |
| Pathways  | Coming soon msg  | 🔄 Pending  |

When disease/drug/pathway pages are created:
1. Update `hasEntityPage()` in `utils/entity-routes.ts`
2. Ensure API returns `url` field
3. Navigation will work automatically

## Performance

- **Debounce**: 200ms (balances responsiveness and API load)
- **Min query length**: 2 characters
- **Results limit**: 5 per entity type
- **API response**: Target ~15ms (from backend)
- **Total latency**: ~215ms from keystroke to results

## Error Handling

No crashes. All errors handled gracefully:

```tsx
// Empty query → Alert shown
// No results → Helpful message
// Entity without page → "Coming soon" message
// API failure → Caught by hook, error state set
```

## Migration Guide

### Step 1: Test in Parallel

```tsx
import { GenomicSearch } from './genomic-search';
import { UniversalSearch } from './universal-search';

// A/B test
const useNewSearch = process.env.NEXT_PUBLIC_NEW_SEARCH === 'true';

export default function Page() {
  return useNewSearch ? <UniversalSearch /> : <GenomicSearch />;
}
```

### Step 2: Compare Behavior

- Search for genes (BRCA1, APOE)
- Search for variants (rs7412)
- Test error states
- Verify genome toggle
- Check navigation

### Step 3: Replace

Once validated, replace all instances:

```bash
# Find all usages
grep -r "GenomicSearch" src/

# Replace imports
# Update all occurrences to UniversalSearch
```

### Step 4: Remove Old Code

After successful deployment:

```bash
rm src/features/search/components/genomic-search.tsx
```

## Troubleshooting

### Issue: No suggestions appear

**Check:**
1. API endpoint is running (`http://localhost:8000/api/v1/typeahead`)
2. Query is at least 2 characters
3. Network tab shows successful response
4. `results.total > 0` in React DevTools

### Issue: Navigation doesn't work

**Check:**
1. Entity has `url` field in API response
2. `hasEntityPage(entity.type)` returns true
3. Router is properly imported from `next/navigation`

### Issue: Highlight is undefined error

**Fixed!** The component now handles missing `highlight` gracefully:

```tsx
{suggestion.highlight ? (
  <span dangerouslySetInnerHTML={{ __html: suggestion.highlight }} />
) : (
  suggestion.name
)}
```

## Code Quality

- ✅ **Zero TypeScript errors**
- ✅ **Exhaustive pattern matching**
- ✅ **No `any` types**
- ✅ **Pure functions extracted**
- ✅ **Commands clearly named**
- ✅ **Single source of truth**
- ✅ **Proper dependency injection**

## Future Enhancements

- [ ] Save search functionality
- [ ] Search history
- [ ] Keyboard shortcuts (↑↓ for navigation)
- [ ] Analytics tracking
- [ ] Advanced filters
- [ ] Batch search

## Credits

Built following principles from:
- **The 10 Commandments** (`docs/the10commendments.txt`)
- **React 19** best practices
- **Next.js 15** app router patterns
