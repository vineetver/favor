// Base navigation link (backward compatible)
export interface VariantNavigationLink {
  text: string;
  slug: string;
}

// Navigation item with optional icon (as string name)
export interface NavigationItem {
  text: string;
  slug: string;
  icon?: string; // Icon name, e.g., "sparkles", "heart-pulse"
}

// Group of navigation items with a header
export interface NavigationGroup {
  name: string; // Displayed as uppercase header
  items: NavigationItem[];
  defaultExpanded?: boolean;
}

// Section with both flat (legacy) and grouped navigation
export interface VariantNavigationSection {
  name: string;
  slug: string;
  subCategories: VariantNavigationLink[]; // Keep for mobile nav
  groups?: NavigationGroup[]; // For grouped sidebar
}
