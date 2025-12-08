export function parseDiseaseNames(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((d) => d.trim().replace(/_/g, " "))
    .filter((d) => d);
}

export function parseDatabaseEntries(
  value: string | null,
): Array<{ database: string; id: string; raw: string }> {
  if (!value) return [];

  const entries = value
    .split(/,\s*|\s+(?=[A-Z])/)
    .map((entry) => entry.trim())
    .filter((entry) => entry);

  return entries.map((entry) => {
    const [database, id] = entry.split(":");
    return { database: database || "", id: id || "", raw: entry };
  });
}

export function parseClinicalSignificancePairs(
  value: string | null,
): Array<{ id: string; significance: string; raw: string }> {
  if (!value) return [];

  const pairs = value
    .split(/[,|;]/)
    .map((pair) => pair.trim())
    .filter((pair) => pair);

  return pairs.map((pair) => {
    const [id, significance] = pair.split(":").map((s) => s.trim());
    return { id: id || "", significance: significance || "", raw: pair };
  });
}
