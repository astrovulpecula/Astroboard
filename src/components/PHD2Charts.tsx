import React, { useMemo } from "react";
import { Target } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, ReferenceLine, Legend,
} from "recharts";
import { PHD2AnalysisResult, PHD2Group } from "./PHD2Analyzer";

interface PHD2ChartsProps {
  data: PHD2AnalysisResult;
}

function downsample<T>(arr: T[], max = 800): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function fmtHour(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function GroupChart({ group, index }: { group: PHD2Group; index: number }) {
  const chartData = useMemo(() => downsample(group.frames).map(f => ({
    t: f.t, ra: f.ra, dec: f.dec, total: f.total, snr: f.snr,
  })), [group.frames]);

  const hasSnr = useMemo(() => chartData.some(d => typeof d.snr === "number" && isFinite(d.snr as number)), [chartData]);

  if (!chartData.length) return null;

  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border">
      <h4 className="text-sm font-medium mb-1 flex items-center gap-2 text-foreground">
        <Target className="w-4 h-4" />
        {group.objectName || `Objetivo ${index + 1}`} — Guiado PHD2
      </h4>
      <div className="text-xs text-muted-foreground mb-2">
        RA {group.raRms.toFixed(2)}" · DEC {group.decRms.toFixed(2)}" · Total {group.totalRms.toFixed(2)}" · {group.frameCount} frames en {group.blockCount} tramo{group.blockCount !== 1 ? "s" : ""}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={fmtHour}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickFormatter={(v) => `${v.toFixed(1)}"`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(v: number) => fmtHour(v)}
              formatter={(v: number, name: string) => [`${v.toFixed(2)}"`, name]}
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="2 4" />
            <ReferenceLine y={-1} stroke="#94a3b8" strokeDasharray="2 4" />
            <Line type="monotone" dataKey="ra" name="RA" stroke="#3b82f6" dot={false} strokeWidth={1.4} connectNulls={false} />
            <Line type="monotone" dataKey="dec" name="DEC" stroke="#ef4444" dot={false} strokeWidth={1.4} connectNulls={false} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#a855f7" dot={false} strokeWidth={1} strokeDasharray="3 3" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hasSnr && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
            <Target className="w-4 h-4" />
            {group.objectName || `Objetivo ${index + 1}`} — SNR en Guiado
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={fmtHour}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => v.toFixed(1)}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  labelFormatter={(v: number) => fmtHour(v)}
                  formatter={(v: number) => [v.toFixed(2), "SNR"]}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="snr" name="SNR" stroke="#22c55e" dot={false} strokeWidth={1.4} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PHD2Charts({ data }: PHD2ChartsProps) {
  const groups = data.groups && data.groups.length > 0 ? data.groups : null;

  // Legacy fallback: old results without groups
  const legacyData = useMemo(() => {
    if (groups || !data.dataPoints?.length) return null;
    return downsample(data.dataPoints).map((p, i) => ({ index: i + 1, rmsTotal: p.rmsTotal }));
  }, [groups, data.dataPoints]);

  if (groups) {
    return (
      <div className="space-y-4">
        {groups.map((g, i) => <GroupChart key={g.id} group={g} index={i} />)}
      </div>
    );
  }

  if (!legacyData?.length) return null;

  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
        <Target className="w-4 h-4" /> Error de guiado RMS Total
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={legacyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="index" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(1)}"`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(2)}"`, "RMS Total"]} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="2 4" />
            <Line type="monotone" dataKey="rmsTotal" stroke="hsl(var(--destructive))" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
