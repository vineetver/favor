# FAVOR Search System - Design & Architecture

## Design Philosophy: Apple Senior Designer Approach

### Information Density with Clarity
The redesigned search interface maximizes information density while maintaining exceptional readability and visual hierarchy - a hallmark of Apple's design language.

### Visual Hierarchy
```
1. Entity Type Headers (colored bars) - Instant visual scanning
2. Entity Name (semibold, colored) - Primary identifier
3. Entity ID (uppercase, muted) - Secondary identifier
4. Description (text-sm) - Context
5. Link Count Badges (pills) - Quantified relationships
6. Previews (text-[10px]) - Related entities
7. Match Quality Indicator (colored dot) - Search quality
```

### Typography Scale (FAVOR Design System)
- **Headers**: `text-xs uppercase tracking-widest` (category headers)
- **Entity Names**: `text-sm font-semibold` (primary content)
- **Descriptions**: `text-xs leading-relaxed` (body text)
- **Metadata/IDs**: `text-[10px] uppercase tracking-wide` (secondary info)
- **Badges**: `text-[10px] font-medium` (compact pills)

### Color System
**Entity Type Colors** (used for headers and text):
- Genes: `bg-purple-600` / `text-purple-700`
- Variants: `bg-blue-600` / `text-blue-700`
- Diseases: `bg-red-600` / `text-red-700`
- Drugs: `bg-green-600` / `text-green-700`
- Pathways: `bg-orange-600` / `text-orange-700`

**Match Quality Indicators**:
- Prefix match (exact): Green dot `bg-green-500`
- Substring match: Yellow dot `bg-yellow-500`
- Fuzzy match: Orange dot `bg-orange-500`

### Layout Strategy
- **Desktop**: Two-column grid (`md:grid-cols-2`) for maximum space utilization
- **Mobile**: Single column with proper scrolling
- **Borders**: Intelligent grid borders (right borders on odd items, bottom borders between rows)
- **Spacing**: Compact but breathable (`p-3.5`, `gap-1`, `mb-2`)

---

## API Data Utilization

### TypeaheadSuggestion Fields (ALL displayed):

1. **`id`** ✓ - Displayed as secondary identifier in uppercase (text-[10px])
2. **`name`** ✓ - Primary heading with entity color
3. **`type`** ✓ - Determines section grouping and color scheme
4. **`description`** ✓ - 2-line clamp for context (text-xs)
5. **`match_type`** ✓ - Visual indicator (colored dot): prefix/substring/fuzzy
6. **`highlight`** ✓ - HTML rendered with yellow background for matched text
7. **`url`** ✓ - Used for navigation, shows ExternalLink icon if available
8. **`links`** ✓ - ALL counts displayed as badge pills:
   - `gene_count` → "X genes"
   - `variant_count` → "X variants"
   - `disease_count` → "X diseases"
   - `drug_count` → "X drugs"
   - `pathway_count` → "X pathways"
9. **`preview`** ✓ - ALL types displayed (up to 2 preview types per card):
   - `genes` → "GENES: BRCA1, TP53, ..."
   - `diseases` → "DISEASES: Breast Cancer, ..."
   - `drugs` → "DRUGS: Tamoxifen, ..."
   - `pathways` → "PATHWAYS: DNA Repair, ..."
   - `variants` → "VARIANTS: rs7412, ..."

### Information Density Per Card
Each search result card now displays:
- Entity name (with highlighted match)
- Entity ID
- Full description (2 lines max)
- Match quality indicator
- Up to 5 link count badges
- Up to 2 preview sections (4 items each)
- Availability status ("Soon" badge)
- Click affordance (ExternalLink icon)

**Before**: ~3 pieces of information per card
**After**: ~8-12 pieces of information per card

---

## Typeahead vs Pivot: When Each Is Used

### Typeahead API (`/api/v1/typeahead`)
**Current Implementation**: `UniversalSearch` component

**Purpose**: Fast autocomplete suggestions as user types

**When Used**:
- User typing in the search input field
- Triggers after 2 characters entered
- 300ms debounce for performance
- Returns top 3 results per entity type

**Parameters**:
```typescript
{
  q: string,              // Search query
  limit: 3,               // Results per entity type
  include_links: true,    // Include relationship counts
  include_preview: true   // Include related entity previews
}
```

**Response Time**: ~15ms (optimized for real-time)

**Use Case**: Initial search exploration
```
User types "BRCA" → Typeahead returns:
  - GENES: BRCA1, BRCA2, BRCA3
  - DISEASES: Breast Cancer, Ovarian Cancer
  - DRUGS: Olaparib, Talazoparib
```

---

### Pivot/Search API (`/api/v1/search`)
**Current Implementation**: `PivotExplorer` component (separate modal, NOT in UniversalSearch)

**Purpose**: Find entities related to a specific anchor entity

