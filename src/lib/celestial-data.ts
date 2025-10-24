import celestialObjectsCSV from '@/data/celestial-objects.csv?raw';

export interface CelestialObject {
  code: string;
  nameEsp: string;
  constellation: string;
  objectType: string;
}

let cachedObjects: CelestialObject[] | null = null;

export function loadCelestialObjects(): CelestialObject[] {
  if (cachedObjects) return cachedObjects;

  const lines = celestialObjectsCSV.split('\n');
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
          nameEsp,
          constellation,
          objectType,
        });
      }
    }
  }

  cachedObjects = objects;
  return objects;
}

export function searchCelestialObjects(query: string, limit = 20): CelestialObject[] {
  if (!query) return [];
  
  const objects = loadCelestialObjects();
  const lowerQuery = query.toLowerCase();

  return objects
    .filter(obj => obj.code.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}

export function getCelestialObjectByCode(code: string): CelestialObject | undefined {
  const objects = loadCelestialObjects();
  return objects.find(obj => obj.code.toLowerCase() === code.toLowerCase());
}
