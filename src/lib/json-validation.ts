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

// Flexible number that accepts string or number and coerces to number
const flexibleNumber = () =>
  z.union([z.number(), z.string().transform((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  })]).optional();

// Session schema - more flexible to accept legacy formats
const sessionSchema = z.object({
  id: z.string().optional().default(""),
  date: z.string().optional().default(""),
  duration: flexibleNumber(),
  integrationTime: flexibleNumber(),
  subs: flexibleNumber(),
  filter: optionalSafeString(),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  camera: optionalSafeString(),
  telescope: optionalSafeString(),
  location: optionalSafeString(),
  seeing: flexibleNumber(),
  transparency: flexibleNumber(),
  bortle: flexibleNumber(),
  moonPhase: flexibleNumber(),
  temperature: flexibleNumber(),
  humidity: flexibleNumber(),
  gain: flexibleNumber(),
  offset: flexibleNumber(),
  binning: optionalSafeString(10),
  quality: flexibleNumber(),
}).passthrough(); // Allow additional fields for forward compatibility

// Panel schema (legacy format support)
const panelSchema = z.object({
  id: z.string().optional().default(""),
  name: optionalSafeString(),
  sessions: z.array(sessionSchema).max(MAX_SESSIONS_PER_PROJECT).optional(),
}).passthrough();

// Project schema - name is optional, fallback to id
const projectSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().optional().default(""),
  dateStart: optionalSafeString(),
  dateEnd: optionalSafeString(),
  status: optionalSafeString(50),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  filters: z.array(z.string()).max(50).optional(),
  sessions: z.array(sessionSchema).max(MAX_SESSIONS_PER_PROJECT).optional(),
  panels: z.array(panelSchema).max(20).optional(),
  targetIntegrationTime: flexibleNumber(),
  rating: flexibleNumber(),
}).passthrough();

// Celestial object schema - more flexible for legacy formats
const celestialObjectSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().optional(), // Optional - old files may not have it
  commonName: z.string().optional(),
  catalog: optionalSafeString(50),
  type: optionalSafeString(100),
  constellation: optionalSafeString(100),
  ra: optionalSafeString(50),
  dec: optionalSafeString(50),
  magnitude: flexibleNumber(),
  size: optionalSafeString(50),
  notes: optionalSafeString(MAX_LONG_STRING_LENGTH),
  priority: flexibleNumber(),
  difficulty: flexibleNumber(),
  bestSeason: optionalSafeString(50),
  image: z.string().optional(), // No limit - base64 images can be very large
  thumbnail: z.string().optional(), // No limit
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

// Guide telescope schema (same structure as regular telescope)
const guideTelescopeSchema = z.object({
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
  guideTelescope: guideTelescopeSchema.optional(),
  guideCamera: optionalSafeString(),
  mount: optionalSafeString(),
  dateFormat: optionalSafeString(20),
  defaultTheme: optionalSafeString(20),
  jsonPath: optionalSafeString(500),
  visibleHighlights: z.array(safeString(50)).max(20).optional(),
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
