export const formatPValue = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toExponential(2);
};

export const formatFrequency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toFixed(3);
};

export const formatEffectSize = (value: string | number | null): string => {
  if (!value) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toFixed(3);
};

export const formatMlogPValue = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toFixed(2);
};

export const formatConfidenceInterval = (value: string | null): string => {
  return value || "—";
};

export const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

export const isGenomeWideSignificant = (pValue: string | number): boolean => {
  const num = typeof pValue === "string" ? parseFloat(pValue) : pValue;
  return !isNaN(num) && num >= 7.3;
};

export const isPValueSignificant = (pValue: string | number): boolean => {
  const num = typeof pValue === "string" ? parseFloat(pValue) : pValue;
  return !isNaN(num) && num < 5e-8;
};
