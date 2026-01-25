import React, { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, BarChart3, Thermometer, Wind, Droplets, Gauge, Cloud } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// FITS metadata interface
export interface FitsMetadata {
  mpsas?: number;           // Sky quality (mag/arcsec²)
  cloudCover?: number;      // Cloud coverage %
  ambientTemp?: number;     // Ambient temperature °C
  skyTemp?: number;         // Sky temperature °C
  humidity?: number;        // Humidity %
  dewPoint?: number;        // Dew point °C
  pressure?: number;        // Pressure hPa
  wind?: number;            // Wind speed m/s
  windGust?: number;        // Wind gust m/s
  timestamp?: string;       // Capture time
  filename?: string;        // Original filename
}

export interface FitsAnalysisResult {
  files: FitsMetadata[];
  averages: {
    mpsas?: number;
    cloudCover?: number;
    ambientTemp?: number;
    skyTemp?: number;
    humidity?: number;
    dewPoint?: number;
    pressure?: number;
    wind?: number;
    windGust?: number;
  };
}

interface FitsAnalyzerProps {
  value?: FitsAnalysisResult | null;
  onChange: (result: FitsAnalysisResult | null) => void;
}

// Parse FITS header to extract metadata
async function parseFitsHeader(file: File): Promise<FitsMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        
        // FITS headers are in ASCII, 80 chars per line, 2880 bytes per block
        const headerText = new TextDecoder("ascii").decode(bytes.slice(0, Math.min(bytes.length, 28800)));
        const lines = headerText.match(/.{1,80}/g) || [];
        
        const metadata: FitsMetadata = { filename: file.name };
        
        // Common header keywords for weather/sky data
        const keywordMap: Record<string, keyof FitsMetadata> = {
          "SQM": "mpsas",
          "MPSAS": "mpsas",
          "SKY-QUAL": "mpsas",
          "SKYQUAL": "mpsas",
          "CLOUDCVR": "cloudCover",
          "CLOUD": "cloudCover",
          "AMBTEMP": "ambientTemp",
          "AMB-TEMP": "ambientTemp",
          "TEMPAMB": "ambientTemp",
          "SKYTEMP": "skyTemp",
          "SKY-TEMP": "skyTemp",
          "HUMIDITY": "humidity",
          "DEWPOINT": "dewPoint",
          "DEW-POIN": "dewPoint",
          "PRESSURE": "pressure",
          "BAROMET": "pressure",
          "WINDSPD": "wind",
          "WIND-SPD": "wind",
          "WINDGUST": "windGust",
          "WIND-GST": "windGust",
          "DATE-OBS": "timestamp",
        };
        
        for (const line of lines) {
          if (line.startsWith("END")) break;
          
          const keyMatch = line.match(/^([A-Z0-9_-]+)\s*=\s*(.+)/);
          if (keyMatch) {
            const [, key, rawValue] = keyMatch;
            const trimmedKey = key.trim();
            const metaKey = keywordMap[trimmedKey];
            
            if (metaKey) {
              let value = rawValue.split("/")[0].trim();
              value = value.replace(/^['"]|['"]$/g, "").trim();
              
              if (metaKey === "timestamp") {
                metadata.timestamp = value;
              } else {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  (metadata as any)[metaKey] = numValue;
                }
              }
            }
          }
        }
        
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Calculate averages from array of metadata
function calculateAverages(files: FitsMetadata[]): FitsAnalysisResult["averages"] {
  const keys: (keyof FitsMetadata)[] = [
    "mpsas", "cloudCover", "ambientTemp", "skyTemp", 
    "humidity", "dewPoint", "pressure", "wind", "windGust"
  ];
  
  const averages: FitsAnalysisResult["averages"] = {};
  
  for (const key of keys) {
    const values = files
      .map(f => f[key] as number)
      .filter(v => v !== undefined && !isNaN(v));
    
    if (values.length > 0) {
      (averages as any)[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  
  return averages;
}

const INPUT_CLS = "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100";

export default function FitsAnalyzer({ value, onChange }: FitsAnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => 
      f.name.toLowerCase().endsWith(".fits") || 
      f.name.toLowerCase().endsWith(".fit")
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
          const metadata = await parseFitsHeader(file);
          metadataList.push(metadata);
        } catch (e) {
          console.warn(`Error parsing ${file.name}:`, e);
        }
      }
      
      if (metadataList.length === 0) {
        setError("No se pudieron extraer metadatos de los archivos");
        return;
      }
      
      const averages = calculateAverages(metadataList);
      onChange({ files: metadataList, averages });
    } catch (e) {
      setError("Error al procesar los archivos");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const files: File[] = [];
    
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file((file) => {
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        return new Promise((resolve) => {
          reader.readEntries(async (entries) => {
            for (const e of entries) {
              await processEntry(e);
            }
            resolve();
          });
        });
      }
    };
    
    const processItems = async () => {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      
      for (const entry of entries) {
        await processEntry(entry);
      }
      
      if (files.length > 0) {
        processFiles(files);
      }
    };
    
    processItems();
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const handleClear = useCallback(() => {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [onChange]);

  // Prepare chart data
  const chartData = value?.files
    .filter(f => f.timestamp)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
    .map((f, i) => ({
      index: i + 1,
      mpsas: f.mpsas,
      ambientTemp: f.ambientTemp,
      skyTemp: f.skyTemp,
      humidity: f.humidity,
      wind: f.wind,
    })) || [];

  const hasChartData = chartData.length > 0 && chartData.some(d => 
    d.mpsas !== undefined || d.ambientTemp !== undefined || d.humidity !== undefined || d.wind !== undefined
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <BarChart3 className="w-4 h-4" />
        <span>Analizador FITS</span>
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
            accept=".fits,.fit"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore - webkitdirectory is a valid attribute
            webkitdirectory=""
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Procesando archivos...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Arrastra archivos FITS aquí o
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition"
                >
                  Seleccionar archivos
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Seleccionar carpeta
                </button>
              </div>
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
              <span className="text-sm font-medium">{value.files.length} archivos analizados</span>
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
          
          {/* Averages grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {value.averages.mpsas !== undefined && (
              <MetricCard icon={<Gauge className="w-4 h-4" />} label="MPSAS" value={value.averages.mpsas.toFixed(2)} unit="mag/arcsec²" />
            )}
            {value.averages.cloudCover !== undefined && (
              <MetricCard icon={<Cloud className="w-4 h-4" />} label="Nubes" value={value.averages.cloudCover.toFixed(1)} unit="%" />
            )}
            {value.averages.ambientTemp !== undefined && (
              <MetricCard icon={<Thermometer className="w-4 h-4" />} label="Temp. ambiente" value={value.averages.ambientTemp.toFixed(1)} unit="°C" />
            )}
            {value.averages.skyTemp !== undefined && (
              <MetricCard icon={<Thermometer className="w-4 h-4" />} label="Temp. cielo" value={value.averages.skyTemp.toFixed(1)} unit="°C" />
            )}
            {value.averages.humidity !== undefined && (
              <MetricCard icon={<Droplets className="w-4 h-4" />} label="Humedad" value={value.averages.humidity.toFixed(1)} unit="%" />
            )}
            {value.averages.dewPoint !== undefined && (
              <MetricCard icon={<Droplets className="w-4 h-4" />} label="Punto rocío" value={value.averages.dewPoint.toFixed(1)} unit="°C" />
            )}
            {value.averages.pressure !== undefined && (
              <MetricCard icon={<Gauge className="w-4 h-4" />} label="Presión" value={value.averages.pressure.toFixed(0)} unit="hPa" />
            )}
            {value.averages.wind !== undefined && (
              <MetricCard icon={<Wind className="w-4 h-4" />} label="Viento" value={value.averages.wind.toFixed(1)} unit="m/s" />
            )}
            {value.averages.windGust !== undefined && (
              <MetricCard icon={<Wind className="w-4 h-4" />} label="Racha" value={value.averages.windGust.toFixed(1)} unit="m/s" />
            )}
          </div>
          
          {/* Charts */}
          {hasChartData && (
            <div className="space-y-4">
              {/* Temperature chart */}
              {chartData.some(d => d.ambientTemp !== undefined || d.skyTemp !== undefined) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Thermometer className="w-4 h-4" /> Temperatura durante sesión
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis dataKey="index" tick={{ fontSize: 12 }} className="text-slate-500" />
                        <YAxis tick={{ fontSize: 12 }} className="text-slate-500" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="ambientTemp" stroke="#f59e0b" name="Ambiente" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="skyTemp" stroke="#3b82f6" name="Cielo" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {/* MPSAS chart */}
              {chartData.some(d => d.mpsas !== undefined) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" /> Calidad del cielo (MPSAS)
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis dataKey="index" tick={{ fontSize: 12 }} className="text-slate-500" />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} className="text-slate-500" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }} 
                        />
                        <Line type="monotone" dataKey="mpsas" stroke="#8b5cf6" name="MPSAS" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {/* Humidity & Wind chart */}
              {chartData.some(d => d.humidity !== undefined || d.wind !== undefined) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> Humedad y viento
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis dataKey="index" tick={{ fontSize: 12 }} className="text-slate-500" />
                        <YAxis tick={{ fontSize: 12 }} className="text-slate-500" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="humidity" stroke="#06b6d4" name="Humedad %" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="wind" stroke="#22c55e" name="Viento m/s" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
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
          {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}
