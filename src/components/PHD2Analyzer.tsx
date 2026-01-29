import React, { useState, useCallback, useRef, useMemo } from "react";
import { Upload, X, FileText, Target, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  medianRms: number;      // P50 - typical guiding
  p68Rms: number;         // P68 (≈1σ) - stability metric
  minRms: number;
  maxRms: number;
  totalDuration: number;  // Total duration in seconds
  blockCount: number;     // Number of guiding blocks found
}

// Coordinate group for selection
interface CoordinateGroup {
  id: string;
  ra: string;
  dec: string;
  objectName?: string;
  blocks: GuidingBlock[];
  displayLabel: string;
}

// Individual guiding block with metadata
interface GuidingBlock {
  coordinateId: string;
  data: { time: number; dx: number; dy: number }[];
  startTime: number;
}

// Parsed file structure before coordinate selection
interface ParsedGuideLog {
  coordinateGroups: CoordinateGroup[];
  hasMultipleCoordinates: boolean;
}

interface PHD2AnalyzerProps {
  value?: PHD2AnalysisResult | null;
  onChange: (result: PHD2AnalysisResult | null) => void;
}

// Scale factor: pixels to arcseconds
const PIXEL_SCALE = 12.89;

// Rolling window size for RMS calculation
const RMS_WINDOW_SIZE = 10;

