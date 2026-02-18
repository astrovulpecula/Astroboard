// Catálogo de coordenadas celestes para objetos populares
// RA en horas decimales, Dec en grados decimales

import { loadICObjects, parseRA, parseDec } from './ic-data-loader';

export interface CelestialCoordinates {
  code: string;
  ra: number;  // Right Ascension en horas (0-24)
  dec: number; // Declination en grados (-90 a +90)
}

// Catálogo de Messier y objetos NGC populares
export const celestialCatalog: CelestialCoordinates[] = [
  // Messier Objects
  { code: "M1", ra: 5.575, dec: 22.017 },   // Crab Nebula
  { code: "M2", ra: 21.558, dec: -0.817 },
  { code: "M3", ra: 13.703, dec: 28.383 },
  { code: "M4", ra: 16.393, dec: -26.533 },
  { code: "M5", ra: 15.308, dec: 2.083 },
  { code: "M6", ra: 17.667, dec: -32.217 },
  { code: "M7", ra: 17.898, dec: -34.817 },
  { code: "M8", ra: 18.063, dec: -24.383 },  // Lagoon Nebula
  { code: "M9", ra: 17.318, dec: -18.517 },
  { code: "M10", ra: 16.953, dec: -4.1 },
  { code: "M11", ra: 18.851, dec: -6.267 },  // Wild Duck
  { code: "M12", ra: 16.787, dec: -1.95 },
  { code: "M13", ra: 16.695, dec: 36.467 },  // Hercules Cluster
  { code: "M14", ra: 17.626, dec: -3.25 },
  { code: "M15", ra: 21.5, dec: 12.167 },
  { code: "M16", ra: 18.313, dec: -13.783 }, // Eagle Nebula
  { code: "M17", ra: 18.347, dec: -16.183 }, // Omega Nebula
  { code: "M18", ra: 18.333, dec: -17.133 },
  { code: "M19", ra: 17.043, dec: -26.267 },
  { code: "M20", ra: 18.043, dec: -23.033 }, // Trifid
  { code: "M21", ra: 18.073, dec: -22.5 },
  { code: "M22", ra: 18.608, dec: -23.9 },
  { code: "M23", ra: 17.948, dec: -19.017 },
  { code: "M24", ra: 18.283, dec: -18.417 },
  { code: "M25", ra: 18.528, dec: -19.117 },
  { code: "M26", ra: 18.755, dec: -9.4 },
  { code: "M27", ra: 19.993, dec: 22.717 },  // Dumbbell
  { code: "M28", ra: 18.408, dec: -24.867 },
  { code: "M29", ra: 20.398, dec: 38.533 },
  { code: "M30", ra: 21.673, dec: -23.183 },
  { code: "M31", ra: 0.712, dec: 41.267 },   // Andromeda
  { code: "M32", ra: 0.712, dec: 40.867 },
  { code: "M33", ra: 1.564, dec: 30.65 },    // Triangulum
  { code: "M34", ra: 2.702, dec: 42.783 },
  { code: "M35", ra: 6.148, dec: 24.35 },
  { code: "M36", ra: 5.602, dec: 34.133 },
  { code: "M37", ra: 5.873, dec: 32.55 },
  { code: "M38", ra: 5.478, dec: 35.85 },
  { code: "M39", ra: 21.533, dec: 48.433 },
  { code: "M40", ra: 12.373, dec: 58.083 },
  { code: "M41", ra: 6.783, dec: -20.717 },
  { code: "M42", ra: 5.588, dec: -5.45 },    // Orion Nebula
  { code: "M43", ra: 5.593, dec: -5.267 },
  { code: "M44", ra: 8.667, dec: 19.983 },   // Beehive
  { code: "M45", ra: 3.783, dec: 24.117 },   // Pleiades
  { code: "M46", ra: 7.695, dec: -14.817 },
  { code: "M47", ra: 7.613, dec: -14.5 },
  { code: "M48", ra: 8.228, dec: -5.75 },
  { code: "M49", ra: 12.498, dec: 8 },
  { code: "M50", ra: 7.053, dec: -8.35 },
  { code: "M51", ra: 13.498, dec: 47.2 },    // Whirlpool
  { code: "M52", ra: 23.408, dec: 61.6 },
  { code: "M53", ra: 13.215, dec: 18.167 },
  { code: "M54", ra: 18.918, dec: -30.483 },
  { code: "M55", ra: 19.667, dec: -30.967 },
  { code: "M56", ra: 19.278, dec: 30.183 },
  { code: "M57", ra: 18.893, dec: 33.033 },  // Ring Nebula
  { code: "M58", ra: 12.625, dec: 11.817 },
  { code: "M59", ra: 12.7, dec: 11.65 },
  { code: "M60", ra: 12.728, dec: 11.55 },
  { code: "M61", ra: 12.365, dec: 4.467 },
  { code: "M62", ra: 17.018, dec: -30.117 },
  { code: "M63", ra: 13.265, dec: 42.033 },  // Sunflower
  { code: "M64", ra: 12.948, dec: 21.683 },  // Black Eye
  { code: "M65", ra: 11.315, dec: 13.1 },
  { code: "M66", ra: 11.338, dec: 12.983 },
  { code: "M67", ra: 8.843, dec: 11.817 },
  { code: "M68", ra: 12.658, dec: -26.75 },
  { code: "M69", ra: 18.523, dec: -32.35 },
  { code: "M70", ra: 18.718, dec: -32.3 },
  { code: "M71", ra: 19.895, dec: 18.783 },
  { code: "M72", ra: 20.892, dec: -12.533 },
  { code: "M73", ra: 20.982, dec: -12.633 },
  { code: "M74", ra: 1.613, dec: 15.783 },
  { code: "M75", ra: 20.103, dec: -21.917 },
  { code: "M76", ra: 1.703, dec: 51.567 },   // Little Dumbbell
  { code: "M77", ra: 2.712, dec: -0.017 },
  { code: "M78", ra: 5.778, dec: 0.067 },
  { code: "M79", ra: 5.408, dec: -24.533 },
  { code: "M80", ra: 16.283, dec: -22.983 },
  { code: "M81", ra: 9.928, dec: 69.067 },   // Bode's Galaxy
  { code: "M82", ra: 9.928, dec: 69.683 },   // Cigar Galaxy
  { code: "M83", ra: 13.617, dec: -29.867 },
  { code: "M84", ra: 12.418, dec: 12.883 },
  { code: "M85", ra: 12.425, dec: 18.183 },
  { code: "M86", ra: 12.443, dec: 12.95 },
  { code: "M87", ra: 12.513, dec: 12.4 },
  { code: "M88", ra: 12.533, dec: 14.417 },
  { code: "M89", ra: 12.593, dec: 12.55 },
  { code: "M90", ra: 12.613, dec: 13.167 },
  { code: "M91", ra: 12.593, dec: 14.5 },
  { code: "M92", ra: 17.285, dec: 43.133 },
  { code: "M93", ra: 7.745, dec: -23.867 },
  { code: "M94", ra: 12.848, dec: 41.117 },
  { code: "M95", ra: 10.732, dec: 11.7 },
  { code: "M96", ra: 10.783, dec: 11.817 },
  { code: "M97", ra: 11.248, dec: 55.017 },  // Owl Nebula
  { code: "M98", ra: 12.228, dec: 14.9 },
  { code: "M99", ra: 12.315, dec: 14.417 },
  { code: "M100", ra: 12.385, dec: 15.817 },
  { code: "M101", ra: 14.053, dec: 54.35 },  // Pinwheel
  { code: "M102", ra: 15.113, dec: 55.767 },
  { code: "M103", ra: 1.557, dec: 60.7 },
  { code: "M104", ra: 12.667, dec: -11.617 }, // Sombrero
  { code: "M105", ra: 10.797, dec: 12.583 },
  { code: "M106", ra: 12.315, dec: 47.3 },
  { code: "M107", ra: 16.543, dec: -13.05 },
  { code: "M108", ra: 11.193, dec: 55.667 },
  { code: "M109", ra: 11.963, dec: 53.383 },
  { code: "M110", ra: 0.673, dec: 41.683 },
  
  // Popular NGC Objects
  { code: "NGC224", ra: 0.712, dec: 41.267 },   // M31 alias
  { code: "NGC869", ra: 2.315, dec: 57.133 },   // Double Cluster h
  { code: "NGC884", ra: 2.373, dec: 57.133 },   // Double Cluster χ
  { code: "NGC1499", ra: 4.017, dec: 36.367 },  // California Nebula
  { code: "NGC2024", ra: 5.683, dec: -1.85 },   // Flame Nebula
  { code: "NGC2070", ra: 5.645, dec: -69.1 },   // Tarantula
  { code: "NGC2237", ra: 6.533, dec: 5.05 },    // Rosette Nebula
  { code: "NGC2244", ra: 6.533, dec: 4.95 },    // Rosette Cluster
  { code: "NGC2392", ra: 7.488, dec: 20.917 },  // Eskimo Nebula
  { code: "NGC3372", ra: 10.745, dec: -59.867 }, // Eta Carinae
  { code: "NGC4565", ra: 12.602, dec: 25.983 }, // Needle Galaxy
  { code: "NGC5128", ra: 13.428, dec: -43.017 }, // Centaurus A
  { code: "NGC5139", ra: 13.443, dec: -47.483 }, // Omega Centauri
  { code: "NGC6302", ra: 17.228, dec: -37.1 },  // Bug Nebula
  { code: "NGC6543", ra: 17.977, dec: 66.633 }, // Cat's Eye
  { code: "NGC6720", ra: 18.893, dec: 33.033 }, // Ring Nebula (M57)
  { code: "NGC6826", ra: 19.747, dec: 50.533 }, // Blinking Planetary
  { code: "NGC6888", ra: 20.203, dec: 38.35 },  // Crescent Nebula
  { code: "NGC6960", ra: 20.757, dec: 30.717 }, // Veil (West)
  { code: "NGC6992", ra: 20.933, dec: 31.717 }, // Veil (East)
  { code: "NGC7000", ra: 20.978, dec: 44.333 }, // North America
  { code: "NGC7023", ra: 21.017, dec: 68.167 }, // Iris Nebula
  { code: "NGC7293", ra: 22.493, dec: -20.833 }, // Helix Nebula
  { code: "NGC7331", ra: 22.617, dec: 34.417 },
  { code: "NGC7635", ra: 23.347, dec: 61.2 },   // Bubble Nebula
  { code: "NGC7662", ra: 23.433, dec: 42.55 },  // Blue Snowball
  
  // IC Objects (hardcoded popular ones)
  { code: "IC434", ra: 5.683, dec: -2.467 },    // Horsehead region
  { code: "IC1396", ra: 21.627, dec: 57.5 },    // Elephant Trunk
  { code: "IC1805", ra: 2.557, dec: 61.45 },    // Heart Nebula
  { code: "IC1848", ra: 2.857, dec: 60.433 },   // Soul Nebula
  { code: "IC2118", ra: 5.058, dec: -7.233 },   // Witch Head
  { code: "IC4592", ra: 16.22, dec: -19.217 },  // Blue Horsehead
  { code: "IC5070", ra: 20.842, dec: 44.367 },  // Pelican Nebula
  { code: "IC5146", ra: 21.892, dec: 47.267 },  // Cocoon Nebula
  
  // Sharpless Objects
  { code: "SH2-129", ra: 21.183, dec: 60.167 }, // Flying Bat
  { code: "SH2-240", ra: 5.633, dec: 28.0 },    // Spaghetti Nebula
  { code: "SH2-155", ra: 22.958, dec: 62.617 }, // Cave Nebula
  
  // Abell Objects
  { code: "Abell39", ra: 16.453, dec: 27.9 },
  { code: "Abell85", ra: 0.695, dec: -9.3 },
];

