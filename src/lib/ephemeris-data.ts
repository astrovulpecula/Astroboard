export interface Ephemeris {
  date: string;
  category: string;
  eventES: string;
  eventEN: string;
  notes: string;
}

let cachedEphemeris: Ephemeris[] | null = null;
let loadingPromise: Promise<Ephemeris[]> | null = null;

export async function loadEphemeris(): Promise<Ephemeris[]> {
  if (cachedEphemeris) return cachedEphemeris;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const basePath = import.meta.env.PROD ? '/Astroboard' : '';
      const response = await fetch(`${basePath}/data/efemerides.csv`);
      const csvText = await response.text();
      
      const lines = csvText.split('\n');
      const ephemerides: Ephemeris[] = [];

      // Skip header (line 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 5) {
          const dateStr = parts[0].trim();
          const category = parts[1].trim();
          const eventES = parts[2].trim();
          const eventEN = parts[3].trim();
          const notes = parts[4].trim();

          if (dateStr) {
            ephemerides.push({
              date: dateStr,
              category,
              eventES: eventES || "",
              eventEN: eventEN || "",
              notes: notes || "",
            });
          }
        }
      }

      cachedEphemeris = ephemerides;
      loadingPromise = null;
      return ephemerides;
    } catch (error) {
      console.error('Error loading ephemeris:', error);
      loadingPromise = null;
      return [];
    }
  })();

  return loadingPromise;
}

// Parsear fecha del formato "14-dic.-25" a objeto Date
function parseSpanishDate(dateStr: string): Date | null {
  const monthMap: { [key: string]: number } = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const monthKey = parts[1].replace('.', '').toLowerCase();
  const year = parseInt(parts[2]) + 2000; // Asumimos 20XX

  const month = monthMap[monthKey];
  if (month === undefined) return null;

  return new Date(year, month, day);
}

export async function getNextEphemeris(): Promise<Ephemeris | null> {
  const ephemerides = await loadEphemeris();
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Comparar solo fechas

  let nextEvent: Ephemeris | null = null;
  let minDiff = Infinity;

  for (const eph of ephemerides) {
    const eventDate = parseSpanishDate(eph.date);
    if (!eventDate) continue;

    const diff = eventDate.getTime() - now.getTime();
    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      nextEvent = eph;
    }
  }

  return nextEvent;
}

// Formatear fecha de "14-dic.-25" a "14 de diciembre de 2025"
export function formatSpanishDate(dateStr: string): string {
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const date = parseSpanishDate(dateStr);
  if (!date) return dateStr;

  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}
