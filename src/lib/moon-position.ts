/**
 * Moon position calculations for visibility charts
 * Using simplified lunar position algorithm
 */

import { type ObserverLocation, calculateAltAz, type AltitudeDataPoint } from './astronomy-calculations';

/**
 * Calculate approximate Moon equatorial coordinates (RA, Dec) for a given date
 * Based on simplified lunar orbital elements
 */
export function getMoonCoordinates(date: Date): { ra: number; dec: number } {
  // Julian Date
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() + 
    date.getUTCHours() / 24 + 
    date.getUTCMinutes() / 1440;

  let y = year;
  let m = month;
  
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (y + 4716)) + 
             Math.floor(30.6001 * (m + 1)) + 
             day + B - 1524.5;

  // Days since J2000.0
  const T = (JD - 2451545.0) / 36525;
  
  // Mean elements (degrees)
  const L0 = 218.3165 + 481267.8813 * T; // Mean longitude
  const M = 134.9634 + 477198.8675 * T;  // Mean anomaly
  const F = 93.2721 + 483202.0175 * T;   // Argument of latitude
  const D = 297.8502 + 445267.1115 * T;  // Mean elongation
  const Om = 125.0446 - 1934.1363 * T;   // Longitude of ascending node

  const toRad = (deg: number) => deg * Math.PI / 180;
  const Mrad = toRad(M);
  const Drad = toRad(D);
  const Frad = toRad(F);
  const Omrad = toRad(Om);

  // Longitude perturbations (simplified)
  let longitude = L0 
    + 6.289 * Math.sin(Mrad)
    - 1.274 * Math.sin(2 * Drad - Mrad)
    + 0.658 * Math.sin(2 * Drad)
    + 0.214 * Math.sin(2 * Mrad)
    - 0.186 * Math.sin(toRad(M) * 0.9856)
    - 0.114 * Math.sin(2 * Frad);

  // Latitude perturbations (simplified)
  let latitude = 5.128 * Math.sin(Frad)
    + 0.281 * Math.sin(Mrad + Frad)
    + 0.278 * Math.sin(Mrad - Frad)
    + 0.173 * Math.sin(2 * Drad - Frad);

  // Normalize longitude
  longitude = ((longitude % 360) + 360) % 360;
  
  // Convert ecliptic to equatorial coordinates
  const eclipticObliquity = 23.439 - 0.0000004 * (JD - 2451545.0);
  const eclRad = toRad(eclipticObliquity);
  const lonRad = toRad(longitude);
  const latRad = toRad(latitude);

  // RA calculation
  const sinRA = Math.sin(lonRad) * Math.cos(eclRad) - Math.tan(latRad) * Math.sin(eclRad);
  const cosRA = Math.cos(lonRad);
  let ra = Math.atan2(sinRA, cosRA) * 180 / Math.PI;
  ra = ((ra % 360) + 360) % 360;
  ra = ra / 15; // Convert to hours

  // Dec calculation
  const sinDec = Math.sin(latRad) * Math.cos(eclRad) + 
                 Math.cos(latRad) * Math.sin(eclRad) * Math.sin(lonRad);
  const dec = Math.asin(sinDec) * 180 / Math.PI;

  return { ra, dec };
}

/**
 * Calculate Moon's altitude curve throughout the night
 */
export function calculateMoonNightVisibility(
  observer: ObserverLocation,
  date: Date
): AltitudeDataPoint[] {
  const data: AltitudeDataPoint[] = [];
  
  // Calculate from 18:00 to 06:00 next day
  const startDate = new Date(date);
  startDate.setHours(18, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(6, 0, 0, 0);
  
  const intervalMinutes = 15;
  const currentTime = new Date(startDate);
  
  while (currentTime <= endDate) {
    // Get Moon coordinates for this specific time (Moon moves ~13° per day)
    const moonCoords = getMoonCoordinates(currentTime);
    const { altitude, azimuth } = calculateAltAz(moonCoords.ra, moonCoords.dec, observer, currentTime);
    
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
    
    currentTime.setTime(currentTime.getTime() + intervalMinutes * 60000);
  }
  
  return data;
}
