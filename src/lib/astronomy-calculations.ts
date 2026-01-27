/**
 * Astronomical calculations for object visibility
 * Using standard algorithms from "Astronomical Algorithms" by Jean Meeus
 */

export interface ObserverLocation {
  latitude: number;  // grados
  longitude: number; // grados (positivo al este)
}

export interface AltitudeDataPoint {
  time: Date;
  altitude: number;      // grados sobre el horizonte
  azimuth: number;       // grados desde el norte
  hourLabel: string;     // "21:00", "22:00", etc.
}

export interface VisibilityResult {
  data: AltitudeDataPoint[];
  transitTime: Date | null;
  transitAltitude: number;
  riseTime: Date | null;
  setTime: Date | null;
  isCircumpolar: boolean;
  neverRises: boolean;
}

/**
 * Convertir grados a radianes
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convertir radianes a grados
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalizar ángulo a [0, 360)
 */
function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Calcular el Día Juliano para una fecha dada
 */
function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() + 
    date.getUTCHours() / 24 + 
    date.getUTCMinutes() / 1440 + 
    date.getUTCSeconds() / 86400;

  let y = year;
  let m = month;
  
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) + 
         Math.floor(30.6001 * (m + 1)) + 
         day + B - 1524.5;
}

/**
 * Calcular el Tiempo Sidéreo Local (LST) en horas
 */
function getLocalSiderealTime(date: Date, longitude: number): number {
  const jd = getJulianDay(date);
  const T = (jd - 2451545.0) / 36525;
  
  // Greenwich Mean Sidereal Time at 0h UT (en grados)
  let gmst = 280.46061837 + 
             360.98564736629 * (jd - 2451545.0) + 
             0.000387933 * T * T - 
             T * T * T / 38710000;
  
  gmst = normalizeAngle(gmst);
  
  // Convertir a horas y añadir longitud
  const lst = (gmst / 15) + (longitude / 15);
  
  // Normalizar a [0, 24)
  let lstNorm = lst % 24;
  if (lstNorm < 0) lstNorm += 24;
  
  return lstNorm;
}

/**
 * Calcular Hour Angle en horas
 */
function getHourAngle(lst: number, ra: number): number {
  let ha = lst - ra;
  // Normalizar a [-12, 12]
  while (ha < -12) ha += 24;
  while (ha > 12) ha -= 24;
  return ha;
}

/**
 * Calcular Altitud y Azimut del objeto
 * @param ra - Right Ascension en horas
 * @param dec - Declination en grados
 * @param observer - Ubicación del observador
 * @param date - Fecha y hora
 */