// Cache for dynamically loaded IC coordinates
let icCoordinatesCache: CelestialCoordinates[] | null = null;
let icLoadingPromise: Promise<CelestialCoordinates[]> | null = null;

/**
 * Load IC coordinates from the XLSX data.
 * Call this early to pre-populate the cache so sync lookups work.
 */
export async function loadICCoordinates(): Promise<CelestialCoordinates[]> {
  if (icCoordinatesCache) return icCoordinatesCache;
  if (icLoadingPromise) return icLoadingPromise;

  icLoadingPromise = (async () => {
    try {
      const icObjects = await loadICObjects();
      const coords: CelestialCoordinates[] = [];
      
      for (const obj of icObjects) {
        const ra = parseRA(obj.ra);
        const dec = parseDec(obj.dec);
        if (ra !== null && dec !== null) {
          // Normalize: IC0001 -> IC1
          const numPart = obj.code.replace(/^IC0*/, '');
          coords.push({
            code: `IC${numPart}`,
            ra,
            dec,
          });
        }
      }
      
      icCoordinatesCache = coords;
      icLoadingPromise = null;
      return coords;
    } catch (error) {
      console.error('Error loading IC coordinates:', error);
      icLoadingPromise = null;
      return [];
    }
  })();

  return icLoadingPromise;
}

