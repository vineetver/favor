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

  // Split by pipe first, then by comma
  const entries = value
    .split("|")
    .flatMap((part) => part.split(/,\s*/))
    .map((entry) => entry.trim())
    .filter((entry) => entry && entry !== ".");

  return entries.map((entry) => {
    // Handle database:id format (e.g., "MedGen:C1264000")
    const colonIndex = entry.indexOf(":");
    if (colonIndex > 0) {
      const database = entry.slice(0, colonIndex).trim();
      const id = entry.slice(colonIndex + 1).trim();
      // Skip entries with empty id after colon
      if (!id) return { database: "", id: "", raw: entry };
      return { database, id, raw: entry };
    }
    return { database: "", id: "", raw: entry };
  }).filter((entry) => entry.database && entry.id);
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
