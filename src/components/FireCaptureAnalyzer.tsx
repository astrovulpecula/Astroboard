import React, { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Video } from "lucide-react";

export interface FireCaptureFile {
  sourceFile: string;
  camera?: string;
  filter?: string;
  profile?: string;
  filename?: string;
  date?: string;       // YYYY-MM-DD
  startUT?: string;    // HH:MM:SS
  midUT?: string;
  endUT?: string;
  duration?: number;   // seconds
  frames?: number;
  fps?: number;
  fileType?: string;
  binning?: string;
  roi?: string;
  shutterMs?: number;
  gain?: string;
  gamma?: number;
  histogramPct?: number;
  sensorTempC?: number;
}

export interface FireCaptureAnalysisResult {
  files: FireCaptureFile[];
  totals: {
    frames: number;
    durationSec: number;
  };
  extractedInfo: {
    camera?: string;
    filter?: string;
    profile?: string;
    dates: string[];
  };
}

interface Props {
  value?: FireCaptureAnalysisResult | null;
  onChange: (result: FireCaptureAnalysisResult | null) => void;
}

// Reformat Date based on Date_format, e.g. ddMMyy -> YYYY-MM-DD
function reformatDate(raw: string, format?: string): string | undefined {
  if (!raw) return undefined;
  const fmt = (format || "ddMMyy").toLowerCase();
  const digits = raw.replace(/\D/g, "");
  let dd = "", mm = "", yy = "";
  if (fmt === "ddmmyy" && digits.length === 6) {
    dd = digits.slice(0, 2); mm = digits.slice(2, 4); yy = digits.slice(4, 6);
  } else if (fmt === "ddmmyyyy" && digits.length === 8) {
    dd = digits.slice(0, 2); mm = digits.slice(2, 4); yy = digits.slice(4, 8);
  } else if (fmt === "yyyymmdd" && digits.length === 8) {
    yy = digits.slice(0, 4); mm = digits.slice(4, 6); dd = digits.slice(6, 8);
  } else if (digits.length === 6) {
    dd = digits.slice(0, 2); mm = digits.slice(2, 4); yy = digits.slice(4, 6);
  } else {
    return undefined;
  }
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm}-${dd}`;
}

function formatHHMMSS(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d{2})(\d{2})(\d{2})/);
  if (!m) return raw;
  return `${m[1]}:${m[2]}:${m[3]}`;
}

function parseFireCaptureText(text: string, sourceFile: string): FireCaptureFile {
  const map: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) map[key] = val;
  }

  const num = (s?: string) => {
    if (!s) return undefined;
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? undefined : n;
  };

  const out: FireCaptureFile = { sourceFile };
  out.camera = map["Camera"];
  out.filter = map["Filter"];
  out.profile = map["Profile"];
  out.filename = map["Filename"];
  out.date = reformatDate(map["Date(UT)"] || map["Date"], map["Date_format"]);
  out.startUT = formatHHMMSS(map["Start(UT)"]);
  out.midUT = formatHHMMSS(map["Mid(UT)"]);
  out.endUT = formatHHMMSS(map["End(UT)"]);
  const durStr = (map["Duration"] || "").replace(/s$/i, "");
  out.duration = num(durStr);
  out.frames = map["Frames captured"] ? parseInt(map["Frames captured"], 10) : undefined;
  out.fps = num(map["FPS (avg.)"]);
  out.fileType = map["File type"];
  out.binning = map["Binning"];
  out.roi = map["ROI"];
  const shutter = map["Shutter"];
  if (shutter) {
    const m = shutter.match(/([\d.,]+)\s*ms/i);
    out.shutterMs = m ? num(m[1]) : num(shutter);
  }
  out.gain = map["Gain"];
  out.gamma = num(map["Gamma"]);
  const hist = map["Histogramm"];
  if (hist) {
    const m = hist.match(/([\d.,]+)\s*%/);
    out.histogramPct = m ? num(m[1]) : num(hist);
  }
  const temp = map["Sensor temperature"];
  if (temp) {
    const m = temp.match(/([-\d.,]+)/);
    out.sensorTempC = m ? num(m[1]) : undefined;
  }
  return out;
}

export default function FireCaptureAnalyzer({ value, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".txt"));
      if (files.length === 0) {
        setError("No se encontraron archivos .txt");
        return;
      }
      setError(null);
      const parsed: FireCaptureFile[] = [];
      for (const file of files) {
        try {
          const text = await file.text();
          if (!/FireCapture/i.test(text) && !/Frames captured=/i.test(text)) {
            // skip non-FireCapture txt
            continue;
          }
          parsed.push(parseFireCaptureText(text, file.name));
        } catch (e) {
          console.warn("Error parsing", file.name, e);
        }
      }
      if (parsed.length === 0) {
        setError("Ningún archivo parece ser un log de FireCapture");
        return;
      }
      const totals = parsed.reduce(
        (acc, f) => ({
          frames: acc.frames + (f.frames || 0),
          durationSec: acc.durationSec + (f.duration || 0),
        }),
        { frames: 0, durationSec: 0 },
      );
      const dates = [...new Set(parsed.map((f) => f.date).filter((d): d is string => !!d))].sort();
      onChange({
        files: parsed,
        totals,
        extractedInfo: {
          camera: parsed[0].camera,
          filter: parsed[0].filter,
          profile: parsed[0].profile,
          dates,
        },
      });
    },
    [onChange],
  );

  const handleClear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Video className="w-4 h-4" />
        <span>Analizador FireCapture (.txt)</span>
      </div>

      {!value ? (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt"
            multiple
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Arrastra el .txt de FireCapture aquí o haz clic para seleccionar
          </p>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="font-medium">
                {value.files.length} log{value.files.length !== 1 ? "s" : ""} ·{" "}
                {value.totals.frames} frames · {value.totals.durationSec.toFixed(1)}s
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Eliminar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            La metadata se mostrará en el detalle de la sesión al guardarla.
          </p>
        </div>
      )}
    </div>
  );
}
