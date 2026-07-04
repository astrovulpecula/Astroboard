/**
 * Approximate heliocentric/geocentric coordinates for the Moon, Sun
 * and major planets, plus a helper that builds a full nightly visibility
 * curve (18:00–06:00) compatible with VisibilityResult.
 *
 * Planetary positions use Standish (JPL) mean Keplerian elements at J2000
 * with linear rates per century — accurate to a few arcminutes for
 * 1800–2050, more than enough for an altitude curve.
 */

import {
  calculateAltAz,
  type AltitudeDataPoint,
  type ObserverLocation,
  type VisibilityResult,
} from './astronomy-calculations';
import { getMoonCoordinates } from './moon-position';

export interface PlanetaryAnnualPoint {
  month: number;
  monthLabel: string;
  maxAltitude: number;
  midnightAltitude: number;
  visibleHours: number;
  transitTime: string;
}
export interface PlanetaryAnnualResult {
  data: PlanetaryAnnualPoint[];
  bestMonth: number;
  bestMonthName: string;
  isCircumpolar: boolean;
  neverRises: boolean;
}

export type PlanetaryBody =
  | 'Luna'
  | 'Sol'
  | 'Mercurio'
  | 'Venus'
  | 'Marte'
  | 'Júpiter'
  | 'Saturno'
  | 'Urano'
  | 'Neptuno';

const PLANETARY_NAMES: PlanetaryBody[] = [
  'Luna', 'Sol', 'Mercurio', 'Venus', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno',
];

export function isPlanetaryBody(name: string): name is PlanetaryBody {
  return PLANETARY_NAMES.includes(name as PlanetaryBody);
}

const DEG = Math.PI / 180;