export function calculateAltAz(
  ra: number,
  dec: number,
  observer: ObserverLocation,
  date: Date
): { altitude: number; azimuth: number } {
  const lst = getLocalSiderealTime(date, observer.longitude);
  const ha = getHourAngle(lst, ra);
  
  // Convertir a radianes
  const haRad = toRadians(ha * 15); // HA en grados
  const decRad = toRadians(dec);
  const latRad = toRadians(observer.latitude);
  
  // Calcular altitud
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = toDegrees(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
  
  // Calcular azimut
  const cosAz = (Math.sin(decRad) - Math.sin(toRadians(altitude)) * Math.sin(latRad)) /
                (Math.cos(toRadians(altitude)) * Math.cos(latRad));
  let azimuth = toDegrees(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  
  // Corregir cuadrante del azimut
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }
  
  return { altitude, azimuth: normalizeAngle(azimuth) };
}

/**
 * Calcular la hora de tránsito (máxima altitud)
 */
function calculateTransitTime(
  ra: number,
  observer: ObserverLocation,
  date: Date
): Date {
  // Crear fecha a medianoche local
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  
  // LST a medianoche
  const lstMidnight = getLocalSiderealTime(midnight, observer.longitude);
  
  // Hora del tránsito = cuando LST = RA
  let transitLst = ra;
  let hoursUntilTransit = transitLst - lstMidnight;
  
  // Normalizar
  while (hoursUntilTransit < -12) hoursUntilTransit += 24;
  while (hoursUntilTransit > 12) hoursUntilTransit -= 24;
  
  // Convertir a tiempo solar (aproximado)
  const transitTime = new Date(midnight);
  transitTime.setTime(midnight.getTime() + hoursUntilTransit * 3600000);
  
  return transitTime;
}

/**
 * Calcular curva de visibilidad nocturna
 * @param ra - Right Ascension en horas (0-24)
 * @param dec - Declination en grados (-90 a +90)
 * @param observer - Ubicación del observador
 * @param date - Fecha para calcular (usará la noche de esa fecha)
 */
export function calculateNightVisibility(
  ra: number,
  dec: number,
  observer: ObserverLocation,
  date: Date = new Date()
): VisibilityResult {
  const data: AltitudeDataPoint[] = [];
  let maxAltitude = -90;
  let transitTime: Date | null = null;
  let riseTime: Date | null = null;
  let setTime: Date | null = null;
  let wasAboveHorizon = false;
  
  // Calcular desde las 18:00 hasta las 06:00 del día siguiente
  // Usar la fecha proporcionada
  const startDate = new Date(date);
  startDate.setHours(18, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(6, 0, 0, 0);
  
  // Calcular cada 15 minutos (48 puntos para 12 horas)
  const intervalMinutes = 15;
  const currentTime = new Date(startDate);
  
  while (currentTime <= endDate) {
    const { altitude, azimuth } = calculateAltAz(ra, dec, observer, currentTime);
    
    const hourLabel = currentTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    data.push({
      time: new Date(currentTime),
      altitude,
      azimuth,
      hourLabel
    });
    
    // Track max altitude
    if (altitude > maxAltitude) {
      maxAltitude = altitude;
      transitTime = new Date(currentTime);
    }
    
    // Track rise/set times
    const isAboveHorizon = altitude > 0;
    if (!wasAboveHorizon && isAboveHorizon && !riseTime) {
      riseTime = new Date(currentTime);
    }
    if (wasAboveHorizon && !isAboveHorizon && !setTime) {
      setTime = new Date(currentTime);
    }
    wasAboveHorizon = isAboveHorizon;
    
    currentTime.setTime(currentTime.getTime() + intervalMinutes * 60000);
  }
  
  // Determinar si es circumpolar o nunca sale
  const decRad = toRadians(dec);
  const latRad = toRadians(observer.latitude);
  const isCircumpolar = Math.abs(dec) > (90 - Math.abs(observer.latitude)) && 
                        Math.sign(dec) === Math.sign(observer.latitude);
  const neverRises = Math.abs(dec) > (90 - Math.abs(observer.latitude)) && 
                     Math.sign(dec) !== Math.sign(observer.latitude);
  
  return {
    data,
    transitTime,
    transitAltitude: maxAltitude,
    riseTime,
    setTime,
    isCircumpolar,
    neverRises
  };
}

/**
 * Parsear coordenadas desde string "lat, lon"
 */
export function parseCoordinates(coordString: string): ObserverLocation | null {
  if (!coordString) return null;
  
  const parts = coordString.split(',').map(p => p.trim());
  if (parts.length !== 2) return null;
  
  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);
  
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  
  return { latitude, longitude };
}

/**
 * Formatear hora de tránsito
 */
export function formatTransitTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Obtener descripción de visibilidad
 */
export function getVisibilityDescription(result: VisibilityResult, language: 'es' | 'en' = 'es'): string {
  if (result.neverRises) {
    return language === 'en' ? 'Never rises from this location' : 'Nunca visible desde esta ubicación';
  }
  if (result.isCircumpolar) {
    return language === 'en' ? 'Circumpolar - always visible' : 'Circumpolar - siempre visible';
  }
  if (result.transitAltitude < 10) {
    return language === 'en' ? 'Very low visibility' : 'Visibilidad muy baja';
  }
  if (result.transitAltitude < 30) {
    return language === 'en' ? 'Low visibility' : 'Visibilidad baja';
  }
  if (result.transitAltitude < 60) {
    return language === 'en' ? 'Good visibility' : 'Buena visibilidad';
  }
  return language === 'en' ? 'Excellent visibility' : 'Excelente visibilidad';
}

export interface AnnualVisibilityDataPoint {
  month: number;
  monthLabel: string;
  maxAltitude: number;
  visibleHours: number;
  transitTime: string;
}

export interface AnnualVisibilityResult {
  data: AnnualVisibilityDataPoint[];
  bestMonth: number;
  bestMonthName: string;
  isCircumpolar: boolean;
  neverRises: boolean;
}

/**
 * Calcular visibilidad anual - máxima altitud nocturna para cada mes
 */
export function calculateAnnualVisibility(
  ra: number,
  dec: number,
  observer: ObserverLocation,
  year: number = new Date().getFullYear()
): AnnualVisibilityResult {
  const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const data: AnnualVisibilityDataPoint[] = [];
  let bestMonth = 0;
  let bestAltitude = -90;
  
  // Determinar si es circumpolar o nunca sale
  const isCircumpolar = Math.abs(dec) > (90 - Math.abs(observer.latitude)) && 
                        Math.sign(dec) === Math.sign(observer.latitude);
  const neverRises = Math.abs(dec) > (90 - Math.abs(observer.latitude)) && 
                     Math.sign(dec) !== Math.sign(observer.latitude);
  
  for (let month = 0; month < 12; month++) {
    // Usar el día 15 de cada mes como representativo
    const date = new Date(year, month, 15);
    const visibility = calculateNightVisibility(ra, dec, observer, date);
    
    // Contar horas visibles (altitud > 0)
    const visiblePoints = visibility.data.filter(d => d.altitude > 0);
    const visibleHours = (visiblePoints.length * 15) / 60; // 15 min por punto
    
    data.push({
      month: month + 1,
      monthLabel: monthLabels[month],
      maxAltitude: visibility.transitAltitude,
      visibleHours,
      transitTime: formatTransitTime(visibility.transitTime)
    });
    
    if (visibility.transitAltitude > bestAltitude) {
      bestAltitude = visibility.transitAltitude;
      bestMonth = month + 1;
    }
  }
  
  return {
    data,
    bestMonth,
    bestMonthName: monthLabels[bestMonth - 1] || '',
    isCircumpolar,
    neverRises
  };
}
