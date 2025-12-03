"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { WhatsNewButton } from "@/components/layout/whats-new-button";

const menuItems = [
  {
    name: "About",
    href: "/about",
  },
  {
    name: "FAVORannotator",
    href: "/favor-annotator",
  },
  {
    name: "Forums",
    href: "https://discussion.genohub.org",
  },
  {
    name: "Team",
    href: "/team",
  },
  {
    name: "Terms",
    href: "/terms",
  },
  {
    name: "Newsletter",
    href: "/newsletter",
  },
];

export const Documentation = [
  {
    name: "Annotation Description",
    href: "https://docs.genohub.org/data",
  },
  {
    name: "API",
    href: "https://docs.genohub.org",
  },
  {
    name: "FAVOR GPT",
    href: "https://docs.genohub.org/favor-gpt",
  },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);

  return (
    <>
      {/* Backdrop overlay for mobile menu */}
      <div
        className={`fixed top-16 left-0 right-0 bottom-0 z-40 transition-all duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen
            ? "opacity-100 backdrop-blur-xs bg-black/20"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setIsMobileMenuOpen(false);
          setIsMobileDocsOpen(false);
        }}
        aria-hidden="true"
      />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            {/* Grid container for perfect centering */}
            <div className="hidden md:grid md:grid-cols-3 md:items-center w-full">
              {/* Logo - Left */}
              <div className="justify-self-start">
                <Link href="/" className="flex items-center group">
                  <Logo className="h-8 w-auto transition-transform group-hover:scale-105" />
                </Link>
              </div>

              <div className="justify-self-center">
                <div className="flex items-center space-x-1">
                  {menuItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="relative rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      target={
                        item.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        item.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                    >
                      {item.name}
                    </Link>
                  ))}

                  {/* Documentation Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-auto"
                      >
                        Documentation
                        <ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      {Documentation.map((item) => (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full cursor-pointer"
                          >
                            {item.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* What's New Button - Right */}
              <div className="justify-self-end">
                <WhatsNewButton />
              </div>
            </div>

            {/* Mobile logo - only visible on mobile */}
            <div className="shrink-0 md:hidden">
              <Link href="/" className="flex items-center group">
                <Logo className="h-8 w-auto transition-transform group-hover:scale-105" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
                className="relative h-10 w-10"
              >
                <Menu
                  className={`absolute h-6 w-6 transition-all duration-200 ${
                    isMobileMenuOpen
                      ? "rotate-180 opacity-0"
                      : "rotate-0 opacity-100"
                  }`}
                />
                <X
                  className={`absolute h-6 w-6 transition-all duration-200 ${
                    isMobileMenuOpen
                      ? "rotate-0 opacity-100"
                      : "-rotate-180 opacity-0"
                  }`}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out relative z-50 ${
            isMobileMenuOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-md">
            <div className="space-y-1 px-4 py-4">
              {menuItems.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    item.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Mobile Documentation Menu */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => setIsMobileDocsOpen(!isMobileDocsOpen)}
                  className="w-full justify-between rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-accent/50 h-auto"
                >
                  Documentation
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isMobileDocsOpen ? "rotate-180" : ""}`}
                  />
                </Button>
                {isMobileDocsOpen && (
                  <div className="ml-4 space-y-1">
                    {Documentation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground/80 transition-all duration-200 hover:text-foreground hover:bg-accent/30"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile What's New Button */}
              <div className="px-4">
                <WhatsNewButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
