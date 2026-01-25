import React from "react";
import { Thermometer, Gauge, Droplets } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FitsAnalysisResult } from "./FitsAnalyzer";

interface FitsChartsProps {
  data: FitsAnalysisResult;
}

export default function FitsCharts({ data }: FitsChartsProps) {
  // Prepare chart data
  const chartData = data.files
    .filter(f => f.timestamp)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
    .map((f, i) => ({
      index: i + 1,
      mpsas: f.mpsas,
      ambientTemp: f.ambientTemp,
      skyTemp: f.skyTemp,
      humidity: f.humidity,
      wind: f.wind,
    }));

  const hasChartData = chartData.length > 0 && chartData.some(d => 
    d.mpsas !== undefined || d.ambientTemp !== undefined || d.humidity !== undefined || d.wind !== undefined
  );

  if (!hasChartData) {
    return null;
  }

  return (
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
  );
}
