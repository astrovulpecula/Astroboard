import React, { useMemo } from "react";
import { Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { PHD2AnalysisResult } from "./PHD2Analyzer";

interface PHD2ChartsProps {
  data: PHD2AnalysisResult;
}

// Downsample data for chart performance (max 500 points)
function downsampleData(dataPoints: PHD2AnalysisResult['dataPoints'], maxPoints: number = 500) {
  if (dataPoints.length <= maxPoints) {
    return dataPoints;
  }

  const step = Math.ceil(dataPoints.length / maxPoints);
  const result = [];
  
  for (let i = 0; i < dataPoints.length; i += step) {
    result.push(dataPoints[i]);
  }
  
  // Always include the last point
  if (result[result.length - 1] !== dataPoints[dataPoints.length - 1]) {
    result.push(dataPoints[dataPoints.length - 1]);
  }
  
  return result;
}

export default function PHD2Charts({ data }: PHD2ChartsProps) {
  // Prepare chart data with downsampling for performance
  const chartData = useMemo(() => {
    const downsampled = downsampleData(data.dataPoints);
    return downsampled.map((p, i) => ({
      index: i + 1,
      time: p.time,
      rmsTotal: p.rmsTotal,
    }));
  }, [data.dataPoints]);

  if (!chartData.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Full view chart - no Y axis limit */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
          <Target className="w-4 h-4" /> Error de guiado RMS Total (Vista completa)
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickFormatter={(v) => `${v}`}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickFormatter={(v) => `${v.toFixed(1)}"`}
                domain={['auto', 'auto']}
              />
              <Line 
                type="monotone" 
                dataKey="rmsTotal" 
                stroke="hsl(var(--destructive))" 
                name="RMS Total" 
                dot={false} 
                strokeWidth={1.5} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
