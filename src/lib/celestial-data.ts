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
    .filter(obj => obj.code.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}

export async function getCelestialObjectByCode(code: string): Promise<CelestialObject | undefined> {
  const objects = await loadCelestialObjects();
  return objects.find(obj => obj.code.toLowerCase() === code.toLowerCase());
}
