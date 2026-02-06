"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Logo } from "@shared/components/ui/logo";
import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/config/site";
import { NAV_ITEMS, type NavItem, RESOURCES } from "./nav-items";
import { PageNavDrawer } from "./page-nav-drawer";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

function MobileNavLink({
  item,
  onClose,
  showArrow,
}: {
  item: NavItem;
  onClose: () => void;
  showArrow?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center justify-between",
        "px-5 py-4 rounded-2xl",
        "text-lg font-semibold text-muted-foreground",
        "transition-colors duration-200",
        "hover:text-foreground hover:bg-primary/10",
      )}
      {...(item.external && {
        target: "_blank",
        rel: "noopener noreferrer",
      })}
    >
      {item.label}
      {showArrow && <ArrowRight className="w-5 h-5 text-primary" />}
    </Link>
  );
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  // Use ref for onClose to avoid re-attaching listener when callback changes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Consolidated effect for body scroll lock and escape key handling
  // This avoids hydration issues from multiple effects mutating the same DOM element
  useEffect(() => {
    if (!open) return;

    // Store original overflow value to restore properly
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          "bg-black/20 backdrop-blur-sm",
          "transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 md:hidden",
          "w-full max-w-sm",
          "bg-white/95 backdrop-blur-xl",
          "shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <Link href="/" onClick={onClose}>
              <Logo className="h-7 w-auto" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-mr-2"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Page-specific Navigation (Variant, Gene, etc.) */}
            <PageNavDrawer onNavigate={onClose} />

            {/* Main Navigation */}
            <div className="px-4 py-6 space-y-1">
              {NAV_ITEMS.map((item) => (
                <MobileNavLink
                  key={item.label}
                  item={item}
                  onClose={onClose}
                  showArrow={item.label === "Annotator"}
                />
              ))}

              {/* Resources Section */}
              <div className="pt-6 mt-6 border-t border-border">
                <span className="block px-5 py-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Resources
                </span>
                {RESOURCES.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "block px-5 py-3 rounded-xl",
                      "text-base font-medium text-muted-foreground",
                      "transition-colors duration-200",
                      "hover:text-foreground hover:bg-primary/10",
                    )}
                    {...(item.external && {
                      target: "_blank",
                      rel: "noopener noreferrer",
                    })}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                {siteConfig.version}
              </span>
              <Link
                href="/whats-new"
                onClick={onClose}
                className="text-base font-bold text-primary hover:text-primary/80 transition-colors"
              >
                What&apos;s New
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
