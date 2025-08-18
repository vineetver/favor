import type { ValidationResult, ColumnsType } from "@/lib/annotations/types";

export function validateVariantData<T extends Record<string, unknown>>(
  data: unknown,
): ValidationResult<T> {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      error: "Invalid data",
      details: "Data must be a non-null object",
    };
  }

  return {
    success: true,
    data: data as T,
  };
}

export function validateColumnConfig(
  columns: unknown,
): ValidationResult<ColumnsType> {
  if (!columns || typeof columns !== "object") {
    return {
      success: false,
      error: "Invalid column configuration",
      details: "Columns must be a non-null object",
    };
  }

  const config = columns as Record<string, unknown>;

  if (!config.items || !Array.isArray(config.items)) {
    return {
      success: false,
      error: "Invalid column items",
      details: "Column items must be an array",
    };
  }

  if (config.items.length === 0) {
    return {
      success: false,
      error: "Empty column configuration",
      details: "Column items array cannot be empty",
    };
  }

  for (let i = 0; i < config.items.length; i++) {
    const item = config.items[i] as Record<string, unknown>;
    if (!item || typeof item !== "object") {
      return {
        success: false,
        error: "Invalid column item",
        details: `Column item at index ${i} is not an object`,
      };
    }
    if (!item.accessor || typeof item.accessor !== "string") {
      return {
        success: false,
        error: "Invalid column item",
        details: `Column item at index ${i} is missing valid accessor field`,
      };
    }
  }

  return {
    success: true,
    data: config as ColumnsType,
  };
}

export class ValidationError extends Error {
  public readonly details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export function validateOrThrow<T>(result: ValidationResult<T>): T {
  if (!result.success) {
    throw new ValidationError(result.error, result.details);
  }
  return result.data;
}
