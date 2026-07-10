import React, { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Target } from "lucide-react";

// ---------- Types ----------
export interface PHD2Frame {
  t: number;          // ms
  ra: number;         // arcsec
  dec: number;        // arcsec
  total: number;
}

export interface PHD2Group {
  id: string;
  objectName?: string;
  ra: string;
  dec: string;
  raDeg: number;
  decDeg: number;
  altitude?: number;
  azimuth?: number;
  pixelScale: number;
  focalLength?: number;
  blockCount: number;
  frameCount: number;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  raRms: number;
  decRms: number;
  totalRms: number;
  meanError: number;
  minError: number;
  maxError: number;
  medianRms: number;
  p68Rms: number;
  frames: PHD2Frame[];
  blocks: { startTime: number; endTime: number; frames: number }[];
}

export interface PHD2DataPoint {
  time: number;
  dx: number;
  dy: number;
  rmsTotal: number;
}

export interface PHD2AnalysisResult {
  dataPoints: PHD2DataPoint[];
  medianRms: number;
  p68Rms: number;
  minRms: number;
  maxRms: number;
  totalDuration: number;
  blockCount: number;
  groups: PHD2Group[];
}

interface PHD2AnalyzerProps {
  value?: PHD2AnalysisResult | null;
  onChange: (result: PHD2AnalysisResult | null) => void;
}

// ---------- Parsing ----------
interface RawBlock {
  startTime: number;
  raDeg: number;
  decDeg: number;
  raText: string;
  decText: string;
  altitude?: number;
  azimuth?: number;
  pixelScale: number;
  focalLength?: number;
  objectName?: string;
  columns: Record<string, number>;
  rows: { time: number; raRaw: number; decRaw: number }[];
}

const DEFAULT_PIXEL_SCALE = 1.0;

