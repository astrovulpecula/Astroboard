/**
 * Calcula la fase lunar para una fecha dada sin conexiones externas
 * Basado en el algoritmo astronómico de cálculo de fases lunares
 */

export type MoonPhase = {
  phase: number; // 0-1 (0 = Luna nueva, 0.5 = Luna llena)
  name: string;
  emoji: string;
  illumination: number; // Porcentaje de iluminación 0-100
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
  let name: string;
  let emoji: string;
  
  if (phase < 0.0625 || phase >= 0.9375) {
    name = 'Luna nueva';
    emoji = '🌑';
  } else if (phase < 0.1875) {
    name = 'Creciente';
    emoji = '🌒';
  } else if (phase < 0.3125) {
    name = 'Cuarto creciente';
    emoji = '🌓';
  } else if (phase < 0.4375) {
    name = 'Gibosa creciente';
    emoji = '🌔';
  } else if (phase < 0.5625) {
    name = 'Luna llena';
    emoji = '🌕';
  } else if (phase < 0.6875) {
    name = 'Gibosa menguante';
    emoji = '🌖';
  } else if (phase < 0.8125) {
    name = 'Cuarto menguante';
    emoji = '🌗';
  } else {
    name = 'Menguante';
    emoji = '🌘';
  }
  
  return {
    phase,
    name,
    emoji,
    illumination
  };
}

/**
 * Formatea la fase lunar para mostrar
 */
export function formatMoonPhase(moonPhase: MoonPhase): string {
  return `${moonPhase.emoji} ${moonPhase.name}`;
}
