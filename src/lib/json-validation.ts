import { z } from "zod";

// Constants for validation limits
const MAX_STRING_LENGTH = 1000;
const MAX_LONG_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 500;
const MAX_SESSIONS_PER_PROJECT = 200;
const MAX_PROJECTS_PER_OBJECT = 50;

// Truncate strings to prevent localStorage exhaustion
const safeString = (maxLength = MAX_STRING_LENGTH) =>
  z.string().max(maxLength).transform((val) => val.slice(0, maxLength));

const optionalSafeString = (maxLength = MAX_STRING_LENGTH) =>
  z.string().max(maxLength).optional().transform((val) => val?.slice(0, maxLength));

// Session schema
const sessionSchema = z.object({
  id: safeString(),
  date: safeString(),
  duration: z.number().min(0).max(100000).optional(),
  integrationTime: z.number().min(0).max(100000).optional(),
  subs: z.number().int().min(0).max(100000).optional(),
  filter: optionalSafeString(),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  camera: optionalSafeString(),
  telescope: optionalSafeString(),
  location: optionalSafeString(),
  seeing: z.number().min(0).max(10).optional(),
  transparency: z.number().min(0).max(10).optional(),
  bortle: z.number().int().min(1).max(9).optional(),
  moonPhase: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-100).max(100).optional(),
  humidity: z.number().min(0).max(100).optional(),
  gain: z.number().min(0).max(10000).optional(),
  offset: z.number().min(0).max(10000).optional(),
  binning: optionalSafeString(10),
  quality: z.number().min(0).max(5).optional(),
}).passthrough(); // Allow additional fields for forward compatibility

// Panel schema (legacy format support)
const panelSchema = z.object({
  id: safeString(),
  name: optionalSafeString(),
  sessions: z.array(sessionSchema).max(MAX_SESSIONS_PER_PROJECT).optional(),
}).passthrough();

// Project schema
const projectSchema = z.object({
  id: safeString(),
  name: safeString(),
  dateStart: optionalSafeString(),
  dateEnd: optionalSafeString(),
  status: optionalSafeString(50),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  filters: z.array(safeString()).max(50).optional(),
  sessions: z.array(sessionSchema).max(MAX_SESSIONS_PER_PROJECT).optional(),
  panels: z.array(panelSchema).max(20).optional(),
  targetIntegrationTime: z.number().min(0).max(1000000).optional(),
  rating: z.number().min(0).max(5).optional(),
}).passthrough();

// Celestial object schema
const celestialObjectSchema = z.object({
  id: safeString(),
  name: safeString(),
  catalog: optionalSafeString(50),
  type: optionalSafeString(100),
  constellation: optionalSafeString(100),
  ra: optionalSafeString(50),
  dec: optionalSafeString(50),
  magnitude: z.number().min(-30).max(30).optional(),
  size: optionalSafeString(50),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  priority: z.number().int().min(1).max(5).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  bestSeason: optionalSafeString(50),
  image: optionalSafeString(100000), // Base64 images can be large
  thumbnail: optionalSafeString(100000),
  projects: z.array(projectSchema).max(MAX_PROJECTS_PER_OBJECT).optional(),
}).passthrough();

// Location schema
const locationSchema = z.object({
  name: safeString(),
  coords: safeString(100),
}).passthrough();

// Telescope schema
const telescopeSchema = z.object({
  name: safeString(),
  focalLength: z.union([safeString(20), z.number()]).optional(),
}).passthrough();

// Settings schema
const settingsSchema = z.object({
  userName: optionalSafeString(100),
  cameras: z.array(safeString()).max(20).optional(),
  telescopes: z.array(telescopeSchema).max(20).optional(),
  locations: z.array(locationSchema).max(20).optional(),
  mainLocation: locationSchema.optional(),
  guideTelescope: optionalSafeString(),
  guideCamera: optionalSafeString(),
  mount: optionalSafeString(),
  dateFormat: optionalSafeString(20),
  defaultTheme: optionalSafeString(20),
  jsonPath: optionalSafeString(500),
}).passthrough();

// Full export format schema
const fullExportSchema = z.object({
  objects: z.array(celestialObjectSchema).max(MAX_ARRAY_LENGTH),
  settings: settingsSchema.optional(),
}).passthrough();

// Legacy format: just an array of objects
const legacyArraySchema = z.array(celestialObjectSchema).max(MAX_ARRAY_LENGTH);

export interface ValidationResult {
  success: boolean;
  data?: {
    objects: any[];
    settings?: any;
  };
  error?: string;
}

/**
 * Validates and sanitizes JSON data from file uploads.
 * Supports both new format { objects: [...], settings: {...} } and legacy array format.
 */
export function validateJsonUpload(jsonData: unknown): ValidationResult {
  // Try new format first
  const fullResult = fullExportSchema.safeParse(jsonData);
  if (fullResult.success) {
    return {
      success: true,
      data: {
        objects: fullResult.data.objects,
        settings: fullResult.data.settings,
      },
    };
  }

  // Try legacy array format
  const legacyResult = legacyArraySchema.safeParse(jsonData);
  if (legacyResult.success) {
    return {
      success: true,
      data: {
        objects: legacyResult.data,
        settings: undefined,
      },
    };
  }

  // Build a user-friendly error message
  const errors: string[] = [];
  
  if (fullResult.error) {
    const issues = fullResult.error.issues.slice(0, 3);
    issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors.push(`${path}: ${issue.message}`);
    });
  }

  return {
    success: false,
    error: errors.length > 0 
      ? `Errores de validación:\n${errors.join("\n")}`
      : "Formato de JSON no válido. Se esperaba un array de objetos o un objeto con propiedad 'objects'.",
  };
}

/**
 * Validates settings data independently.
 */
export function validateSettings(settingsData: unknown): ValidationResult {
  const result = settingsSchema.safeParse(settingsData);
  if (result.success) {
    return {
      success: true,
      data: {
        objects: [],
        settings: result.data,
      },
    };
  }

  return {
    success: false,
    error: "Los datos de configuración no son válidos.",
  };
}