// Pre-load IC coordinates on module import
loadICCoordinates().catch(() => {});

/**
 * Buscar coordenadas de un objeto por su código (sync - catálogo estático + IC cacheado)
 */
export function getObjectCoordinates(code: string): CelestialCoordinates | null {
  const normalizedCode = code.toUpperCase().replace(/\s/g, "");
  
  // Buscar coincidencia exacta en catálogo estático
  const exact = celestialCatalog.find(
    (obj) => obj.code.toUpperCase().replace(/\s/g, "") === normalizedCode
  );
  if (exact) return exact;
  
  // Buscar en IC cacheado (disponible una vez cargado el XLSX)
  if (icCoordinatesCache) {
    const icMatch = icCoordinatesCache.find(
      (obj) => obj.code.toUpperCase().replace(/\s/g, "") === normalizedCode
    );
    if (icMatch) return icMatch;
  }
  
  // Intentar variantes comunes
  if (normalizedCode === "NGC224") {
    return celestialCatalog.find((obj) => obj.code === "M31") || null;
  }
  
  // Buscar por número Messier si empieza con M
  if (normalizedCode.startsWith("M")) {
    const messierMatch = celestialCatalog.find(
      (obj) => obj.code.toUpperCase() === normalizedCode
    );
    if (messierMatch) return messierMatch;
  }
  
  return null;
}

/**
 * Buscar coordenadas de un objeto por su código (async - incluye IC del XLSX)
 */
export async function getObjectCoordinatesAsync(code: string): Promise<CelestialCoordinates | null> {
  // First try the static catalog
  const staticResult = getObjectCoordinates(code);
  if (staticResult) return staticResult;
  
  // Then try IC coordinates from XLSX
  const normalizedCode = code.toUpperCase().replace(/\s/g, "");
  if (normalizedCode.startsWith("IC")) {
    const icCoords = await loadICCoordinates();
    const match = icCoords.find(
      (obj) => obj.code.toUpperCase().replace(/\s/g, "") === normalizedCode
    );
    if (match) return match;
  }
  
  return null;
}
