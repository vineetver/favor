/** Maximally distinct palette — ordered so neighbors contrast well */
const DOMAIN_PALETTE = [
  "#2563eb", // blue
  "#dc2626", // red
  "#059669", // emerald
  "#d97706", // amber
  "#7c3aed", // violet
  "#db2777", // pink
  "#0891b2", // cyan
  "#15803d", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0d9488", // teal
  "#4338ca", // indigo
  "#e11d48", // rose
  "#7c2d12", // brown
  "#ca8a04", // yellow
];

/**
 * Assign colors to an array of domain names by insertion order.
 * Each unique name gets the next color in the palette — no hashing,
 * no collisions, guaranteed distinct for up to 15 domains.
 */
export function assignDomainColors(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const name of names) {
    if (!result.has(name)) {
      result.set(name, DOMAIN_PALETTE[result.size % DOMAIN_PALETTE.length]);
    }
  }
  return result;
}

/** Single-name convenience (uses hash, kept for backward compat) */
export function domainColor(name: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return DOMAIN_PALETTE[(hash >>> 0) % DOMAIN_PALETTE.length];
}
