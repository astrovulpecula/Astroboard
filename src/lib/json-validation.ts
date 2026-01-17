import { z } from "zod";

// Constants for validation limits
const MAX_ARRAY_LENGTH = 500;

/**
 * Very permissive validation that accepts any object structure.
 * Only checks basic array/object structure to prevent JSON injection,
 * but allows legacy formats with any field types.
 */

// Permissive object schema - accepts any object with passthrough
const permissiveObjectSchema = z.object({}).passthrough();

// Permissive array of objects
const permissiveArraySchema = z.array(permissiveObjectSchema).max(MAX_ARRAY_LENGTH);

// Full export format schema - very permissive
const fullExportSchema = z.object({
  objects: permissiveArraySchema,
  settings: permissiveObjectSchema.optional(),
}).passthrough();

// Legacy format: just an array of objects
const legacyArraySchema = permissiveArraySchema;

export interface ValidationResult {
  success: boolean;
  data?: {
    objects: any[];
    settings?: any;
  };
  error?: string;
}

/**
 * Validates JSON data from file uploads.
 * Very permissive to support all legacy formats.
 * Only ensures basic structure (array of objects or { objects: [...] }).
 */
export function validateJsonUpload(jsonData: unknown): ValidationResult {
  // Check if it's null or undefined
  if (jsonData === null || jsonData === undefined) {
    return {
      success: false,
      error: "El archivo JSON está vacío.",
    };
  }

  // Try new format first: { objects: [...], settings: {...} }
  if (typeof jsonData === "object" && !Array.isArray(jsonData) && "objects" in (jsonData as object)) {
    const data = jsonData as { objects: unknown; settings?: unknown };
    
    if (!Array.isArray(data.objects)) {
      return {
        success: false,
        error: "La propiedad 'objects' debe ser un array.",
      };
    }

    if (data.objects.length > MAX_ARRAY_LENGTH) {
      return {
        success: false,
        error: `Demasiados objetos (máximo ${MAX_ARRAY_LENGTH}).`,
      };
    }

    return {
      success: true,
      data: {
        objects: data.objects as any[],
        settings: data.settings as any,
      },
    };
  }

  // Try legacy array format
  if (Array.isArray(jsonData)) {
    if (jsonData.length > MAX_ARRAY_LENGTH) {
      return {
        success: false,
        error: `Demasiados objetos (máximo ${MAX_ARRAY_LENGTH}).`,
      };
    }

    return {
      success: true,
      data: {
        objects: jsonData,
        settings: undefined,
      },
    };
  }

  return {
    success: false,
    error: "Formato de JSON no válido. Se esperaba un array de objetos o un objeto con propiedad 'objects'.",
  };
}

/**
 * Validates settings data independently.
 */
export function validateSettings(settingsData: unknown): ValidationResult {
  if (settingsData === null || settingsData === undefined) {
    return {
      success: false,
      error: "Los datos de configuración están vacíos.",
    };
  }

  if (typeof settingsData !== "object" || Array.isArray(settingsData)) {
    return {
      success: false,
      error: "Los datos de configuración deben ser un objeto.",
    };
  }

  return {
    success: true,
    data: {
      objects: [],
      settings: settingsData,
    },
  };
}
