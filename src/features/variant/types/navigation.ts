// Re-export shared navigation types with variant-specific aliases for backward compatibility
export type {
  NavigationGroup,
  NavigationItem,
  NavigationLink as VariantNavigationLink,
  NavigationSection as VariantNavigationSection,
} from "@shared/types/navigation";
