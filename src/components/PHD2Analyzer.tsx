import React, { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Target } from "lucide-react";

// PHD2 GuideLog data point interface
export interface PHD2DataPoint {
  time: number;           // Time in seconds (continuous across blocks)
  dx: number;             // RA error in arcseconds
  dy: number;             // DEC error in arcseconds
  rmsTotal: number;       // RMS Total = sqrt(rmsRA² + rmsDEC²)
}

// PHD2 Analysis Result interface
export interface PHD2AnalysisResult {
  dataPoints: PHD2DataPoint[];
  averageRms: number;
  minRms: number;
  maxRms: number;
  totalDuration: number;  // Total duration in seconds
  blockCount: number;     // Number of guiding blocks found
}

interface PHD2AnalyzerProps {
  value?: PHD2AnalysisResult | null;
  onChange: (result: PHD2AnalysisResult | null) => void;
}

// Scale factor: pixels to arcseconds
const PIXEL_SCALE = 12.89;

// Rolling window size for RMS calculation
const RMS_WINDOW_SIZE = 10;

// Parse PHD2 GuideLog file
function parseGuideLog(content: string): PHD2AnalysisResult | null {
  const lines = content.split('\n');
  const allDataPoints: PHD2DataPoint[] = [];
  let blockCount = 0;
  let inGuidingBlock = false;
  let blockData: { time: number; dx: number; dy: number }[] = [];
  let timeOffset = 0;
  let lastBlockEndTime = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of guiding block
    if (trimmed.includes('Guiding Begins')) {
      inGuidingBlock = true;
      blockData = [];
      blockCount++;
      continue;
    }

    // Detect end of guiding block
    if (trimmed.includes('Guiding Ends')) {
      if (inGuidingBlock && blockData.length > 0) {
        // Process block and add to all data points
        const processed = processBlock(blockData, timeOffset);
        allDataPoints.push(...processed);
        
        // Update time offset for next block
        if (processed.length > 0) {
          lastBlockEndTime = processed[processed.length - 1].time;
          timeOffset = lastBlockEndTime + 1; // Add 1 second gap between blocks
        }
      }
      inGuidingBlock = false;
      continue;
    }

    // Parse data line if we're in a guiding block
    if (inGuidingBlock) {
      const dataMatch = parseDataLine(trimmed);
      if (dataMatch) {
        blockData.push(dataMatch);
      }
    }
  }

  // Handle case where file ends without "Guiding Ends"
  if (inGuidingBlock && blockData.length > 0) {
    const processed = processBlock(blockData, timeOffset);
    allDataPoints.push(...processed);
  }

  if (allDataPoints.length === 0) {
    return null;
  }

  // Calculate statistics
  const rmsValues = allDataPoints.map(p => p.rmsTotal);
  const averageRms = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
  const minRms = Math.min(...rmsValues);
  const maxRms = Math.max(...rmsValues);
  const totalDuration = allDataPoints.length > 0 ? 
    allDataPoints[allDataPoints.length - 1].time - allDataPoints[0].time : 0;

  return {
    dataPoints: allDataPoints,
    averageRms,
    minRms,
    maxRms,
    totalDuration,
    blockCount,
  };
}

// Parse a single data line from PHD2 log
function parseDataLine(line: string): { time: number; dx: number; dy: number } | null {
  // PHD2 GuideLog format typically has columns separated by commas or tabs
  // Common format: Frame, Time, mount, dx, dy, RARawDistance, DECRawDistance, ...
  // We need: Time (column 1), dx (column 3), dy (column 4)
  
  // Skip header lines or non-data lines
  if (line.startsWith('#') || line.startsWith('Frame') || !line.match(/^\d/)) {
    return null;
  }

  // Try comma-separated first, then tab-separated
  let parts = line.split(',').map(s => s.trim());
  if (parts.length < 5) {
    parts = line.split('\t').map(s => s.trim());
  }

  if (parts.length < 5) {
    return null;
  }

  // Parts: Frame[0], Time[1], mount[2], dx[3], dy[4], ...
  const time = parseFloat(parts[1]);
  const dx = parseFloat(parts[3]);
  const dy = parseFloat(parts[4]);

  if (isNaN(time) || isNaN(dx) || isNaN(dy)) {
    return null;
  }

  return { time, dx, dy };
}

// Process a block of data points with rolling window RMS
function processBlock(
  blockData: { time: number; dx: number; dy: number }[], 
  timeOffset: number
): PHD2DataPoint[] {
  const result: PHD2DataPoint[] = [];

  for (let i = 0; i < blockData.length; i++) {
    const point = blockData[i];
    
    // Calculate rolling window RMS
    const windowStart = Math.max(0, i - RMS_WINDOW_SIZE + 1);
    const windowData = blockData.slice(windowStart, i + 1);

    // Convert pixels to arcseconds
    const dxArcsec = windowData.map(p => p.dx * PIXEL_SCALE);
    const dyArcsec = windowData.map(p => p.dy * PIXEL_SCALE);

    // Calculate RMS for RA and DEC
    const rmsRA = Math.sqrt(dxArcsec.reduce((sum, v) => sum + v * v, 0) / dxArcsec.length);
    const rmsDEC = Math.sqrt(dyArcsec.reduce((sum, v) => sum + v * v, 0) / dyArcsec.length);

    // Calculate RMS Total = sqrt(rmsRA² + rmsDEC²)
    const rmsTotal = Math.sqrt(rmsRA * rmsRA + rmsDEC * rmsDEC);

    result.push({
      time: point.time + timeOffset,
      dx: point.dx * PIXEL_SCALE,
      dy: point.dy * PIXEL_SCALE,
      rmsTotal,
    });
  }

  return result;
}

const INPUT_CLS = "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100";

export default function PHD2Analyzer({ value, onChange }: PHD2AnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const content = await file.text();
      const result = parseGuideLog(content);

      if (!result) {
        setError("No se encontraron bloques de guiado válidos en el archivo");
        return;
      }

      onChange(result);
    } catch (e) {
      setError("Error al procesar el archivo");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const logFile = files.find(f => 
      f.name.toLowerCase().endsWith('.txt') || 
      f.name.toLowerCase().includes('guidelog')
    );

    if (logFile) {
      processFile(logFile);
    } else {
      setError("Por favor, selecciona un archivo PHD2 GuideLog (.txt)");
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const handleClear = useCallback(() => {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Target className="w-4 h-4" />
        <span>Analizador PHD2 GuideLog</span>
      </div>

      {!value ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
            ${isDragging
              ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
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
                Arrastra un archivo PHD2 GuideLog aquí o
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

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">
                {value.blockCount} bloque{value.blockCount !== 1 ? 's' : ''} de guiado analizados
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

          {/* Statistics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard 
              icon={<Target className="w-4 h-4" />} 
              label="RMS Medio" 
              value={value.averageRms.toFixed(2)} 
              unit="arcsec" 
            />
            <MetricCard 
              icon={<Target className="w-4 h-4" />} 
              label="RMS Mín" 
              value={value.minRms.toFixed(2)} 
              unit="arcsec" 
            />
            <MetricCard 
              icon={<Target className="w-4 h-4" />} 
              label="RMS Máx" 
              value={value.maxRms.toFixed(2)} 
              unit="arcsec" 
            />
            <MetricCard 
              icon={<Target className="w-4 h-4" />} 
              label="Puntos" 
              value={value.dataPoints.length.toString()} 
              unit="" 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</div>
        <div className="text-sm font-semibold">
          {value} {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
