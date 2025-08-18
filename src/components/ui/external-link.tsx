import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

export const ExternalLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    children: React.ReactNode;
    href: string;
  }
>(({ children, href, className, ...props }, ref) => {
  return (
    <a
      ref={ref}
      href={href}
      className={`inline-flex gap-x-2 hover:underline hover:text-primary ${className || ""}`}
      {...props}
    >
      {children}
      <ExternalLinkIcon className="h-5 w-5" />
    </a>
  );
});

ExternalLink.displayName = "ExternalLink";