function julianDay(date: Date): number {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let y = Y;
  let m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

function norm360(x: number): number { return ((x % 360) + 360) % 360; }

// Standish J2000 elements [a, e, I, L, varpi, Omega] and rates per century
// a in AU; angles in degrees.
type Elements = [number, number, number, number, number, number];
interface BodyElems { e0: Elements; r: Elements; }

const ELEMS: Record<string, BodyElems> = {
  Mercurio: {
    e0: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    r:  [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  },
  Venus: {
    e0: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    r:  [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  },
  Tierra: {
    e0: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    r:  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  },
  Marte: {
    e0: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    r:  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  },
  'Júpiter': {
    e0: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    r:  [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  },
  Saturno: {
    e0: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    r:  [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  },
  Urano: {
    e0: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    r:  [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  },
  Neptuno: {
    e0: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    r:  [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  },
};

/**
 * Heliocentric ecliptic position (J2000) in AU for a given body.
 */
function heliocentric(body: keyof typeof ELEMS, T: number): { x: number; y: number; z: number } {
  const { e0, r } = ELEMS[body];
  const a = e0[0] + r[0] * T;
  const e = e0[1] + r[1] * T;
  const I = e0[2] + r[2] * T;
  const L = e0[3] + r[3] * T;
  const varpi = e0[4] + r[4] * T;
  const Omega = e0[5] + r[5] * T;

  // Argument of perihelion and mean anomaly
  const omega = varpi - Omega;
  let M = ((L - varpi) % 360 + 540) % 360 - 180; // [-180,180]

  // Solve Kepler's equation: M = E - e_deg*sin(E)
  const eStar = (180 / Math.PI) * e; // "e in degrees" trick
  let E = M + eStar * Math.sin(M * DEG);
  for (let i = 0; i < 8; i++) {
    const dM = M - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-7) break;
  }

  const xPrime = a * (Math.cos(E * DEG) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG);

  const cw = Math.cos(omega * DEG), sw = Math.sin(omega * DEG);
  const cO = Math.cos(Omega * DEG), sO = Math.sin(Omega * DEG);
  const cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);

  const x = (cw * cO - sw * sO * cI) * xPrime + (-sw * cO - cw * sO * cI) * yPrime;
  const y = (cw * sO + sw * cO * cI) * xPrime + (-sw * sO + cw * cO * cI) * yPrime;
  const z = (sw * sI) * xPrime + (cw * sI) * yPrime;

  return { x, y, z };
}

/**
 * Geocentric equatorial (J2000) RA (hours) and Dec (deg) for a planet.
 */
function planetEquatorial(body: keyof typeof ELEMS, date: Date): { ra: number; dec: number } {
  const T = (julianDay(date) - 2451545.0) / 36525;
  const p = heliocentric(body, T);
  const e = heliocentric('Tierra', T);
  let xg = p.x - e.x;
  let yg = p.y - e.y;
  let zg = p.z - e.z;

  const eps = 23.43928 * DEG;
  const X = xg;
  const Y = yg * Math.cos(eps) - zg * Math.sin(eps);
  const Z = yg * Math.sin(eps) + zg * Math.cos(eps);

  let raDeg = Math.atan2(Y, X) * 180 / Math.PI;
  raDeg = norm360(raDeg);
  const ra = raDeg / 15;
  const r = Math.sqrt(X * X + Y * Y + Z * Z);
  const dec = Math.asin(Z / r) * 180 / Math.PI;
  return { ra, dec };
}

/**
 * Geocentric equatorial coordinates of the Sun (RA hours, Dec deg).
 * Derived from Earth's heliocentric position (Sun = -Earth).
 */
function sunEquatorial(date: Date): { ra: number; dec: number } {
  const T = (julianDay(date) - 2451545.0) / 36525;
  const e = heliocentric('Tierra', T);
  const xg = -e.x, yg = -e.y, zg = -e.z;
  const eps = 23.43928 * DEG;
  const X = xg;
  const Y = yg * Math.cos(eps) - zg * Math.sin(eps);
  const Z = yg * Math.sin(eps) + zg * Math.cos(eps);
  let raDeg = norm360(Math.atan2(Y, X) * 180 / Math.PI);
  const ra = raDeg / 15;
  const r = Math.sqrt(X * X + Y * Y + Z * Z);
  const dec = Math.asin(Z / r) * 180 / Math.PI;
  return { ra, dec };
}

export function getPlanetaryCoordinates(name: string, date: Date): { ra: number; dec: number } | null {
  if (name === 'Luna') return getMoonCoordinates(date);
  if (name === 'Sol') return sunEquatorial(date);
  if (name in ELEMS) return planetEquatorial(name as keyof typeof ELEMS, date);
  return null;
}

/**
 * Build a 18:00–06:00 visibility curve for a planetary body, recomputing
 * RA/Dec at each step (necessary for the Moon and reasonable for planets).
 */
export function calculatePlanetaryNightVisibility(
  name: PlanetaryBody,
  observer: ObserverLocation,
  date: Date = new Date(),
): VisibilityResult {
  return computePlanetaryVisibilityWindow(name, observer, date, 18, 6);
}

/**
 * Daytime visibility curve for a planetary body (default 04:00–22:00 same day).
 * Intended for the Sun.
 */
export function calculatePlanetaryDayVisibility(
  name: PlanetaryBody,
  observer: ObserverLocation,
  date: Date = new Date(),
): VisibilityResult {
  return computePlanetaryVisibilityWindow(name, observer, date, 4, 22, /*sameDay*/ true);
}

function computePlanetaryVisibilityWindow(
  name: PlanetaryBody,
  observer: ObserverLocation,
  date: Date,
  startHour: number,
  endHour: number,
  sameDay = false,
): VisibilityResult {
  const data: AltitudeDataPoint[] = [];
  let maxAltitude = -90;
  let transitTime: Date | null = null;
  let riseTime: Date | null = null;
  let setTime: Date | null = null;
  let wasAbove = false;

  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  if (!sameDay) end.setDate(end.getDate() + 1);
  end.setHours(endHour, 0, 0, 0);

  const stepMin = 15;
  const cur = new Date(start);
  while (cur <= end) {
    const coords = getPlanetaryCoordinates(name, cur);
    if (!coords) break;
    const { altitude, azimuth } = calculateAltAz(coords.ra, coords.dec, observer, cur);
    const hourLabel = cur.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    data.push({ time: new Date(cur), altitude, azimuth, hourLabel });

    if (altitude > maxAltitude) {
      maxAltitude = altitude;
      transitTime = new Date(cur);
    }
    const above = altitude > 0;
    if (!wasAbove && above && !riseTime) riseTime = new Date(cur);
    if (wasAbove && !above && !setTime) setTime = new Date(cur);
    wasAbove = above;
    cur.setTime(cur.getTime() + stepMin * 60000);
  }

  return {
    data,
    transitTime,
    transitAltitude: maxAltitude,
    riseTime,
    setTime,
    isCircumpolar: false,
    neverRises: false,
  };
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function calculatePlanetaryAnnualVisibility(
  name: PlanetaryBody,
  observer: ObserverLocation,
  year: number = new Date().getFullYear(),
): PlanetaryAnnualResult {
  const data: PlanetaryAnnualPoint[] = [];
  let bestMonth = 0;
  let bestAltitude = -90;

  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 15);
    const vis = calculatePlanetaryNightVisibility(name, observer, date);

    const midnight = new Date(year, month, 16, 0, 0, 0);
    const mc = getPlanetaryCoordinates(name, midnight);
    const midAlt = mc ? calculateAltAz(mc.ra, mc.dec, observer, midnight).altitude : -90;

    const visiblePoints = vis.data.filter((d) => d.altitude > 0);
    const visibleHours = (visiblePoints.length * 15) / 60;

    data.push({
      month: month + 1,
      monthLabel: MONTHS_ES[month],
      maxAltitude: vis.transitAltitude,
      midnightAltitude: parseFloat(midAlt.toFixed(1)),
      visibleHours,
      transitTime: vis.transitTime
        ? vis.transitTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '—',
    });

    if (midAlt > bestAltitude) {
      bestAltitude = midAlt;
      bestMonth = month + 1;
    }
  }

  return {
    data,
    bestMonth,
    bestMonthName: MONTHS_ES[bestMonth - 1] || '',
    isCircumpolar: false,
    neverRises: false,
  };
}