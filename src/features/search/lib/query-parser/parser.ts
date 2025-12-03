import { PATTERNS } from "./patterns";
import type { SearchInputType, ParsedQuery } from "./types";

export function detectQueryType(input: string): SearchInputType {
	const trimmed = input.trim();

	if (!trimmed) return "unknown";

	if (PATTERNS.RSID.test(trimmed)) return "rsid";

	if (PATTERNS.VARIANT_VCF.test(trimmed)) return "variant";

	if (PATTERNS.REGION.test(trimmed)) return "region";

	if (
		PATTERNS.GENE.test(trimmed) &&
		!trimmed.startsWith("rs") &&
		trimmed.length >= 2
	) {
		return "gene";
	}

	return "unknown";
}

export function parseQuery(input: string): ParsedQuery {
	const trimmed = input.trim();
	const type = detectQueryType(trimmed);

	let normalized = trimmed.toLowerCase();
	let formatted = trimmed;

	switch (type) {
		case "rsid":
			normalized = trimmed.toLowerCase();
			formatted = trimmed.toLowerCase();
			break;
		case "gene":
			normalized = trimmed.toLowerCase();
			formatted = trimmed.toUpperCase();
			break;
		case "variant":
		case "region":
			normalized = trimmed.toLowerCase();
			formatted = trimmed;
			break;
		default:
			if (PATTERNS.RSID.test(trimmed)) {
				formatted = trimmed.toLowerCase();
			} else if (
				PATTERNS.GENE.test(trimmed) &&
				!trimmed.includes("-") &&
				!trimmed.startsWith("rs")
			) {
				formatted = trimmed.toUpperCase();
			}
	}

	return {
		raw: input,
		trimmed,
		type,
		normalized,
		formatted,
	};
}

export function shouldShowSuggestions(parsed: ParsedQuery): boolean {
	const { type, trimmed } = parsed;

	if (type === "gene" || type === "rsid") {
		return true;
	}

	if (
		type === "unknown" &&
		trimmed.length >= 2 &&
		!trimmed.includes("-") &&
		!PATTERNS.CHR_PREFIX.test(trimmed) &&
		!/^\d+$/.test(trimmed)
	) {
		return true;
	}

	return false;
}
