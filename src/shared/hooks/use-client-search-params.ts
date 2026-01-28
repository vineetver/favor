"use client";

import { useEffect, useState } from "react";

/**
 * Custom event for URL changes via window.history
 */
const URL_CHANGE_EVENT = "urlchange";

/**
 * Update URL using window.history without triggering Next.js navigation
 */
export function updateClientUrl(newUrl: string, usePush = false) {
  if (usePush) {
    window.history.pushState(null, "", newUrl);
  } else {
    window.history.replaceState(null, "", newUrl);
  }

  // Dispatch custom event to notify listeners
  window.dispatchEvent(new CustomEvent(URL_CHANGE_EVENT));
}

/**
 * Hook that reads URL search params reactively without Next.js router.
 * Listens to:
 * 1. Custom 'urlchange' events (from our updateClientUrl calls)
 * 2. Browser popstate events (back/forward buttons)
 *
 * This allows updating URL with window.history without server navigation.
 */
export function useClientSearchParams(): URLSearchParams {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  });

  useEffect(() => {
    const updateParams = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    // Listen to our custom URL change events
    window.addEventListener(URL_CHANGE_EVENT, updateParams);

    // Listen to browser back/forward
    window.addEventListener("popstate", updateParams);

    return () => {
      window.removeEventListener(URL_CHANGE_EVENT, updateParams);
      window.removeEventListener("popstate", updateParams);
    };
  }, []);

  return searchParams;
}