// Parse PHD2 GuideLog file and extract coordinate groups
function parseGuideLogStructure(content: string): ParsedGuideLog {
  const lines = content.split('\n');
  const coordinateGroups: Map<string, CoordinateGroup> = new Map();
  const blocks: GuidingBlock[] = [];
  
  let inGuidingBlock = false;
  let currentBlockData: { time: number; dx: number; dy: number }[] = [];
  let currentCoordinateId = "default";
  let currentRa = "";
  let currentDec = "";
  let currentObjectName = "";
  let blockStartTime = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect coordinate changes - look for patterns like "RA/Dec = ..." or "RADEC" lines
    // Also look for "Lock position" or "Star Selected" with coordinates
    const coordMatch = trimmed.match(/(?:RA|RADEC|Lock\s*position|Star\s*Selected).*?(\d+[h:]\s*\d+[m:]\s*[\d.]+[s]?).*?([+-]?\d+[d°:]\s*\d+[m':]\s*[\d."]+[s"]?)/i) ||
                       trimmed.match(/Dec\s*=?\s*([+-]?\d+[d°:]\s*\d+[m':]\s*[\d."]+)/i);
    
    // Alternative format: Mount = (ra, dec) or specific coordinate notation
    const mountCoordMatch = trimmed.match(/Mount\s*=\s*\(?\s*([\d.]+)\s*,\s*([+-]?[\d.]+)\s*\)?/i);
    
    // Check for object name
    const objectMatch = trimmed.match(/(?:Object|Target|Name)\s*[=:]\s*["']?([^"'\n,]+)["']?/i);
    
    if (objectMatch) {
      currentObjectName = objectMatch[1].trim();
    }

    if (coordMatch || mountCoordMatch) {
      if (coordMatch) {
        currentRa = coordMatch[1]?.trim() || "";
        currentDec = coordMatch[2]?.trim() || coordMatch[1]?.trim() || "";
      } else if (mountCoordMatch) {
        currentRa = mountCoordMatch[1];
        currentDec = mountCoordMatch[2];
      }
      currentCoordinateId = `${currentRa}_${currentDec}`;
    }

    // Detect start of guiding block
    if (trimmed.includes('Guiding Begins')) {
      inGuidingBlock = true;
      currentBlockData = [];
      blockStartTime = 0;
      continue;
    }

    // Detect end of guiding block
    if (trimmed.includes('Guiding Ends')) {
      if (inGuidingBlock && currentBlockData.length > 0) {
        blocks.push({
          coordinateId: currentCoordinateId,
          data: [...currentBlockData],
          startTime: blockStartTime
        });

        // Create or update coordinate group
        if (!coordinateGroups.has(currentCoordinateId)) {
          const displayLabel = currentObjectName 
            ? `${currentObjectName} (RA: ${currentRa || '?'}, Dec: ${currentDec || '?'})`
            : currentRa && currentDec 
              ? `RA: ${currentRa}, Dec: ${currentDec}`
              : `Grupo ${coordinateGroups.size + 1}`;
          
          coordinateGroups.set(currentCoordinateId, {
            id: currentCoordinateId,
            ra: currentRa,
            dec: currentDec,
            objectName: currentObjectName || undefined,
            blocks: [],
            displayLabel
          });
        }
        coordinateGroups.get(currentCoordinateId)!.blocks.push(blocks[blocks.length - 1]);
      }
      inGuidingBlock = false;
      continue;
    }

    // Parse data line if we're in a guiding block
    if (inGuidingBlock) {
      const dataMatch = parseDataLine(trimmed);
      if (dataMatch) {
        if (currentBlockData.length === 0) {
          blockStartTime = dataMatch.time;
        }
        currentBlockData.push(dataMatch);
      }
    }
  }

  // Handle case where file ends without "Guiding Ends"
  if (inGuidingBlock && currentBlockData.length > 0) {
    blocks.push({
      coordinateId: currentCoordinateId,
      data: [...currentBlockData],
      startTime: blockStartTime
    });

    if (!coordinateGroups.has(currentCoordinateId)) {
      const displayLabel = currentObjectName 
        ? `${currentObjectName} (RA: ${currentRa || '?'}, Dec: ${currentDec || '?'})`
        : currentRa && currentDec 
          ? `RA: ${currentRa}, Dec: ${currentDec}`
          : `Grupo ${coordinateGroups.size + 1}`;
      
      coordinateGroups.set(currentCoordinateId, {
        id: currentCoordinateId,
        ra: currentRa,
        dec: currentDec,
        objectName: currentObjectName || undefined,
        blocks: [],
        displayLabel
      });
    }
    coordinateGroups.get(currentCoordinateId)!.blocks.push(blocks[blocks.length - 1]);
  }

  return {
    coordinateGroups: Array.from(coordinateGroups.values()),
    hasMultipleCoordinates: coordinateGroups.size > 1
  };
}

// Process selected blocks into analysis result
function processSelectedBlocks(blocks: GuidingBlock[]): PHD2AnalysisResult | null {
  if (blocks.length === 0) return null;

  // Sort blocks chronologically by their start time
  const sortedBlocks = [...blocks].sort((a, b) => a.startTime - b.startTime);
  
  const allDataPoints: PHD2DataPoint[] = [];
  let timeOffset = 0;

  for (const block of sortedBlocks) {
    const processed = processBlock(block.data, timeOffset);
    allDataPoints.push(...processed);
    
    if (processed.length > 0) {
      timeOffset = processed[processed.length - 1].time + 1;
    }
  }

  if (allDataPoints.length === 0) {
    return null;
  }

  // Calculate statistics with percentiles
  const rmsValues = allDataPoints.map(p => p.rmsTotal);
  const sortedRms = [...rmsValues].sort((a, b) => a - b);
  
  const getPercentile = (arr: number[], p: number) => {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  };
  
  const medianRms = getPercentile(sortedRms, 50);
  const p68Rms = getPercentile(sortedRms, 68);
  const minRms = Math.min(...rmsValues);
  const maxRms = Math.max(...rmsValues);
  const totalDuration = allDataPoints.length > 0 ? 
    allDataPoints[allDataPoints.length - 1].time - allDataPoints[0].time : 0;

  return {
    dataPoints: allDataPoints,
    medianRms,
    p68Rms,
    minRms,
    maxRms,
    totalDuration,
    blockCount: blocks.length,
  };
}

// Parse a single data line from PHD2 log
function parseDataLine(line: string): { time: number; dx: number; dy: number } | null {
  if (line.startsWith('#') || line.startsWith('Frame') || !line.match(/^\d/)) {
    return null;
  }

  let parts = line.split(',').map(s => s.trim());
  if (parts.length < 5) {
    parts = line.split('\t').map(s => s.trim());
  }

  if (parts.length < 5) {
    return null;
  }

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
    
    const windowStart = Math.max(0, i - RMS_WINDOW_SIZE + 1);
    const windowData = blockData.slice(windowStart, i + 1);

    const dxArcsec = windowData.map(p => p.dx * PIXEL_SCALE);
    const dyArcsec = windowData.map(p => p.dy * PIXEL_SCALE);

    const rmsRA = Math.sqrt(dxArcsec.reduce((sum, v) => sum + v * v, 0) / dxArcsec.length);
    const rmsDEC = Math.sqrt(dyArcsec.reduce((sum, v) => sum + v * v, 0) / dyArcsec.length);

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
  const [parsedData, setParsedData] = useState<ParsedGuideLog | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get blocks based on selection
  const selectedBlocks = useMemo(() => {
    if (!parsedData) return [];
    
    if (selectedCoordinate === "all") {
      // Return all blocks from all groups, sorted chronologically
      return parsedData.coordinateGroups.flatMap(g => g.blocks);
    }
    
    const group = parsedData.coordinateGroups.find(g => g.id === selectedCoordinate);
    return group ? group.blocks : [];
  }, [parsedData, selectedCoordinate]);

  // Process and update result when selection changes
  const handleConfirmSelection = useCallback(() => {
    const result = processSelectedBlocks(selectedBlocks);
    if (result) {
      onChange(result);
      setParsedData(null); // Clear parsed data after confirmation
    } else {
      setError("No se encontraron datos válidos para la selección");
    }
  }, [selectedBlocks, onChange]);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setParsedData(null);
    setSelectedCoordinate("all");

    try {
      const content = await file.text();
      const parsed = parseGuideLogStructure(content);

      if (parsed.coordinateGroups.length === 0) {
        setError("No se encontraron bloques de guiado válidos en el archivo");
        return;
      }

      // If multiple coordinates detected, show selection UI
      if (parsed.hasMultipleCoordinates) {
        setParsedData(parsed);
      } else {
        // Single coordinate group - process directly
        const result = processSelectedBlocks(parsed.coordinateGroups[0]?.blocks || []);
        if (result) {
          onChange(result);
        } else {
          setError("No se encontraron datos válidos en el archivo");
        }
      }
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
    setParsedData(null);
    setSelectedCoordinate("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Target className="w-4 h-4" />
        <span>Analizador PHD2 GuideLog</span>
      </div>

      {/* Coordinate selection UI when multiple coordinates detected */}
      {parsedData && parsedData.hasMultipleCoordinates && !value && (
        <div className="space-y-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Se detectaron múltiples coordenadas en el archivo.</strong>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              Selecciona qué datos de guiado quieres analizar:
            </p>
          </div>

          <Select value={selectedCoordinate} onValueChange={setSelectedCoordinate}>
            <SelectTrigger className="w-full bg-white dark:bg-slate-900">
              <SelectValue placeholder="Seleccionar coordenadas" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-50">
              <SelectItem value="all">
                <span className="font-medium">Unir todo</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({parsedData.coordinateGroups.reduce((sum, g) => sum + g.blocks.length, 0)} bloques)
                </span>
              </SelectItem>
              {parsedData.coordinateGroups.map((group, index) => (
                <SelectItem key={group.id} value={group.id}>
                  <span className="font-medium">{group.displayLabel}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({group.blocks.length} bloque{group.blocks.length !== 1 ? 's' : ''})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmSelection}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition"
            >
              Confirmar selección
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!value && !parsedData && (
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
      )}

      {value && (
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
              label="RMS Mediana (P50)" 
              value={value.medianRms.toFixed(2)} 
              unit="arcsec" 
            />
            <MetricCard 
              icon={<Target className="w-4 h-4" />} 
              label="RMS P68 (≈1σ)" 
              value={value.p68Rms.toFixed(2)} 
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
