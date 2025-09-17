import { BatchVariantInput } from "./types";

export function parseVariantsFromFile(
  content: string,
  fileType: string,
  sampleId: string,
): BatchVariantInput[] {
  const variants: BatchVariantInput[] = [];
  const lines = content.split("\n").filter((line) => line.trim());

  if (fileType.includes("csv")) {
    return parseCSVVariants(lines, sampleId);
  } else if (fileType.includes("tsv")) {
    return parseTSVVariants(lines, sampleId);
  } else if (fileType.includes("vcard") || fileType.includes("vcf")) {
    return parseVCFVariants(lines, sampleId);
  } else {
    return parsePlainTextVariants(lines, sampleId);
  }
}

function parseCSVVariants(
  lines: string[],
  sampleId: string,
): BatchVariantInput[] {
  const variants: BatchVariantInput[] = [];
  const hasHeader = lines[0]?.toLowerCase().includes("chrom");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const fields = line.split(",").map((f) => f.trim());
    if (fields.length >= 4) {
      const variant = createVariant(
        fields[0],
        fields[1],
        fields[2],
        fields[3],
        sampleId,
      );
      if (variant) variants.push(variant);
    }
  }
  return variants;
}

function parseTSVVariants(
  lines: string[],
  sampleId: string,
): BatchVariantInput[] {
  const variants: BatchVariantInput[] = [];
  const hasHeader = lines[0]?.toLowerCase().includes("chrom");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const fields = line.split("\t").map((f) => f.trim());
    if (fields.length >= 4) {
      const variant = createVariant(
        fields[0],
        fields[1],
        fields[2],
        fields[3],
        sampleId,
      );
      if (variant) variants.push(variant);
    }
  }
  return variants;
}

function parseVCFVariants(
  lines: string[],
  sampleId: string,
): BatchVariantInput[] {
  const variants: BatchVariantInput[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || !line.trim()) continue;

    const fields = line.split("\t").map((f) => f.trim());
    if (fields.length >= 5) {
      const rsid = fields[2] !== "." ? fields[2] : undefined;
      const variant = createVariant(
        fields[0],
        fields[1],
        fields[3],
        fields[4],
        sampleId,
        rsid,
      );
      if (variant) variants.push(variant);
    }
  }
  return variants;
}

function parsePlainTextVariants(
  lines: string[],
  sampleId: string,
): BatchVariantInput[] {
  const variants: BatchVariantInput[] = [];

  for (const line of lines) {
    const fields = line.split("-").map((f) => f.trim());
    if (fields.length >= 4) {
      const variant = createVariant(
        fields[0],
        fields[1],
        fields[2],
        fields[3],
        sampleId,
      );
      if (variant) variants.push(variant);
    }
  }
  return variants;
}

function createVariant(
  chromosome: string,
  position: string,
  ref: string,
  alt: string,
  sampleId: string,
  rsid?: string,
): BatchVariantInput | null {
  // Clean chromosome (remove 'chr' prefix if present)
  const cleanChrom = chromosome.replace(/^chr/i, "");

  // Validate position
  const pos = parseInt(position);
  if (isNaN(pos) || pos < 1) return null;

  // Validate alleles
  if (!ref || !alt || ref === alt) return null;

  return {
    chromosome: cleanChrom,
    position: pos,
    ref: ref.toUpperCase(),
    alt: alt.toUpperCase(),
    rsid,
    sampleId,
  };
}
