import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Upload, X, ChevronLeft, ChevronRight, FileText, Thermometer, Wind, Droplets, Gauge, Cloud, Loader2, Trash2 } from "lucide-react";
import { parseFitsHeader, calculateAverages, type FitsMetadata, type FitsAnalysisResult } from "@/components/FitsAnalyzer";
import { calculateMoonPhase, formatMoonPhase } from "@/lib/lunar-phase";

const INPUT_CLS = "border rounded-xl px-3 py-2 bg-white/80 dark:bg-slate-900/60 text-sm md:text-base w-full";

// Group files by observation "night". Files captured in the same night
// (evening -> next dawn) are grouped together. We shift each timestamp back
// by 12 hours and use the resulting calendar day as the night key. That means
// captures from 22:00 on Jan 1 and 04:00 on Jan 2 both map to Jan 1.
function nightKeyFromTimestamp(ts: string | undefined): string | null {
  if (!ts) return null;
  // FITS DATE-OBS is typically ISO like "2024-01-02T04:15:00" – normalize
  const normalized = ts.replace(/\//g, "-").trim();
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    // Fallback: try to extract YYYY-MM-DD only
    const m = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  const shifted = new Date(d.getTime() - 12 * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const mo = String(shifted.getMonth() + 1).padStart(2, "0");
  const da = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function buildGroupInfo(files: FitsMetadata[], nightKey: string) {
  const filters = [...new Set(files.map((f) => f.filter).filter((f): f is string => !!f))];
  const telescopes = [...new Set(files.map((f) => f.telescope).filter((t): t is string => !!t))];
  const cameras = [...new Set(files.map((f) => f.camera).filter((c): c is string => !!c))];
  const exposures = files.map((f) => f.exposure).filter((e): e is number => e !== undefined);
  const exposureMode = exposures.length
    ? exposures.sort(
        (a, b) => exposures.filter((v) => v === b).length - exposures.filter((v) => v === a).length,
      )[0]
    : undefined;
  const dates = [...new Set(files.map((f) => {
    if (!f.timestamp) return null;
    const m = f.timestamp.replace(/\//g, "-").match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }).filter((d): d is string => !!d))].sort();
  return {
    files,
    averages: calculateAverages(files),
    extractedInfo: {
      totalLights: files.length,
      exposure: exposureMode,
      filters,
      dates,
      telescopes,
      cameras,
    },
    nightKey,
  } as FitsAnalysisResult & { nightKey: string };
}

type GroupForm = {
  nightKey: string;
  analysis: FitsAnalysisResult;
  date: string;
  lights: number;
  exposureSec: number;
  filter: string;
  camera: string;
  telescope: string;
  snrR: string;
  snrG: string;
  snrB: string;
  acceptedLights: string;
  rejectedLights: string;
  notes: string;
};

function MetricCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold">
        {value} {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function FSessionBatch({
  onSubmit,
  availableFilters,
  cameras,
  telescopes,
  projectEquipment,
}: {
  onSubmit: (sessions: any[]) => void;
  availableFilters: string[];
  cameras: string[];
  telescopes?: { name: string; focalLength: string }[];
  projectEquipment?: any;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupForm[]>([]);
  const [current, setCurrent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.name.toLowerCase().endsWith(".fits") || f.name.toLowerCase().endsWith(".fit"),
    );
    if (files.length === 0) {
      setError("No se encontraron archivos FITS");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const metadataList: FitsMetadata[] = [];
      for (const file of files) {
        try {
          metadataList.push(await parseFitsHeader(file));
        } catch (e) {
          console.warn(`Error parsing ${file.name}:`, e);
        }
      }
      if (!metadataList.length) {
        setError("No se pudieron extraer metadatos");
        return;
      }
      // Group by night key
      const groupMap = new Map<string, FitsMetadata[]>();
      const unknownBucket: FitsMetadata[] = [];
      for (const meta of metadataList) {
        const key = nightKeyFromTimestamp(meta.timestamp);
        if (!key) {
          unknownBucket.push(meta);
        } else {
          const arr = groupMap.get(key) || [];
          arr.push(meta);
          groupMap.set(key, arr);
        }
      }
      if (unknownBucket.length) {
        const key = "sin-fecha";
        groupMap.set(key, [...(groupMap.get(key) || []), ...unknownBucket]);
      }
      const sortedKeys = [...groupMap.keys()].sort();
      const newGroups: GroupForm[] = sortedKeys.map((k) => {
        const info = buildGroupInfo(groupMap.get(k)!, k);
        const primaryDate = info.extractedInfo?.dates?.[0] || (k !== "sin-fecha" ? k : new Date().toISOString().slice(0, 10));
        return {
          nightKey: k,
          analysis: info,
          date: primaryDate,
          lights: info.extractedInfo?.totalLights || 0,
          exposureSec: info.extractedInfo?.exposure ? Math.round(info.extractedInfo.exposure) : 180,
          filter: info.extractedInfo?.filters?.[0] || availableFilters[0] || "RGB",
          camera: info.extractedInfo?.cameras?.[0] || projectEquipment?.camera || cameras[0] || "",
          telescope: info.extractedInfo?.telescopes?.[0] || projectEquipment?.telescope || telescopes?.[0]?.name || "",
          snrR: "",
          snrG: "",
          snrB: "",
          acceptedLights: "",
          rejectedLights: "",
          notes: "",
        };
      });
      setGroups(newGroups);
      setCurrent(0);
    } catch (e) {
      console.error(e);
      setError("Error al procesar los archivos");
    } finally {
      setIsProcessing(false);
    }
  }, [availableFilters, cameras, telescopes, projectEquipment]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Support directory drops
    const items = e.dataTransfer.items;
    const files: File[] = [];
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fe = entry as FileSystemFileEntry;
        return new Promise((resolve) => fe.file((f) => { files.push(f); resolve(); }));
      }
      if (entry.isDirectory) {
        const de = entry as FileSystemDirectoryEntry;
        const reader = de.createReader();
        return new Promise((resolve) => {
          reader.readEntries(async (entries) => {
            for (const en of entries) await processEntry(en);
            resolve();
          });
        });
      }
    };
    (async () => {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const en = items[i].webkitGetAsEntry();
        if (en) entries.push(en);
      }
      if (entries.length) {
        for (const en of entries) await processEntry(en);
        if (files.length) processFiles(files);
      } else if (e.dataTransfer.files?.length) {
        processFiles(e.dataTransfer.files);
      }
    })();
  };

  const updateGroup = (idx: number, patch: Partial<GroupForm>) => {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const removeGroup = (idx: number) => {
    setGroups((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setCurrent((c) => Math.max(0, Math.min(c, next.length - 1)));
      return next;
    });
  };

  const reset = () => {
    setGroups([]);
    setCurrent(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groups.length) return;
    const sessions = groups.map((g) => {
      const moonPhase = g.date ? calculateMoonPhase(g.date) : null;
      return {
        date: g.date,
        lights: Number(g.lights) || 0,
        exposureSec: Math.max(1, Number(g.exposureSec) || 1),
        filter: g.filter,
        camera: g.camera,
        telescope: g.telescope,
        snrR: g.snrR !== "" ? parseFloat(g.snrR) : undefined,
        snrG: g.snrG !== "" ? parseFloat(g.snrG) : undefined,
        snrB: g.snrB !== "" ? parseFloat(g.snrB) : undefined,
        acceptedLights: g.acceptedLights !== "" ? parseInt(g.acceptedLights) : undefined,
        rejectedLights: g.rejectedLights !== "" ? parseInt(g.rejectedLights) : undefined,
        notes: g.notes,
        moonPhase: moonPhase ? formatMoonPhase(moonPhase) : undefined,
        fitsAnalysis: g.analysis,
      };
    });
    onSubmit(sessions);
  };

  // Dropzone view
  if (!groups.length) {
    return (
      <div className="space-y-3">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".fits,.fit" multiple className="hidden"
            onChange={(e) => e.target.files?.length && processFiles(e.target.files)} />
          <input ref={folderInputRef} type="file"
            // @ts-ignore
            webkitdirectory=""
            className="hidden"
            onChange={(e) => e.target.files?.length && processFiles(e.target.files)} />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Procesando y agrupando por noches…</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Arrastra aquí las fotos FITS de varias sesiones
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                Se agruparán automáticamente por noche (una noche = tarde/noche de un día hasta el amanecer del siguiente)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition">
                  Seleccionar archivos
                </button>
                <button type="button" onClick={() => folderInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  Seleccionar carpeta
                </button>
              </div>
            </>
          )}
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  const g = groups[current];
  const avg = g.analysis.averages;
  const info = g.analysis.extractedInfo!;

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-900 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Sesión {current + 1} de {groups.length}
          </div>
          <div className="text-sm font-semibold">
            Noche del {g.nightKey === "sin-fecha" ? "(sin fecha)" : g.nightKey} · {info.totalLights} fotos
          </div>
        </div>
        <button type="button" onClick={() => setCurrent((c) => Math.min(groups.length - 1, c + 1))}
          disabled={current >= groups.length - 1}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-900 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots */}
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {groups.map((_, i) => (
            <button key={i} type="button" onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-slate-900 dark:bg-slate-100" : "w-2 bg-slate-300 dark:bg-slate-700"}`} />
          ))}
        </div>
      )}

      {/* Metrics from FITS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {avg.mpsas !== undefined && <MetricCard icon={<Gauge className="w-3.5 h-3.5" />} label="MPSAS" value={avg.mpsas.toFixed(2)} unit="mag/arcsec²" />}
        {avg.cloudCover !== undefined && <MetricCard icon={<Cloud className="w-3.5 h-3.5" />} label="Nubes" value={avg.cloudCover.toFixed(1)} unit="%" />}
        {avg.ambientTemp !== undefined && <MetricCard icon={<Thermometer className="w-3.5 h-3.5" />} label="Temp. ambiente" value={avg.ambientTemp.toFixed(1)} unit="°C" />}
        {avg.skyTemp !== undefined && <MetricCard icon={<Thermometer className="w-3.5 h-3.5" />} label="Temp. cielo" value={avg.skyTemp.toFixed(1)} unit="°C" />}
        {avg.humidity !== undefined && <MetricCard icon={<Droplets className="w-3.5 h-3.5" />} label="Humedad" value={avg.humidity.toFixed(1)} unit="%" />}
        {avg.dewPoint !== undefined && <MetricCard icon={<Droplets className="w-3.5 h-3.5" />} label="Punto rocío" value={avg.dewPoint.toFixed(1)} unit="°C" />}
        {avg.pressure !== undefined && <MetricCard icon={<Gauge className="w-3.5 h-3.5" />} label="Presión" value={avg.pressure.toFixed(0)} unit="hPa" />}
        {avg.wind !== undefined && <MetricCard icon={<Wind className="w-3.5 h-3.5" />} label="Viento" value={avg.wind.toFixed(1)} unit="m/s" />}
        {avg.windGust !== undefined && <MetricCard icon={<Wind className="w-3.5 h-3.5" />} label="Racha" value={avg.windGust.toFixed(1)} unit="m/s" />}
        {avg.ccdTemp !== undefined && <MetricCard icon={<Thermometer className="w-3.5 h-3.5" />} label="Temp. sensor" value={avg.ccdTemp.toFixed(1)} unit="°C" />}
      </div>

      {/* Editable fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Fecha</span>
          <input type="date" value={g.date} onChange={(e) => updateGroup(current, { date: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Filtro</span>
          <select value={g.filter} onChange={(e) => updateGroup(current, { filter: e.target.value })} className={INPUT_CLS}>
            {[...new Set([g.filter, ...(info.filters || []), ...availableFilters].filter(Boolean))].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Lights</span>
          <input type="number" min={0} value={g.lights} onChange={(e) => updateGroup(current, { lights: parseInt(e.target.value || "0", 10) })} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Exposición por light (s)</span>
          <input type="number" min={1} value={g.exposureSec} onChange={(e) => updateGroup(current, { exposureSec: parseInt(e.target.value || "0", 10) })} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Cámara</span>
          <select value={g.camera} onChange={(e) => updateGroup(current, { camera: e.target.value })} className={INPUT_CLS}>
            <option value="">Selecciona una cámara</option>
            {[...new Set([g.camera, ...cameras].filter((c) => c && c.trim()))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Telescopio</span>
          <select value={g.telescope} onChange={(e) => updateGroup(current, { telescope: e.target.value })} className={INPUT_CLS}>
            <option value="">Selecciona un telescopio</option>
            {[...new Set([g.telescope, ...((telescopes || []).map((t) => t.name))].filter((t) => t && t.trim()))].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">SNR R</span>
          <input value={g.snrR} onChange={(e) => updateGroup(current, { snrR: e.target.value })} className={INPUT_CLS} placeholder="opcional" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">SNR G</span>
          <input value={g.snrG} onChange={(e) => updateGroup(current, { snrG: e.target.value })} className={INPUT_CLS} placeholder="opcional" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">SNR B</span>
          <input value={g.snrB} onChange={(e) => updateGroup(current, { snrB: e.target.value })} className={INPUT_CLS} placeholder="opcional" />
        </label>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-400">Lights rechazados</span>
          <input value={g.rejectedLights} onChange={(e) => updateGroup(current, { rejectedLights: e.target.value })} className={INPUT_CLS} placeholder="opcional" />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">Notas</span>
        <textarea value={g.notes} onChange={(e) => updateGroup(current, { notes: e.target.value })} className={INPUT_CLS} rows={2} />
      </label>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => removeGroup(current)}
          className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
          <Trash2 className="w-4 h-4" /> Descartar esta sesión
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
            Volver a cargar
          </button>
          <button type="submit"
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition">
            Crear {groups.length} {groups.length === 1 ? "sesión" : "sesiones"}
          </button>
        </div>
      </div>
    </form>
  );
}
