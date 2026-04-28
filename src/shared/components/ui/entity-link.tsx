import { type EntityType, getEntityUrl } from "@features/search";
import Link from "next/link";
import * as React from "react";

interface EntityLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href"> {
  type: EntityType;
  id: string;
  /** Optional URL options forwarded to getEntityUrl (genome / category). */
  urlOptions?: Parameters<typeof getEntityUrl>[2];
  /** Stop click propagation — useful when nested in a clickable row. */
  stopPropagation?: boolean;
}

/**
 * Internal link to an entity detail page. Resolves the URL via
 * `getEntityUrl` so all link sites stay in sync with route changes.
 */
export const EntityLink = React.forwardRef<HTMLAnchorElement, EntityLinkProps>(
  (
    {
      type,
      id,
      urlOptions,
      stopPropagation,
      className,
      onClick,
      children,
      ...rest
    },
    ref,
  ) => (
    <Link
      ref={ref}
      href={getEntityUrl(type, encodeURIComponent(id), urlOptions)}
      className={className ?? "text-primary hover:underline font-medium"}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  ),
);

EntityLink.displayName = "EntityLink";