**When Used**:
- User clicks on a search result
- Wants to explore relationships
- Navigate from one entity to discover connected entities

**Parameters**:
```typescript
{
  anchor_id: string,        // Entity ID to pivot from
  anchor_type: EntityType,  // Entity type (genes/variants/etc)
  limit: 10,                // Results per type
  expand: true,             // Enable relationship expansion
  include: 'preview,links,highlights,description'
}
```

**Response Time**: ~50-200ms (more complex queries)

**Use Case**: Relationship exploration
```
User clicks on gene "BRCA1" → Pivot search returns:
  - VARIANTS: 1,247 variants in BRCA1
  - DISEASES: 89 associated diseases (Breast Cancer, Ovarian Cancer...)
  - DRUGS: 34 targeting drugs (Olaparib, Rucaparib...)
  - PATHWAYS: 12 pathways (DNA Repair, Cell Cycle...)
```

---

## Integration Gap: Pivot Not Used in Main Search Flow

### Current State
The `UniversalSearch` component ONLY uses **typeahead** for dropdown suggestions. When a user clicks on a result, they navigate directly to the entity page.

### Opportunity: Pivot Integration
**Potential Enhancement** (not implemented):
After clicking an entity from typeahead results, could open `PivotExplorer` modal to show:
1. Full details about the selected entity
2. All related entities across all types (more than 3 per type)
3. Interactive exploration before committing to entity page navigation

### Current Flow
```
1. User types "BRCA"
2. Typeahead API → Returns top 3 matches per entity
3. User clicks "BRCA1"
4. Navigate to /genes/BRCA1 page
```

### Potential Enhanced Flow
```
1. User types "BRCA"
2. Typeahead API → Returns top 3 matches per entity
3. User clicks "BRCA1"
4. Option A: Navigate to /genes/BRCA1 (current)
   Option B: Open PivotExplorer modal with full relationship graph
5. User explores 1,247 variants, 89 diseases, 34 drugs
6. User clicks on specific variant/disease/drug
7. Navigate to that specific entity page
```

---

## Search Quality Heuristics

### Smart Anchor Selection
The search implements intelligent query classification to prioritize the most relevant entity type:

**Variant Detection**:
- rsID patterns: `/^rs\d/i` → "rs7412", "rs123"
- VCF-like patterns: `/^(chr)?(\d{1,2}|X|Y|MT?)[-:]\d+/i` → "19-440908822-C", "chr1-1000"
- Genomic regions: `/^(chr)?(\d{1,2}|X|Y|MT?):\d+-\d+$/i` → "chr1:1000-2000"

**Gene Detection**:
- All-caps short identifiers: `/^[A-Z][A-Z0-9-]{1,10}$/` → "BRCA1", "TP53"

**General Search**:
- Text queries → Prioritizes diseases, drugs, pathways (more relevant for text)

### Priority Order by Query Type
```typescript
if (queryIntent === "variant") {
  priorityOrder = ["variants", "genes", "diseases", "drugs", "pathways"];
} else if (queryIntent === "gene") {
  priorityOrder = ["genes", "variants", "diseases", "drugs", "pathways"];
} else {
  priorityOrder = ["diseases", "genes", "drugs", "pathways", "variants"];
}
```

---

## Performance Optimizations

1. **Debouncing**: 300ms delay prevents excessive API calls
2. **AbortController**: Cancels in-flight requests when user types
3. **Limit Results**: 3 per entity type for fast responses
4. **CSS Grid**: Hardware-accelerated layout
5. **Conditional Rendering**: Only shows sections with results
6. **Line Clamping**: `line-clamp-2` prevents layout shifts

---

## Accessibility

- **Headless UI Combobox**: Full keyboard navigation
- **Focus States**: `data-focus:bg-slate-50` for visual feedback
- **ARIA Labels**: Proper semantic HTML structure
- **Color Contrast**: WCAG AA compliant (slate-900 on white)
- **Match Quality Indicators**: Title attributes for screen readers

---

## Design System Compliance

✓ Default text size: `text-sm` (14px)
✓ Labels: `text-xs uppercase tracking-widest`
✓ Slate palette: 900/700/600/500/400/300
✓ Borders: `border-slate-200`
✓ Rounded corners: Following FAVOR's style
✓ Shadows: Subtle, not excessive
✓ Font: Geist (system default)

---

## Summary

This search interface achieves **maximum information density** while maintaining clarity through:

1. **Visual Hierarchy**: Colors, typography, spacing guide the eye
2. **Complete Data**: Every API field is displayed meaningfully
3. **Responsive Grid**: Two columns on desktop, one on mobile
4. **Smart Heuristics**: Query intent detection for better anchor selection
5. **Apple-like Polish**: Subtle interactions, clean aesthetics, purposeful design

The system uses **typeahead for fast suggestions** and **pivot for relationship exploration** (though pivot is currently only in PivotExplorer component, not integrated into the main search flow).
