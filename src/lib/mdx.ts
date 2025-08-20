export interface ReleaseFeature {
  id: string
  title: string
  description: string
  status: 'new' | 'improved' | 'beta' | 'coming-soon'
  category: 'genomics' | 'ui' | 'data' | 'performance' | 'api'
  date?: string
  version?: string
  content?: string
  image?: string
  demo?: string
}

export async function getReleaseFeatures(): Promise<ReleaseFeature[]> {
  return [
    {
      id: 'v2025-1-enhanced-gene-view',
      title: 'Enhanced Gene Detail Views',
      description: 'Complete redesign of gene pages with improved data visualization, faster loading times, and better user experience.',
      status: 'new',
      category: 'genomics',
      version: 'v2025.1',
      date: '2025-01-15',
      content: `
# Enhanced Gene Views

We've completely redesigned our gene detail pages to provide you with more comprehensive and accessible genomic information.

## Key Improvements

- **Faster Loading**: New streaming architecture reduces page load times by 60%
- **Better Data Visualization**: Enhanced charts and graphs for clearer insights
- **Improved Navigation**: Streamlined interface for easier data exploration
- **Mobile Responsive**: Full functionality across all device sizes

## What's New

### Interactive Data Panels
- Real-time filtering and sorting
- Expandable sections for detailed analysis  
- Export functionality for all data views

### Enhanced Visualizations
- New tissue-specific expression heatmaps
- Interactive pathway diagrams
- Improved constraint visualization

## Technical Details

This update includes significant performance optimizations using Next.js 14 App Router and React Server Components, enabling faster initial page loads and smoother interactions.
`,
      demo: 'https://favor.genohub.org/gene/BRCA1'
    },
    {
      id: 'v2025-1-cosmic-integration',
      title: 'COSMIC Database Integration',
      description: 'Direct integration with COSMIC mutation database for comprehensive cancer genomics analysis.',
      status: 'new', 
      category: 'data',
      version: 'v2025.1',
      date: '2025-01-10',
      content: `
# COSMIC Database Integration

We've integrated the latest COSMIC mutation database to provide comprehensive cancer genomics insights directly within FAVOR.

## Features

- **Mutation Hotspots**: Identify frequently mutated regions
- **Cancer Type Analysis**: Filter by specific cancer types
- **Clinical Significance**: Access curated clinical annotations
- **Structural Variants**: Browse large-scale genomic rearrangements

## Data Coverage

- Over 1.4 million coding mutations
- 500+ cancer types and subtypes  
- Curated clinical significance scores
- Regular monthly updates from COSMIC v99+
`,
      demo: 'https://favor.genohub.org/gene/TP53/cosmic'
    },
    {
      id: 'v2025-1-advanced-search',
      title: 'Advanced Search Capabilities',
      description: 'Powerful new search with auto-suggestions, filters, and saved search functionality.',
      status: 'improved',
      category: 'ui',
      version: 'v2025.1', 
      date: '2025-01-08',
      content: `
# Advanced Search

Our enhanced search system makes finding genomic data faster and more intuitive than ever.

## New Features

### Smart Auto-complete
- Gene symbol suggestions
- Variant format validation
- Genomic coordinate parsing

### Advanced Filters
- Data type filtering (variants, genes, regions)
- Quality score thresholds
- Population frequency ranges

### Search History & Bookmarks
- Save frequently used searches
- Quick access to recent queries
- Share searches with team members

## Search Formats Supported

- Gene symbols (e.g., \`BRCA1\`, \`TP53\`)
- Genomic coordinates (\`chr1:123456-234567\`)
- rsID variants (\`rs123456789\`)
- Protein changes (\`p.Gly12Val\`)
`
    }
  ]
}