import { loadICObjects, type ICObject } from './ic-data-loader';

export interface CelestialObject {
  code: string;
  nameEsp: string;
  constellation: string;
  objectType: string;
}

let cachedObjects: CelestialObject[] | null = null;
let loadingPromise: Promise<CelestialObject[]> | null = null;

export async function loadCelestialObjects(): Promise<CelestialObject[]> {
  if (cachedObjects) return cachedObjects;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Load existing CSV objects (Messier + NGC)
      const basePath = import.meta.env.PROD ? '/Astroboard' : '';
      const response = await fetch(`${basePath}/data/celestial-objects.csv`);
      const csvText = await response.text();
      
      const lines = csvText.split('\n');
      const objects: CelestialObject[] = [];

      // Skip header (line 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(';');
        if (parts.length >= 7) {
          const code = parts[0].trim();
          const nameEsp = parts[2].trim();
          const objectType = parts[4].trim();
          const constellation = parts[6].trim();

          if (code) {
            objects.push({
              code,
              nameEsp: nameEsp || "",
              constellation: constellation || "",
              objectType: objectType || "",
            });
          }
        }
      }

      // Load IC objects from XLSX and merge
      try {
        const icObjects = await loadICObjects();
        for (const ic of icObjects) {
          // Normalize IC code: IC0001 -> IC1, IC0042 -> IC42, IC1396 -> IC1396
          const numPart = ic.code.replace(/^IC0*/, '');
          const normalizedCode = `IC${numPart}`;
          
          objects.push({
            code: normalizedCode,
            nameEsp: ic.nameEsp || "",
            constellation: ic.constellationEsp || "",
            objectType: ic.typeEsp || "",
          });
        }
      } catch (err) {
        console.error('Error loading IC objects for merge:', err);
      }

      cachedObjects = objects;
      loadingPromise = null;
      return objects;
    } catch (error) {
      console.error('Error loading celestial objects:', error);
      loadingPromise = null;
      return [];
    }
  })();

  return loadingPromise;
}

export async function searchCelestialObjects(query: string, limit = 20): Promise<CelestialObject[]> {
  if (!query) return [];
  
  const objects = await loadCelestialObjects();
  const lowerQuery = query.toLowerCase();

  return objects
    .filter(obj => 
      obj.code.toLowerCase().includes(lowerQuery) ||
      (obj.nameEsp && obj.nameEsp.toLowerCase().includes(lowerQuery))
    )
    .slice(0, limit);
}

export async function getCelestialObjectByCode(code: string): Promise<CelestialObject | undefined> {
  const objects = await loadCelestialObjects();
  const lowerCode = code.toLowerCase();
  return objects.find(obj => obj.code.toLowerCase() === lowerCode);
}
