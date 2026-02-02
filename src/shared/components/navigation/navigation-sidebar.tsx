"use client";

import { cn } from "@infra/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Brain,
  Bug,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Dna,
  Eye,
  FileText,
  Flame,
  FlaskConical,
  GitBranch,
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
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const iconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "file-text": FileText,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
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
  defaultExpanded?: boolean;
}

interface NavigationSidebarProps {
  items?: NavigationItem[];
  groups?: NavigationGroup[];
  basePath: string;
  queryString?: string;
  showIcons?: boolean; // Set to false to hide icons (default: true)
}

export function NavigationSidebar({
  items,
  groups,
  basePath,
  queryString = "",
  showIcons = true,
}: NavigationSidebarProps) {
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

  // Track user overrides for group expansion state
  const [groupOverrides, setGroupOverrides] = useState<Map<string, boolean>>(
    new Map(),
  );

  const toggleGroup = (groupName: string, currentExpanded: boolean) => {
    setGroupOverrides((prev) => {
      const next = new Map(prev);
      next.set(groupName, !currentExpanded);
      return next;
    });
  };

  // Derived: check if group should be expanded
  const isGroupExpanded = (group: NavigationGroup): boolean => {
    // User override takes priority
    if (groupOverrides.has(group.name)) {
      return groupOverrides.get(group.name)!;
    }
    // Default: use defaultExpanded or check for active item
    if (group.defaultExpanded) return true;
    return group.items.some((item) => item.slug === activeSlug);
  };

  // Early return: no content
  if ((!items || items.length === 0) && (!groups || groups.length === 0)) {
    return null;
  }

  // Render grouped navigation
  if (groups && groups.length > 0) {
    return (
      <aside className="hidden lg:block w-64 shrink-0 pr-8">
        <nav className="space-y-6">
          {groups.map((group) => {
            const isExpanded = isGroupExpanded(group);
            const hasActiveItem = group.items.some(
              (item) => item.slug === activeSlug,
            );

            return (
              <Collapsible
                key={group.name}
                open={isExpanded}
                onOpenChange={() => toggleGroup(group.name, isExpanded)}
              >
                <div className="space-y-1">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 group cursor-pointer focus:outline-none focus-visible:outline-none">
                    <span
                      className={cn(
                        "text-[11px] font-bold tracking-widest uppercase transition-colors text-left",
                        hasActiveItem
                          ? "text-primary"
                          : "text-slate-500 group-hover:text-slate-700",
                      )}
                    >
                      {group.name}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-0.5 overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
                    {group.items.map((item) => {
                      const isActive = item.slug === activeSlug;
                      const Icon = showIcons && item.icon ? iconMap[item.icon] : null;

                      return (
                        <Link
                          key={item.slug}
                          href={`${basePath}/${item.slug}${queryString}`}
                          className={cn(
                            "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                            isActive
                              ? "bg-primary/8 text-slate-900 font-medium"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                          )}
                        >
                          {Icon && (
                            <Icon
                              className={cn(
                                "w-4 h-4 shrink-0 transition-colors",
                                isActive
                                  ? "text-primary"
                                  : "text-slate-400 group-hover:text-slate-500",
                              )}
                            />
                          )}
                          <span>{item.text}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </nav>
      </aside>
    );
  }

  // Fallback: flat items
  return (
    <aside className="hidden lg:block w-64 shrink-0 pr-8">
      <nav className="space-y-0.5">
        {items?.map((item) => {
          const isActive = item.slug === activeSlug;

          return (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}${queryString}`}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                isActive
                  ? "bg-primary/8 text-slate-900 font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
