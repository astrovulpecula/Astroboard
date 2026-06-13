import React, { useMemo } from "react";
import { Moon, Sunset, Sparkles, Target, CloudSun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { calculateMoonPhase } from "@/lib/lunar-phase";
import {
  parseCoordinates,
  calculateNightVisibility,
} from "@/lib/astronomy-calculations";
import {
  calculateMoonNightVisibility,
  getMoonCoordinates,
} from "@/lib/moon-position";
import { getObjectCoordinates } from "@/lib/celestial-coordinates";

interface ActiveObj {
  id: string;
  objectId: string;
  objectName?: string;
}

interface Props {
  coordinates?: string;
  activeObjects: ActiveObj[];
  altitudeLimit: number;
  language: "es" | "en";
  forecast?: any;
  locationName?: string;
}

const SYNODIC = 29.53058867;

function fmtTime(d: Date, lang: "es" | "en") {
  return d.toLocaleTimeString(lang === "en" ? "en-US" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(d: Date, lang: "es" | "en") {
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function fmtHM(hours: number) {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * Twilight time using simplified solar geometry.
 * altDeg: -0.833 (sunset), -12 (nautical), -18 (astronomical)
 * direction: "set" (after noon) or "rise" (before noon)
 */
function twilightTime(
  date: Date,
  lat: number,
  lon: number,
  altDeg: number,
  direction: "set" | "rise",
): Date | null {
  const y = date.getFullYear();
  const start = new Date(y, 0, 0);
  const dayOfYear = Math.floor(
    (date.getTime() - start.getTime()) / 86400000,
  );
  const decl =
    23.45 *
    Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) *
    -1 *
    (Math.PI / 180);
  const latR = (lat * Math.PI) / 180;
  const altR = (altDeg * Math.PI) / 180;
  const cosH =
    (Math.sin(altR) - Math.sin(latR) * Math.sin(decl)) /
    (Math.cos(latR) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null; // no twilight (polar)
  const H = (Math.acos(cosH) * 180) / Math.PI; // degrees
  const hoursFromNoon = H / 15;
  // Solar noon UTC ≈ 12:00 - lon/15
  const noonUTC = Date.UTC(y, date.getMonth(), date.getDate(), 12, 0, 0);
  const noonLocalMs = noonUTC - (lon / 15) * 3600000;
  const offset = direction === "set" ? hoursFromNoon : -hoursFromNoon;
  return new Date(noonLocalMs + offset * 3600000);
}

function angularSeparation(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  // RA in hours, dec in deg
  const r1 = (ra1 * 15 * Math.PI) / 180;
  const r2 = (ra2 * 15 * Math.PI) / 180;
  const d1 = (dec1 * Math.PI) / 180;
  const d2 = (dec2 * Math.PI) / 180;
  const c =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

export default function AstronomicalContext({
  coordinates,
  activeObjects,
  altitudeLimit,
  language,
  forecast,
  locationName,
}: Props) {
  const L = useMemo(() => {
    return language === "en"
      ? {
          moonTitle: "Moon phase",
          illuminated: "illuminated",
          toNew: "to new moon",
          toFull: "to full moon",
          windowTitle: "Tonight's window",
          nautical: "Nautical dusk",
          astro: "Astronomical dusk",
          astroDawn: "Astro. dawn",
          moonrise: "Moonrise",
          moonset: "Moonset",
          darkness: "Astronomical darkness",
          bestTitle: "Best target tonight",
          useful: "useful imaging time",
          aboveAlt: "above",
          noTarget: "No active project visible tonight above",
          newMoonTitle: "Next new moon",
          inDays: "in",
          days: "days",
          day: "day",
          narrowband: "Best window for narrowband",
          broadband: "Best window for broadband (RGB)",
          noCoords: "Set your main location to see tonight's context.",
          forecastTitle: "Forecast",
          today: "Today",
          tomorrow: "Tomorrow",
          precip: "rain",
        }
      : {
          moonTitle: "Fase lunar",
          illuminated: "iluminada",
          toNew: "para luna nueva",
          toFull: "para luna llena",
          windowTitle: "Ventana de esta noche",
          nautical: "Crep. náutico",
          astro: "Crep. astronómico",
          astroDawn: "Amanecer astr.",
          moonrise: "Sale luna",
          moonset: "Se pone luna",
          darkness: "Oscuridad astronómica",
          bestTitle: "Mejor objeto esta noche",
          useful: "tiempo útil de captura",
          aboveAlt: "sobre",
          noTarget: "Ningún proyecto activo visible esta noche sobre",
          newMoonTitle: "Próxima luna nueva",
          inDays: "en",
          days: "días",
          day: "día",
          narrowband: "Ideal para banda estrecha",
          broadband: "Ideal para banda ancha (RGB)",
          noCoords: "Configura tu ubicación principal para ver el contexto de esta noche.",
          forecastTitle: "Pronóstico",
          today: "Hoy",
          tomorrow: "Mañana",
          precip: "lluvia",
        };
  }, [language]);

  const coords = useMemo(
    () => (coordinates ? parseCoordinates(coordinates) : null),
    [coordinates],
  );

  const data = useMemo(() => {
    const now = new Date();
    const phase = calculateMoonPhase(now);

    // Days until new / full moon
    const daysToNew = ((1 - phase.phase) % 1) * SYNODIC;
    const daysToFull =
      (((0.5 - phase.phase) % 1) + 1) % 1 * SYNODIC;
    const nextNewMoonDate = new Date(
      now.getTime() + daysToNew * 86400000,
    );
    const nextFullMoonDate = new Date(
      now.getTime() + daysToFull * 86400000,
    );

    if (!coords) {
      return {
        phase,
        daysToNew,
        daysToFull,
        nextNewMoonDate,
        nextFullMoonDate,
        twilight: null as null | {
          sunset: Date | null;
          nautical: Date | null;
          astroDusk: Date | null;
          astroDawn: Date | null;
          moonrise: Date | null;
          moonset: Date | null;
          darknessHours: number;
        },
        best: null as null | {
          name: string;
          objectId: string;
          usefulHours: number;
        },
      };
    }

    // Twilight
    const sunset = twilightTime(now, coords.latitude, coords.longitude, -0.833, "set");
    const nautical = twilightTime(now, coords.latitude, coords.longitude, -12, "set");
    const astroDusk = twilightTime(now, coords.latitude, coords.longitude, -18, "set");
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const astroDawn = twilightTime(tomorrow, coords.latitude, coords.longitude, -18, "rise");

    // Moon rise/set tonight (scan altitude curve)
    const moonCurve = calculateMoonNightVisibility(coords, now);
    let moonrise: Date | null = null;
    let moonset: Date | null = null;
    for (let i = 1; i < moonCurve.length; i++) {
      const prev = moonCurve[i - 1].altitude;
      const cur = moonCurve[i].altitude;
      if (prev <= 0 && cur > 0 && !moonrise) moonrise = moonCurve[i].time;
      if (prev > 0 && cur <= 0 && !moonset) moonset = moonCurve[i].time;
    }

    // Astronomical darkness window
    let darknessHours = 0;
    if (astroDusk && astroDawn) {
      darknessHours = Math.max(0, (astroDawn.getTime() - astroDusk.getTime()) / 3600000);
    }

    // Best target: max time above altitude limit AND outside moon interference,
    // strictly within astronomical night (astro dusk → astro dawn).
    let best: { name: string; objectId: string; usefulHours: number } | null = null;
    const hasAstroNight = !!(astroDusk && astroDawn);
    for (const obj of (hasAstroNight ? activeObjects : [])) {
      const oc = getObjectCoordinates(obj.objectId);
      if (!oc) continue;
      const vis = calculateNightVisibility(oc.ra, oc.dec, coords, now);
      if (!vis || vis.neverRises) continue;
      let pts = 0;
      for (let i = 0; i < vis.data.length; i++) {
        const p = vis.data[i];
        if (p.altitude < altitudeLimit) continue;
        // Strictly restrict to astronomical night window
        if (p.time < astroDusk!) continue;
        if (p.time > astroDawn!) continue;
        const moonPt = moonCurve[i];
        if (moonPt && moonPt.altitude > 0) {
          const moonRD = getMoonCoordinates(p.time);
          const sep = angularSeparation(oc.ra, oc.dec, moonRD.ra, moonRD.dec);
          // Allow if moon is dim or far enough
          if (phase.illumination > 30 && sep < 45) continue;
          if (phase.illumination > 60 && sep < 60) continue;
        }
        pts++;
      }
      const hours = pts * 0.25; // 15-min intervals
      if (hours > 0 && (!best || hours > best.usefulHours)) {
        best = { name: obj.objectName || obj.objectId, objectId: obj.objectId, usefulHours: hours };
      }
    }

    return {
      phase,
      daysToNew,
      daysToFull,
      nextNewMoonDate,
      nextFullMoonDate,
      twilight: {
        sunset,
        nautical,
        astroDusk,
        astroDawn,
        moonrise,
        moonset,
        darknessHours,
      },
      best,
    };
  }, [coords, activeObjects, altitudeLimit]);

  const phaseName = language === "en" ? data.phase.nameEN : data.phase.nameES;
  const isWaxing = data.phase.phase < 0.5;
  const recommendation =
    data.phase.illumination > 40 ? L.narrowband : L.broadband;

  // Weather code → emoji + label
  const wcMap = (code: number, lang: "es" | "en"): { emoji: string; label: string } => {
    const es: Record<number, [string, string]> = {
      0: ["☀️", "Despejado"], 1: ["🌤️", "Mayormente despejado"], 2: ["⛅", "Parcial"], 3: ["☁️", "Nublado"],
      45: ["🌫️", "Niebla"], 48: ["🌫️", "Niebla"],
      51: ["🌦️", "Llovizna"], 53: ["🌦️", "Llovizna"], 55: ["🌧️", "Llovizna fuerte"],
      61: ["🌧️", "Lluvia"], 63: ["🌧️", "Lluvia"], 65: ["🌧️", "Lluvia fuerte"],
      71: ["🌨️", "Nieve"], 73: ["🌨️", "Nieve"], 75: ["❄️", "Nieve fuerte"],
      80: ["🌦️", "Chubascos"], 81: ["🌧️", "Chubascos"], 82: ["⛈️", "Chubascos fuertes"],
      95: ["⛈️", "Tormenta"], 96: ["⛈️", "Tormenta"], 99: ["⛈️", "Tormenta"],
    };
    const en: Record<number, [string, string]> = {
      0: ["☀️", "Clear"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
      45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"],
      51: ["🌦️", "Drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌧️", "Heavy drizzle"],
      61: ["🌧️", "Rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
      71: ["🌨️", "Snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"],
      80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Heavy showers"],
      95: ["⛈️", "Storm"], 96: ["⛈️", "Storm"], 99: ["⛈️", "Storm"],
    };
    const m = lang === "en" ? en : es;
    return { emoji: (m[code]?.[0]) || "🌡️", label: (m[code]?.[1]) || "—" };
  };

  const daily = forecast?.daily;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-4">
      {/* Moon phase */}
      <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/15 border-amber-200/40 dark:border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{L.moonTitle}</span>
        </div>
        <div className="text-3xl mb-1">{data.phase.emoji}</div>
        <div className="font-semibold text-sm">{phaseName}</div>
        <div className="text-xs text-muted-foreground mb-2">
          {data.phase.illumination}% {L.illuminated}
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border/40">
          <div>🌑 {Math.round(data.daysToNew)} {data.daysToNew < 1.5 ? L.day : L.days} {L.toNew}</div>
          <div>🌕 {Math.round(data.daysToFull)} {data.daysToFull < 1.5 ? L.day : L.days} {L.toFull}</div>
        </div>
      </Card>

      {/* Tonight's window */}
      <Card className="p-4 bg-gradient-to-br from-indigo-500/5 to-violet-500/10 dark:from-indigo-500/10 dark:to-violet-500/15 border-indigo-200/40 dark:border-indigo-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Sunset className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{L.windowTitle}</span>
        </div>
        {data.twilight ? (
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{L.nautical}</span>
              <span className="font-mono">{data.twilight.nautical ? fmtTime(data.twilight.nautical, language) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{L.astro}</span>
              <span className="font-mono">{data.twilight.astroDusk ? fmtTime(data.twilight.astroDusk, language) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{L.astroDawn}</span>
              <span className="font-mono">{data.twilight.astroDawn ? fmtTime(data.twilight.astroDawn, language) : "—"}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground">{L.moonrise}</span>
              <span className="font-mono">{data.twilight.moonrise ? fmtTime(data.twilight.moonrise, language) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{L.moonset}</span>
              <span className="font-mono">{data.twilight.moonset ? fmtTime(data.twilight.moonset, language) : "—"}</span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.darkness}</div>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{fmtHM(data.twilight.darknessHours)}</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{L.noCoords}</p>
        )}
      </Card>

      {/* Best target */}
      <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 dark:from-emerald-500/10 dark:to-teal-500/15 border-emerald-200/40 dark:border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{L.bestTitle}</span>
        </div>
        {data.best ? (
          <>
            <div className="text-xl font-bold mb-1 truncate">{data.best.objectId}</div>
            {data.best.name !== data.best.objectId && (
              <div className="text-xs text-muted-foreground truncate mb-2">{data.best.name}</div>
            )}
            <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {fmtHM(data.best.usefulHours)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {L.useful} · {L.aboveAlt} {altitudeLimit}°
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            {L.noTarget} {altitudeLimit}°.
          </p>
        )}
      </Card>

      {/* Next new moon */}
      <Card className="p-4 bg-gradient-to-br from-slate-500/5 to-slate-800/10 dark:from-slate-700/20 dark:to-slate-900/30 border-slate-300/40 dark:border-slate-700/40">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{L.newMoonTitle}</span>
        </div>
        <div className="text-3xl mb-1">🌑</div>
        <div className="font-semibold text-sm">{fmtDate(data.nextNewMoonDate, language)}</div>
        <div className="text-xs text-muted-foreground mb-2">
          {L.inDays} {Math.round(data.daysToNew)} {data.daysToNew < 1.5 ? L.day : L.days}
        </div>
        <div className="text-[11px] pt-2 border-t border-border/40 text-muted-foreground">
          {recommendation}
        </div>
      </Card>

      {/* Forecast (main location) */}
      <Card className="p-4 bg-gradient-to-br from-sky-500/5 to-blue-500/10 dark:from-sky-500/10 dark:to-blue-500/15 border-sky-200/40 dark:border-sky-500/20">
        <div className="flex items-center gap-2 mb-2">
          <CloudSun className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground truncate">
            {L.forecastTitle}{locationName ? ` · ${locationName}` : ""}
          </span>
        </div>
        {daily && Array.isArray(daily.time) && daily.time.length > 0 ? (
          <div className="space-y-1.5">
            {daily.time.slice(0, 3).map((iso: string, i: number) => {
              const code = daily.weathercode?.[i] ?? 0;
              const tmax = Math.round(daily.temperature_2m_max?.[i] ?? 0);
              const tmin = Math.round(daily.temperature_2m_min?.[i] ?? 0);
              const pp = daily.precipitation_probability_max?.[i] ?? 0;
              const { emoji, label } = wcMap(code, language);
              const d = new Date(iso);
              const dayLabel =
                i === 0
                  ? L.today
                  : i === 1
                  ? L.tomorrow
                  : d.toLocaleDateString(language === "en" ? "en-US" : "es-ES", { weekday: "short" });
              return (
                <div key={iso} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none">{emoji}</span>
                    <span className="font-semibold capitalize w-12 shrink-0">{dayLabel}</span>
                    <span className="text-muted-foreground truncate hidden sm:inline">{label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-sky-600 dark:text-sky-400">💧{pp}%</span>
                    <span>
                      <span className="text-rose-500">{tmax}°</span>
                      <span className="text-muted-foreground">/{tmin}°</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{L.noCoords}</p>
        )}
      </Card>
    </div>
  );
}