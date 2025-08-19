import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

export const ExternalLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    children: React.ReactNode;
    href: string;
    iconSize?: "sm" | "md";
  }
>(({ children, href, className, iconSize = "md", ...props }, ref) => {
  const iconClass = iconSize === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  return (
    <a
      ref={ref}
      href={href}
      className={`inline-flex items-center gap-x-1 hover:underline hover:text-primary ${className || ""}`}
      {...props}
    >
      {children}
      <ExternalLinkIcon className={iconClass} />
    </a>
  );
});

ExternalLink.displayName = "ExternalLink";
