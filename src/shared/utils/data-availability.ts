/**
 * Compute which navigation slugs should be disabled based on data availability.
 * Slugs without an entry in `checks` are always enabled.
 */
export function getDisabledSlugs<T>(
  data: T,
  checks: Record<string, (data: T) => boolean>,
): string[] {
  const disabled: string[] = [];
  for (const [slug, check] of Object.entries(checks)) {
    if (!check(data)) disabled.push(slug);
  }
  return disabled;
}
