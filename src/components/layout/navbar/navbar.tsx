"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS, RESOURCES, type NavItem } from "./nav-items";
import { useScrolled } from "./use-navbar";
import { MobileDrawer } from "./mobile-drawer";
import { siteConfig } from "@/config/site";

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "px-5 py-2 text-base font-medium rounded-full",
        "text-slate-600 transition-all duration-300",
        "hover:text-slate-900 hover:bg-primary/10"
      )}
      {...(item.external && {
        target: "_blank",
        rel: "noopener noreferrer",
      })}
    >
      {item.label}
    </Link>
  );
}

export function Navbar() {
  const scrolled = useScrolled();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          "fixed w-full z-50 top-0",
          "transition-all duration-500 ease-in-out",
          scrolled
            ? "bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 py-4 shadow-sm"
            : "bg-transparent border-b border-transparent py-6"
        )}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-10 relative">
            {/* Left: Brand */}
            <div className="flex-1 flex justify-start z-10">
              <Link href="/" className="flex items-center group">
                <Logo className="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
              </Link>
            </div>

            {/* Center: Navigation */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center z-20">
              <div
                className={cn(
                  "flex items-center p-1.5 rounded-full",
                  "transition-all duration-500",
                  scrolled
                    ? "bg-slate-100/60 border border-slate-200/50"
                    : "bg-transparent"
                )}
              >
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.label} item={item} />
                ))}

                {/* Resources Dropdown */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1.5 px-5 py-2 rounded-full",
                        "text-base font-medium",
                        "text-slate-600 transition-all duration-300",
                        "hover:text-slate-900 hover:bg-primary/10",
                        "focus:outline-none"
                      )}
                    >
                      Resources
                      <ChevronDown className="w-3.5 h-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={8}
                    className="w-52 p-1.5 rounded-xl"
                  >
                    {RESOURCES.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "w-full px-3 py-2.5 rounded-lg cursor-pointer",
                            "text-base font-medium text-slate-600",
                            "transition-colors duration-200",
                            "hover:text-slate-900 hover:bg-slate-100/80"
                          )}
                          {...(item.external && {
                            target: "_blank",
                            rel: "noopener noreferrer",
                          })}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex-1 flex justify-end items-center gap-6 z-10">
              <div className="hidden md:flex h-5 w-px bg-slate-200" />

              <Link
                href="/whats-new"
                className={cn(
                  "hidden md:flex items-center gap-2",
                  "px-4 py-2 rounded-full",
                  "bg-white border border-slate-200",
                  "shadow-sm hover:shadow transition-all",
                  "group"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 tracking-wide uppercase">
                  {siteConfig.version}
                </span>
              </Link>

              {/* Mobile Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "md:hidden h-10 w-10 rounded-full",
                  "text-slate-900 hover:bg-primary/10",
                  "transition-colors"
                )}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
