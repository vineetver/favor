interface GencodeExonicInfoProps {
  value: string;
}

export function GencodeExonicInfo({ value }: GencodeExonicInfoProps) {
  if (!value) return <span>-</span>;

  const items = value.split(",").map((item) => item.trim());
  const changes = new Map<string, { protein: string; exons: Set<string> }>();

  items.forEach((item) => {
    const parts = item.split(":");
    const protein = parts.find((p) => p.startsWith("p."));
    const exon = parts.find((p) => p.includes("exon"));
    if (!protein) return;
    if (!changes.has(protein))
      changes.set(protein, { protein, exons: new Set() });
    if (exon) changes.get(protein)!.exons.add(exon.replace("exon", ""));
  });

  if (changes.size === 0) return <span>-</span>;

  return (
    <div className="text-data space-y-0.5">
      {Array.from(changes.values()).map((item, index) => (
        <div key={index} className="flex items-baseline gap-1.5">
          <span className="font-mono font-medium">{item.protein}</span>
          {item.exons.size > 0 && (
            <span className="text-muted-foreground">
              exon {Array.from(item.exons).join(", ")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
