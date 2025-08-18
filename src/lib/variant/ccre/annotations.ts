export const ccreAnnotationMap: Record<string, string> = {
  PLS: "Promoter",
  pELS: "Proximal enhancer",
  dELS: "Distal enhancer",
  "CA-CTCF": "Chromatin Accessible with CTCF",
  "CA-H3K4me3": "Chromatin Accessible with H3K4me3",
  "CA-TF": "Chromatin Accessible with TF",
  CA: "Chromatin Accessible Only",
  TF: "TF Only",
};

export function getCcreAnnotationDescription(
  description: string | undefined,
  code: string,
): string {
  if (description) {
    return description;
  }
  return code;
}
