"use client";

interface MousePhenotypeListProps {
  phenotypeString: string | null | undefined;
}

export function MousePhenotypeList({
  phenotypeString,
}: MousePhenotypeListProps) {
  if (!phenotypeString) return null;

  const items = phenotypeString
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = [...new Set(items)];
  if (unique.length === 0) return null;

  // Strip parenthetical descriptions, just show the name
  const names = unique.map((item) => {
    const parenIdx = item.indexOf("(");
    return parenIdx > 0 ? item.slice(0, parenIdx).trim() : item;
  });

  return (
    <div className="flex flex-col gap-1">
      {names.map((name, i) => (
        <span key={i} className="text-sm text-foreground">
          {name}
        </span>
      ))}
    </div>
  );
}