function parseHmsToDeg(s: string): number | null {
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*[h:]\s*(\d+(?:\.\d+)?)\s*[m':]\s*(\d+(?:\.\d+)?)/i);
  if (!m) {
    const dec = parseFloat(s);
    return isFinite(dec) ? dec * 15 : null;
  }
  const h = parseFloat(m[1]);
  const min = parseFloat(m[2]);
  const sec = parseFloat(m[3]);
  return (Math.abs(h) + min / 60 + sec / 3600) * 15 * (h < 0 ? -1 : 1);
}

function parseDmsToDeg(s: string): number | null {
  const m = s.match(/([+-]?\d+(?:\.\d+)?)\s*[d°:]\s*(\d+(?:\.\d+)?)\s*[m':]\s*(\d+(?:\.\d+)?)/i);
  if (!m) {
    const dec = parseFloat(s);
    return isFinite(dec) ? dec : null;
  }
  const d = parseFloat(m[1]);
  const min = parseFloat(m[2]);
  const sec = parseFloat(m[3]);
  const sign = m[1].trim().startsWith("-") ? -1 : 1;
  return sign * (Math.abs(d) + min / 60 + sec / 3600);
}

function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const p1 = toRad(dec1);
  const p2 = toRad(dec2);
  const dra = toRad(ra1 - ra2);
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dra);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

function parseGuideLog(content: string): RawBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  let inData = false;

  let ctxPixelScale = DEFAULT_PIXEL_SCALE;
  let ctxFocalLength: number | undefined;
  let ctxRaText = "";
  let ctxDecText = "";
  let ctxRaDeg = NaN;
  let ctxDecDeg = NaN;
  let ctxAlt: number | undefined;
  let ctxAz: number | undefined;
  let ctxObject: string | undefined;

  const closeBlock = () => {
    if (current) blocks.push(current);
    current = null;
    inData = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const psMatch = line.match(/Pixel\s*scale\s*=\s*([\d.]+)\s*arc-?sec/i);
    if (psMatch) ctxPixelScale = parseFloat(psMatch[1]) || DEFAULT_PIXEL_SCALE;
    const flMatch = line.match(/Focal\s*length\s*=\s*([\d.]+)\s*mm/i);
    if (flMatch) ctxFocalLength = parseFloat(flMatch[1]);

    const raMatch = line.match(/(?:^|[,\s])RA\s*=\s*([^,]+?)(?:,|$)/i);
    const decMatch = line.match(/[,\s]Dec\s*=\s*([^,]+?)(?:,|$)/i);
    if (raMatch) {
      ctxRaText = raMatch[1].trim();
      const deg = parseHmsToDeg(ctxRaText);
      if (deg !== null) ctxRaDeg = deg;
    }
    if (decMatch) {
      ctxDecText = decMatch[1].trim();
      const deg = parseDmsToDeg(ctxDecText);
      if (deg !== null) ctxDecDeg = deg;
    }
    const altMatch = line.match(/[,\s]Alt\s*=\s*([-+]?[\d.]+)/i);
    if (altMatch) ctxAlt = parseFloat(altMatch[1]);
    const azMatch = line.match(/[,\s]Az\s*=\s*([-+]?[\d.]+)/i);
    if (azMatch) ctxAz = parseFloat(azMatch[1]);
    const objMatch = line.match(/(?:Object|Target)\s*[=:]\s*["']?([^"'\n,]+?)["']?(?:,|$)/i);
    if (objMatch) ctxObject = objMatch[1].trim();

    const beginMatch = line.match(/Guiding\s+Begins?\s+at\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/i);
    if (beginMatch) {
      closeBlock();
      const iso = beginMatch[1] + "T" + beginMatch[2];
      const startTime = new Date(iso).getTime();
      current = {
        startTime,
        raDeg: ctxRaDeg,
        decDeg: ctxDecDeg,
        raText: ctxRaText,
        decText: ctxDecText,
        altitude: ctxAlt,
        azimuth: ctxAz,
        pixelScale: ctxPixelScale,
        focalLength: ctxFocalLength,
        objectName: ctxObject,
        columns: {},
        rows: [],
      };
      inData = false;
      continue;
    }

    if (/Guiding\s+Ends?/i.test(line) || /Guiding\s+Stopped/i.test(line)) {
      closeBlock();
      continue;
    }

    if (!current) continue;

    if (/^Frame\s*[,\t]/i.test(line)) {
      const headers = line.split(/[,\t]/).map(h => h.trim());
      current.columns = {};
      headers.forEach((h, i) => { current!.columns[h] = i; });
      inData = true;
      continue;
    }

    if (inData && /^\d/.test(line)) {
      const parts = line.split(/[,\t]/).map(s => s.trim());
      const cols = current.columns;
      const timeIdx = cols["Time"] ?? 1;
      const raIdx = cols["RARawDistance"] ?? cols["dx"] ?? 3;
      const decIdx = cols["DECRawDistance"] ?? cols["dy"] ?? 4;
      const time = parseFloat(parts[timeIdx]);
      const raRaw = parseFloat(parts[raIdx]);
      const decRaw = parseFloat(parts[decIdx]);
      if (isFinite(time) && isFinite(raRaw) && isFinite(decRaw)) {
        current.rows.push({ time, raRaw, decRaw });
      }
    }
  }
  closeBlock();
  return blocks.filter(b => b.rows.length > 0);
}

function groupBlocks(blocks: RawBlock[]): RawBlock[][] {
  const groups: RawBlock[][] = [];
  for (const b of blocks) {
    let placed = false;
    for (const g of groups) {
      const ref = g[0];
      if (!isFinite(b.raDeg) || !isFinite(ref.raDeg)) continue;
      if (angularSeparation(b.raDeg, b.decDeg, ref.raDeg, ref.decDeg) <= 1.0) {
        g.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([b]);
  }
  return groups;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function computeGroup(blocks: RawBlock[], id: string): PHD2Group {
  const frames: PHD2Frame[] = [];
  const blockMeta: PHD2Group["blocks"] = [];
  let totalSeconds = 0;

  for (const b of blocks) {
    const scale = b.pixelScale || DEFAULT_PIXEL_SCALE;
    let bEnd = b.startTime;
    for (const row of b.rows) {
      const t = b.startTime + row.time * 1000;
      const ra = row.raRaw * scale;
      const dec = row.decRaw * scale;
      frames.push({ t, ra, dec, total: Math.sqrt(ra * ra + dec * dec) });
      if (t > bEnd) bEnd = t;
    }
    blockMeta.push({ startTime: b.startTime, endTime: bEnd, frames: b.rows.length });
    totalSeconds += (bEnd - b.startTime) / 1000;
  }
  frames.sort((a, b) => a.t - b.t);

  const n = frames.length || 1;
  const raRms = Math.sqrt(frames.reduce((a, f) => a + f.ra * f.ra, 0) / n);
  const decRms = Math.sqrt(frames.reduce((a, f) => a + f.dec * f.dec, 0) / n);
  const totalRms = Math.sqrt(raRms * raRms + decRms * decRms);
  const totals = frames.map(f => f.total);
  const sorted = [...totals].sort((a, b) => a - b);
  const meanError = totals.reduce((a, b) => a + b, 0) / n;
  const minError = sorted[0] ?? 0;
  const maxError = sorted[sorted.length - 1] ?? 0;

  const ref = blocks[0];
  return {
    id,
    objectName: ref.objectName,
    ra: ref.raText,
    dec: ref.decText,
    raDeg: ref.raDeg,
    decDeg: ref.decDeg,
    altitude: ref.altitude,
    azimuth: ref.azimuth,
    pixelScale: ref.pixelScale,
    focalLength: ref.focalLength,
    blockCount: blocks.length,
    frameCount: frames.length,
    startTime: frames[0]?.t ?? ref.startTime,
    endTime: frames[frames.length - 1]?.t ?? ref.startTime,
    durationSeconds: totalSeconds,
    raRms, decRms, totalRms, meanError, minError, maxError,
    medianRms: percentile(sorted, 50),
    p68Rms: percentile(sorted, 68),
    frames,
    blocks: blockMeta,
  };
}

function buildResult(groups: PHD2Group[]): PHD2AnalysisResult {
  const allFrames = groups.flatMap(g => g.frames);
  const dataPoints: PHD2DataPoint[] = allFrames.map((f, i) => ({
    time: i, dx: f.ra, dy: f.dec, rmsTotal: f.total,
  }));
  const totals = allFrames.map(f => f.total).sort((a, b) => a - b);
  return {
    dataPoints,
    medianRms: percentile(totals, 50),
    p68Rms: percentile(totals, 68),
    minRms: totals[0] ?? 0,
    maxRms: totals[totals.length - 1] ?? 0,
    totalDuration: groups.reduce((a, g) => a + g.durationSeconds, 0),
    blockCount: groups.reduce((a, g) => a + g.blockCount, 0),
    groups,
  };
}

interface DetectedTarget {
  id: string;
  blocks: RawBlock[];
  raDeg: number;
  decDeg: number;
  raText: string;
  decText: string;
  objectName?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  minSeparation: number;
}

function fmtCoords(raDeg: number, decDeg: number): string {
  if (!isFinite(raDeg) || !isFinite(decDeg)) return "—";
  const raH = raDeg / 15;
  const rh = Math.floor(raH);
  const rmF = (raH - rh) * 60;
  const rm = Math.floor(rmF);
  const rs = ((rmF - rm) * 60).toFixed(1);
  const sign = decDeg < 0 ? "-" : "+";
  const ad = Math.abs(decDeg);
  const dd = Math.floor(ad);
  const dmF = (ad - dd) * 60;
  const dm = Math.floor(dmF);
  const ds = ((dmF - dm) * 60).toFixed(0);
  return `${rh}h ${rm}m ${rs}s / ${sign}${dd}° ${dm}' ${ds}"`;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtTime(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-ES", { hour12: false });
}

export default function PHD2Analyzer({ value, onChange }: PHD2AnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<DetectedTarget[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setTargets(null);
    try {
      const content = await file.text();
      const blocks = parseGuideLog(content);
      if (!blocks.length) {
        setError("No se encontraron bloques de guiado válidos en el archivo");
        return;
      }
      const grouped = groupBlocks(blocks);
      const detected: DetectedTarget[] = grouped.map((g, i) => {
        const startTime = g[0].startTime;
        const endTime = Math.max(...g.map(b => b.startTime + (b.rows[b.rows.length - 1]?.time || 0) * 1000));
        const durationSeconds = g.reduce(
          (a, b) => a + ((b.rows[b.rows.length - 1]?.time || 0) - (b.rows[0]?.time || 0)),
          0
        );
        return {
          id: `target-${i}`,
          blocks: g,
          raDeg: g[0].raDeg,
          decDeg: g[0].decDeg,
          raText: g[0].raText,
          decText: g[0].decText,
          objectName: g[0].objectName,
          startTime, endTime, durationSeconds,
          minSeparation: Infinity,
        };
      });
      detected.forEach((t, i) => {
        let minSep = Infinity;
        detected.forEach((o, j) => {
          if (i === j) return;
          const sep = angularSeparation(t.raDeg, t.decDeg, o.raDeg, o.decDeg);
          if (sep < minSep) minSep = sep;
        });
        t.minSeparation = minSep;
      });

      if (detected.length === 1) {
        onChange(buildResult([computeGroup(detected[0].blocks, detected[0].id)]));
      } else {
        setTargets(detected);
        setSelectedId(detected[0].id);
      }
    } catch (e) {
      console.error(e);
      setError("Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleAnalyzeSelected = useCallback(() => {
    if (!targets) return;
    const t = targets.find(x => x.id === selectedId);
    if (!t) return;
    onChange(buildResult([computeGroup(t.blocks, t.id)]));
    setTargets(null);
  }, [targets, selectedId, onChange]);

  const handleAnalyzeAll = useCallback(() => {
    if (!targets) return;
    onChange(buildResult(targets.map(t => computeGroup(t.blocks, t.id))));
    setTargets(null);
  }, [targets, onChange]);

  const handleCancel = useCallback(() => {
    setTargets(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClear = useCallback(() => {
    onChange(null);
    setTargets(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const f = files.find(x =>
      x.name.toLowerCase().endsWith(".txt") ||
      x.name.toLowerCase().includes("guidelog") ||
      x.name.toLowerCase().includes("debuglog")
    );
    if (f) processFile(f);
    else setError("Por favor, selecciona un archivo PHD2 GuideLog/DebugLog (.txt)");
  }, [processFile]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Target className="w-4 h-4" />
        <span>Analizador PHD2 GuideLog / DebugLog</span>
      </div>

      {targets && !value && (
        <div className="space-y-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Se han detectado varios objetivos de guiado</strong>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              Este archivo PHD2 contiene sesiones de guiado realizadas en diferentes coordenadas del cielo.
              Selecciona qué objetivo quieres analizar.
            </p>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {targets.map((t, i) => (
              <label
                key={t.id}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  selectedId === t.id
                    ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="phd2-target"
                  className="mt-1"
                  checked={selectedId === t.id}
                  onChange={() => setSelectedId(t.id)}
                />
                <div className="flex-1 text-xs space-y-0.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Objetivo {i + 1}{t.objectName ? ` — ${t.objectName}` : ""}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{fmtCoords(t.raDeg, t.decDeg)}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {t.blocks.length} tramo{t.blocks.length !== 1 ? "s" : ""} · {fmtDuration(t.durationSeconds)}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {fmtTime(t.startTime)} → {fmtTime(t.endTime)}
                  </div>
                  {isFinite(t.minSeparation) && (
                    <div className="text-slate-500 dark:text-slate-400">
                      Separación mínima: {t.minSeparation.toFixed(2)}°
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAnalyzeSelected}
              className="flex-1 min-w-[10rem] px-4 py-2 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition"
            >
              Analizar objetivo seleccionado
            </button>
            <button
              type="button"
              onClick={handleAnalyzeAll}
              className="flex-1 min-w-[10rem] px-4 py-2 text-sm rounded-lg border border-slate-900 dark:border-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Analizar todos por separado
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!value && !targets && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            className="hidden"
          />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Procesando archivo...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Arrastra un archivo PHD2 GuideLog o DebugLog aquí, o
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition"
              >
                Seleccionar archivo
              </button>
            </>
          )}
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}

      {value && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">
                {value.groups?.length || 1} objetivo{(value.groups?.length || 1) !== 1 ? "s" : ""} · {value.blockCount} tramo{value.blockCount !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Eliminar análisis"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {(value.groups || []).map((g, i) => (
            <div key={g.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
              <div className="text-sm font-semibold text-foreground">
                {g.objectName || `Objetivo ${i + 1}`}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{fmtCoords(g.raDeg, g.decDeg)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Metric label="RMS RA" value={`${g.raRms.toFixed(2)}"`} />
                <Metric label="RMS DEC" value={`${g.decRms.toFixed(2)}"`} />
                <Metric label="RMS Total" value={`${g.totalRms.toFixed(2)}"`} />
                <Metric label="Error medio" value={`${g.meanError.toFixed(2)}"`} />
                <Metric label="Error mín" value={`${g.minError.toFixed(2)}"`} />
                <Metric label="Error máx" value={`${g.maxError.toFixed(2)}"`} />
                <Metric label="Frames" value={`${g.frameCount}`} />
                <Metric label="Tramos" value={`${g.blockCount}`} />
              </div>
              <div className="text-xs text-muted-foreground">
                {fmtTime(g.startTime)} → {fmtTime(g.endTime)} · {fmtDuration(g.durationSeconds)} guiando
                {g.pixelScale ? ` · ${g.pixelScale.toFixed(2)}"/px` : ""}
                {g.focalLength ? ` · ${g.focalLength}mm` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 border border-border">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
