"use client";

import { cn } from "@infra/utils";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Box,
  Brain,
  Bug,
  ChevronRight,
  ClipboardList,
  Dna,
  Eye,
  FileText,
  Flame,
  FlaskConical,
  GitBranch,
  GitCompare,
  HeartPulse,
  History,
  LayoutGrid,
  Layers,
  Link2,
  type LucideIcon,
  Map as MapIcon,
  MapPin,
  Microscope,
  Network,
  Package,
  PieChart,
  Pill,
  Radar,
  Scan,
  Scissors,
  Share2,
  ShieldAlert,
  Sparkles,
  Table,
  Target,
  TestTubes,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";

const iconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "file-text": FileText,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  box: Box,
  target: Target,
  dna: Dna,
  activity: Activity,
  scissors: Scissors,
  brain: Brain,
  users: Users,
  "pie-chart": PieChart,
  "git-branch": GitBranch,
  history: History,
  layers: Layers,
  "flask-conical": FlaskConical,
  scan: Scan,
  "map-pin": MapPin,
  microscope: Microscope,
  "clipboard-list": ClipboardList,
  pill: Pill,
  "alert-triangle": AlertTriangle,
  link: Link2,
  "share-2": Share2,
  bug: Bug,
  "shield-alert": ShieldAlert,
  network: Network,
  "badge-check": BadgeCheck,
  "layout-grid": LayoutGrid,
  radar: Radar,
  flame: Flame,
  "git-compare": GitCompare,
  "test-tubes": TestTubes,
  package: Package,
  eye: Eye,
  map: MapIcon,
  zap: Zap,
  table: Table,
};

interface NavigationItem {
  text: string;
  slug: string;
  icon?: string;
}

interface NavigationGroup {
  name: string;
  items: NavigationItem[];
}

interface NavigationSidebarProps {
  items?: NavigationItem[];
  groups?: NavigationGroup[];
  basePath: string;
  queryString?: string;
  showIcons?: boolean; // Set to false to hide icons (default: true)
  disabledSlugs?: string[];
}

export function NavigationSidebar({
  items,
  groups,
  basePath,
  queryString = "",
  showIcons = true,
  disabledSlugs,
}: NavigationSidebarProps) {
  const disabledSet = useMemo(
    () => new Set(disabledSlugs),
    [disabledSlugs],
  );
  const params = useParams();
  const pathname = usePathname();

  // Derived: current active slug from URL
  const activeSlug = useMemo(() => {
    const subcategory = params.subcategory as string | undefined;
    if (subcategory) return subcategory;
    // Fallback: extract from pathname
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [params.subcategory, pathname]);

  // Early return: no content
  if ((!items || items.length === 0) && (!groups || groups.length === 0)) {
    return null;
  }

  // Render grouped navigation (always expanded, like a TOC)
  if (groups && groups.length > 0) {
    return (
      <aside className="hidden lg:block w-52 shrink-0">
        <nav className="space-y-5">
          {groups.map((group) => {
            const hasActiveItem = group.items.some(
              (item) => item.slug === activeSlug,
            );

            return (
              <div key={group.name} className="space-y-1">
                <div className="px-3 py-2">
                  <span
                    className={cn(
                      "text-xs font-bold tracking-widest uppercase",
                      hasActiveItem ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {group.name}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.slug === activeSlug;
                    const isDisabled = disabledSet.has(item.slug);
                    const Icon = showIcons && item.icon ? iconMap[item.icon] : null;

                    if (isDisabled) {
                      return (
                        <span
                          key={item.slug}
                          title="No data available"
                          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm opacity-40 cursor-default"
                        >
                          {Icon && (
                            <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <span>{item.text}</span>
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={item.slug}
                        href={`${basePath}/${item.slug}${queryString}`}
                        className={cn(
                          "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isActive
                            ? "bg-primary/8 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground",
                            )}
                          />
                        )}
                        <span>{item.text}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    );
  }

  // Fallback: flat items
  return (
    <aside className="hidden lg:block w-52 shrink-0">
      <nav className="space-y-0.5">
        {items?.map((item) => {
          const isActive = item.slug === activeSlug;
          const isDisabled = disabledSet.has(item.slug);

          if (isDisabled) {
            return (
              <span
                key={item.slug}
                title="No data available"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm opacity-40 cursor-default"
              >
                <span>{item.text}</span>
                <ChevronRight className="w-4 h-4 opacity-0" />
              </span>
            );
          }

          return (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}${queryString}`}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-primary/8 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span>{item.text}</span>
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-all duration-150",
                  isActive
                    ? "opacity-100 text-primary"
                    : "opacity-0 group-hover:opacity-50",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
