"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Logo } from "@shared/components/ui/logo";
import { ChevronDown, Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MobileDrawer } from "./mobile-drawer";
import { NAV_ITEMS, type NavItem, RESOURCES } from "./nav-items";
import { useScrolled } from "./use-navbar";

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "px-5 py-2 text-base font-medium rounded-full",
        "text-muted-foreground transition-all duration-300",
        "hover:text-foreground hover:bg-primary/10",
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
            ? "bg-background/85 backdrop-blur-2xl border-b border-border/60 py-4 shadow-sm"
            : "bg-transparent border-b border-transparent py-6",
        )}
      >
        <div className="max-w-page mx-auto px-6 lg:px-12">
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
                    ? "bg-muted/60 border border-border/50"
                    : "bg-transparent",
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
                        "text-muted-foreground transition-all duration-300",
                        "hover:text-foreground hover:bg-primary/10",
                        "focus:outline-none",
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
                            "text-base font-medium text-muted-foreground",
                            "transition-colors duration-200",
                            "hover:text-foreground hover:bg-muted/80",
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
              <div className="hidden md:flex h-5 w-px bg-border" />

              <Link
                href="/agent"
                className={cn(
                  "hidden md:flex items-center gap-2",
                  "px-5 py-2 rounded-full",
                  "bg-primary text-primary-foreground",
                  "shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30",
                  "hover:brightness-110 active:scale-[0.97]",
                  "transition-all duration-300",
                  "group",
                )}
              >
                <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                <span className="text-sm font-semibold tracking-wide">
                  AI Agent
                </span>
              </Link>

              {/* Mobile Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "md:hidden h-10 w-10 rounded-full",
                  "text-foreground hover:bg-primary/10",
                  "transition-colors",
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
