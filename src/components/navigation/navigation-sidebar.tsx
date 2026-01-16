"use client";

import {
  Activity,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Dna,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  History,
  Layers,
  type LucideIcon,
  MapPin,
  Microscope,
  PieChart,
  Scan,
  Scissors,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Icon name to component mapping
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
};

// Types
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
}

export function NavigationSidebar({
  items,
  groups,
  basePath,
}: NavigationSidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const currentSubcategory = params.subcategory as string;

  const isActiveItem = (itemSlug: string) => {
    if (currentSubcategory === itemSlug) return true;
    return pathname.endsWith(`/${itemSlug}`);
  };

  // Initialize expanded groups based on defaultExpanded or if they contain active item
  const getInitialExpandedGroups = () => {
    if (!groups) return new Set<string>();

    return new Set(
      groups
        .filter((group) => {
          if (group.defaultExpanded) return true;
          return group.items.some((item) => isActiveItem(item.slug));
        })
        .map((g) => g.name)
    );
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    getInitialExpandedGroups
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Render a single navigation item
  const renderNavItem = (item: NavigationItem) => {
    const isActive = isActiveItem(item.slug);
    const Icon = item.icon ? iconMap[item.icon] : null;

    return (
      <Link
        key={item.slug}
        href={`${basePath}/${item.slug}`}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
            )}
          />
        )}
        <span className="truncate">{item.text}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </Link>
    );
  };

  // If no items or groups, return null
  if ((!items || items.length === 0) && (!groups || groups.length === 0)) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0 pr-8">
      <nav className="space-y-6">
        {/* Render grouped navigation if groups exist */}
        {groups && groups.length > 0 ? (
          groups.map((group) => {
            const isExpanded = expandedGroups.has(group.name);
            const hasActiveItem = group.items.some((item) =>
              isActiveItem(item.slug)
            );

            return (
              <Collapsible
                key={group.name}
                open={isExpanded}
                onOpenChange={() => toggleGroup(group.name)}
              >
                <div className="space-y-1">
                  {/* Group Header */}
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1 group cursor-pointer focus:outline-none focus-visible:outline-none">
                    <span
                      className={cn(
                        "text-[11px] font-semibold tracking-wider uppercase transition-colors",
                        hasActiveItem ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    >
                      {group.name}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>

                  {/* Group Items */}
                  <CollapsibleContent className="space-y-0.5 overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
                    {group.items.map(renderNavItem)}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        ) : (
          /* Fallback to flat items rendering */
          <div className="space-y-0.5">
            {items?.map((item) => {
              const isActive = isActiveItem(item.slug);

              return (
                <Link
                  key={item.slug}
                  href={`${basePath}/${item.slug}`}
                  className={cn(
                    "group flex items-center justify-between py-2 text-sm transition-colors",
                    isActive
                      ? "text-slate-900 font-medium"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <span>{item.text}</span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-all duration-200",
                      isActive
                        ? "opacity-100 text-primary"
                        : "opacity-0 group-hover:opacity-50"
                    )}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
