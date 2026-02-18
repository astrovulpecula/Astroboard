import * as XLSX from 'xlsx';

export interface ICObject {
  code: string;
  nameEng: string;
  nameEsp: string;
  typeEng: string;
  typeEsp: string;
  constellationEng: string;
  constellationEsp: string;
  ra: string;   // HH:MM:SS.ss format
  dec: string;  // ±DD:MM:SS.s format
}

let cachedICObjects: ICObject[] | null = null;
let loadingPromise: Promise<ICObject[]> | null = null;

/**
 * Parse RA from HH:MM:SS.ss to decimal hours
 */
export function parseRA(raStr: string): number | null {
  if (!raStr || raStr === '#N/A') return null;
  const parts = raStr.split(':');
  if (parts.length !== 3) return null;
  const h = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  return h + m / 60 + s / 3600;
}

/**
 * Parse Dec from ±DD:MM:SS.s to decimal degrees
 */
export function parseDec(decStr: string): number | null {
  if (!decStr || decStr === '#N/A') return null;
  const sign = decStr.startsWith('-') ? -1 : 1;
  const cleaned = decStr.replace(/^[+-]/, '');
  const parts = cleaned.split(':');
  if (parts.length !== 3) return null;
  const d = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(s)) return null;
  return sign * (d + m / 60 + s / 3600);
}

/**
 * Load IC objects from the XLSX file
 */
export async function loadICObjects(): Promise<ICObject[]> {
  if (cachedICObjects) return cachedICObjects;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const basePath = import.meta.env.PROD ? '/Astroboard' : '';
      const response = await fetch(`${basePath}/data/ic-objects.xlsx`);
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      
      const objects: ICObject[] = [];
      
      for (const row of rows) {
        const code = String(row['CODE'] || '').trim();
        if (!code || !code.startsWith('IC')) continue;
        // Skip sub-entries like "IC0510 NED01"
        if (code.includes(' ')) continue;
        
        const nameEng = String(row['OBJECT NAME ENG'] || '').trim();
        const nameEsp = String(row['OBJECT NAME ESP'] || '').trim();
        const typeEng = String(row['OBJECT_TYPE_ENG'] || '').trim();
        const typeEsp = String(row['OBJECT_TYPE_ESP'] || '').trim();
        const constEng = String(row['CONSTELLATION_ENG'] || '').trim();
        const constEsp = String(row['CONSTELLATION_ESP'] || '').trim();
        const ra = String(row['RA'] || '').trim();
        const dec = String(row['Dec'] || '').trim();
        
        objects.push({
          code,
          nameEng: nameEng === '#N/A' ? '' : nameEng,
          nameEsp: nameEsp === '#N/A' ? '' : nameEsp,
          typeEng: typeEng === '#N/A' ? '' : typeEng,
          typeEsp: typeEsp === '#N/A' ? '' : typeEsp,
          constellationEng: constEng === '#N/A' ? '' : constEng,
          constellationEsp: constEsp === '#N/A' ? '' : constEsp,
          ra,
          dec,
        });
      }
      
      cachedICObjects = objects;
      loadingPromise = null;
      return objects;
    } catch (error) {
      console.error('Error loading IC objects:', error);
      loadingPromise = null;
      return [];
    }
  })();

  return loadingPromise;
}
