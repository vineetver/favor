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
import { useMemo, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

  // Derived: current active slug from URL
  const activeSlug = useMemo(() => {
    const subcategory = params.subcategory as string | undefined;
    if (subcategory) return subcategory;
    // Fallback: extract from pathname
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [params.subcategory, pathname]);

  // Track only user-toggled groups (collapsed by user)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Derived: check if group should be expanded
  const isGroupExpanded = (group: NavigationGroup): boolean => {
    if (collapsedGroups.has(group.name)) return false;
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
                onOpenChange={() => toggleGroup(group.name)}
              >
                <div className="space-y-1">
                  <CollapsibleTrigger className="flex items-start justify-between w-full px-3 py-1 group cursor-pointer focus:outline-none focus-visible:outline-none">
                    <span
                      className={cn(
                        "text-xs font-bold tracking-widest uppercase transition-colors leading-snug text-left",
                        hasActiveItem
                          ? "text-primary"
                          : "text-slate-400 group-hover:text-slate-600",
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
                      const Icon = item.icon ? iconMap[item.icon] : null;

                      return (
                        <Link
                          key={item.slug}
                          href={`${basePath}/${item.slug}`}
                          className={cn(
                            "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-slate-100 text-slate-900 font-medium"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          )}
                        >
                          {Icon && (
                            <Icon
                              className={cn(
                                "w-4 h-4 shrink-0 mt-0.5",
                                isActive
                                  ? "text-slate-700"
                                  : "text-slate-400 group-hover:text-slate-500",
                              )}
                            />
                          )}
                          <span className="leading-snug">{item.text}</span>
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
              href={`${basePath}/${item.slug}`}
              className={cn(
                "group flex items-center justify-between py-2 text-sm transition-colors",
                isActive
                  ? "text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <span>{item.text}</span>
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-all duration-200",
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
