// Base navigation link (backward compatible)
export interface NavigationLink {
  text: string;
  slug: string;
}

// Navigation item with optional icon (as string name)
export interface NavigationItem {
  text: string;
  slug: string;
  icon?: string; // Icon name, e.g., "sparkles", "heart-pulse", "dna"
}

// Group of navigation items with a header
export interface NavigationGroup {
  name: string; // Displayed as uppercase header
  items: NavigationItem[];
  defaultExpanded?: boolean;
}

// Section with both flat (legacy) and grouped navigation
export interface NavigationSection {
  name: string;
  slug: string;
  subCategories: NavigationLink[]; // Keep for mobile nav
  groups?: NavigationGroup[]; // For grouped sidebar
  showIcons?: boolean; // Set to false to hide icons in this section (default: true)
}
