/**
 * Compute which navigation slugs should be disabled based on data availability.
 * Slugs without an entry in `checks` are always enabled.
 */
export function getDisabledSlugs<T>(
  data: T,
  checks: Record<string, (data: T, extra?: any) => boolean>,
  extra?: Record<string, number>,
): string[] {
  const disabled: string[] = [];
  for (const [slug, check] of Object.entries(checks)) {
    if (!check(data, extra)) disabled.push(slug);
  }
  return disabled;
}
