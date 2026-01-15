"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { NAV_ITEMS, RESOURCES, type NavItem } from "./nav-items";
import { PageNavDrawer } from "./page-nav-drawer";
import { siteConfig } from "@/config/site";

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
        "text-lg font-semibold text-slate-600",
        "transition-colors duration-200",
        "hover:text-slate-900 hover:bg-primary/10"
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          "bg-black/20 backdrop-blur-sm",
          "transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
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
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <Link href="/" onClick={onClose}>
              <Logo className="h-7 w-auto" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "p-2 -mr-2 rounded-full",
                "text-slate-400 hover:text-slate-900",
                "hover:bg-primary/10",
                "transition-colors"
              )}
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
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
              <div className="pt-6 mt-6 border-t border-slate-100">
                <span className="block px-5 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Resources
                </span>
                {RESOURCES.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "block px-5 py-3 rounded-xl",
                      "text-base font-medium text-slate-500",
                      "transition-colors duration-200",
                      "hover:text-slate-900 hover:bg-primary/10"
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
          <div className="px-6 py-5 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
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
