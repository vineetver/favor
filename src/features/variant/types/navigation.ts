// Re-export shared navigation types with variant-specific aliases for backward compatibility
export type {
  NavigationLink as VariantNavigationLink,
  NavigationItem,
  NavigationGroup,
  NavigationSection as VariantNavigationSection,
} from "@shared/types/navigation";
