/**
 * Calcula la fase lunar para una fecha dada sin conexiones externas
 * Basado en el algoritmo astronómico de cálculo de fases lunares
 */

export type MoonPhase = {
  phase: number; // 0-1 (0 = Luna nueva, 0.5 = Luna llena)
  name: string; // For backwards compatibility
  nameES: string;
  nameEN: string;
  emoji: string;
  illumination: number; // Porcentaje de iluminación 0-100
};

export type MoonTimes = {
  moonrise: Date;
  moonset: Date;
  darkHours: number; // Horas de oscuridad total
};

/**
 * Calcula la fase lunar para una fecha dada
 * @param date Fecha para calcular la fase lunar
 * @returns Información sobre la fase lunar
 */
export function calculateMoonPhase(date: Date | string): MoonPhase {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Fecha de referencia: Luna nueva conocida (01/01/2000 a las 18:14 UTC)
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  
  // Período sinódico lunar (duración promedio de un ciclo lunar completo)
  const synodicMonth = 29.53058867; // días
  
  // Calcular días desde la luna nueva de referencia
  const daysSinceKnownNewMoon = (d.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calcular la fase actual (0-1)
  const phase = (daysSinceKnownNewMoon % synodicMonth) / synodicMonth;
  
  // Calcular porcentaje de iluminación
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50);
  
  // Determinar nombre y emoji de la fase
  let nameES: string;
  let nameEN: string;
  let emoji: string;
  
  if (phase < 0.0625 || phase >= 0.9375) {
    nameES = 'Luna nueva';
    nameEN = 'New Moon';
    emoji = '🌑';
  } else if (phase < 0.1875) {
    nameES = 'Creciente';
    nameEN = 'Waxing Crescent';
    emoji = '🌒';
  } else if (phase < 0.3125) {
    nameES = 'Cuarto creciente';
    nameEN = 'First Quarter';
    emoji = '🌓';
  } else if (phase < 0.4375) {
    nameES = 'Gibosa creciente';
    nameEN = 'Waxing Gibbous';
    emoji = '🌔';
  } else if (phase < 0.5625) {
    nameES = 'Luna llena';
    nameEN = 'Full Moon';
    emoji = '🌕';
  } else if (phase < 0.6875) {
    nameES = 'Gibosa menguante';
    nameEN = 'Waning Gibbous';
    emoji = '🌖';
  } else if (phase < 0.8125) {
    nameES = 'Cuarto menguante';
    nameEN = 'Last Quarter';
    emoji = '🌗';
  } else {
    nameES = 'Menguante';
    nameEN = 'Waning Crescent';
    emoji = '🌘';
  }
  
  return {
    phase,
    name: nameES, // Default to Spanish for backwards compatibility
    nameES,
    nameEN,
    emoji,
    illumination
  };
}

/**
 * Formatea la fase lunar para mostrar
 * @param moonPhase Objeto con información de la fase lunar
 * @param language Idioma ('es' | 'en'), por defecto 'es'
 */
export function formatMoonPhase(moonPhase: MoonPhase, language: 'es' | 'en' = 'es'): string {
  const name = language === 'en' ? moonPhase.nameEN : moonPhase.nameES;
  return `${moonPhase.emoji} ${name}`;
}

/**
 * Calcula los horarios de salida y puesta de la luna
 * Algoritmo simplificado basado en cálculos astronómicos
 * @param date Fecha para calcular
 * @param latitude Latitud (por defecto 40.4° - España central)
 * @param longitude Longitud (por defecto -3.7° - España central)
 */
export function calculateMoonTimes(
  date: Date | string,
  latitude: number = 40.4,
  longitude: number = -3.7
): MoonTimes {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Calcular días julianos
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  
  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  // Calcular fase lunar para ajustar horarios
  const moonPhase = calculateMoonPhase(d);
  
  // Parámetros solares para calcular el anochecer/amanecer
  const dayOfYear = Math.floor((d.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const solarDeclination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * (Math.PI / 180);
  
  const latRad = latitude * (Math.PI / 180);
  const cosHourAngle = -Math.tan(latRad) * Math.tan(solarDeclination);
  
  // Horas de luz solar
  let daylightHours = 12;
  if (cosHourAngle >= -1 && cosHourAngle <= 1) {
    const hourAngle = Math.acos(cosHourAngle);
    daylightHours = (2 * hourAngle * 12) / Math.PI;
  }
  
  // Calcular horarios aproximados de salida/puesta de luna
  // La luna sale aproximadamente 50 minutos más tarde cada día
  const moonDelay = moonPhase.phase * 24; // Retraso basado en fase
  
  // Hora base de salida de luna (opuesta al sol en luna llena)
  let moonriseHour = 12 - daylightHours / 2 + moonDelay;
  let moonsetHour = 12 + daylightHours / 2 + moonDelay;
  
  // Normalizar a 24 horas
  while (moonriseHour >= 24) moonriseHour -= 24;
  while (moonriseHour < 0) moonriseHour += 24;
  while (moonsetHour >= 24) moonsetHour -= 24;
  while (moonsetHour < 0) moonsetHour += 24;
  
  // Crear fechas
  const moonrise = new Date(d);
  moonrise.setHours(Math.floor(moonriseHour), Math.floor((moonriseHour % 1) * 60), 0, 0);
  
  const moonset = new Date(d);
  moonset.setHours(Math.floor(moonsetHour), Math.floor((moonsetHour % 1) * 60), 0, 0);
  
  // Si moonset es antes que moonrise, añadir un día a moonset
  if (moonset < moonrise) {
    moonset.setDate(moonset.getDate() + 1);
  }
  
  // Calcular horas de oscuridad total
  // Oscuridad total = cuando no hay luna Y es de noche
  const nightHours = 24 - daylightHours;
  
  // Horas en que la luna está fuera (depende de cuándo sale/se pone)
  let moonAbsentHours = 0;
  
  if (moonPhase.phase < 0.0625 || moonPhase.phase >= 0.9375) {
    // Luna nueva: oscuridad toda la noche
    moonAbsentHours = nightHours;
  } else if (moonPhase.phase >= 0.4375 && moonPhase.phase < 0.5625) {
    // Luna llena: sin oscuridad total
    moonAbsentHours = 0;
  } else {
    // Fases intermedias: calcular aproximadamente
    const illuminationFactor = moonPhase.illumination / 100;
    moonAbsentHours = nightHours * (1 - illuminationFactor);
  }
  
  return {
    moonrise,
    moonset,
    darkHours: Math.max(0, moonAbsentHours)
  };
}
