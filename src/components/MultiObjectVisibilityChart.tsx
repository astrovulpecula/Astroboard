import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { getObjectCoordinates } from '@/lib/celestial-coordinates';
import {
  calculateNightVisibility,
  parseCoordinates,
  type VisibilityResult,
} from '@/lib/astronomy-calculations';
import { Eye, Moon } from 'lucide-react';

interface PlannedProject {
  id: string;
  objectId: string;
  objectName?: string;
  signal?: string;
}

interface MultiObjectVisibilityChartProps {
  plannedProjects: PlannedProject[];
  coordinates: string; // "lat, lon" format
  date?: Date;
  language?: 'es' | 'en';
  altitudeLimit?: number;
}

// Color palette for different objects
const OBJECT_COLORS = [
  'hsl(142, 76%, 36%)', // emerald
  'hsl(346, 77%, 49%)', // rose
  'hsl(199, 89%, 48%)', // cyan
  'hsl(262, 83%, 58%)', // purple
  'hsl(25, 95%, 53%)',  // orange
  'hsl(47, 96%, 53%)',  // amber
  'hsl(221, 83%, 53%)', // blue
  'hsl(160, 84%, 39%)', // teal
  'hsl(291, 64%, 42%)', // fuchsia
  'hsl(0, 84%, 60%)',   // red
];

export default function MultiObjectVisibilityChart({
  plannedProjects,
  coordinates,
  date = new Date(),
  language = 'es',
  altitudeLimit,
}: MultiObjectVisibilityChartProps) {
  const coords = useMemo(() => parseCoordinates(coordinates), [coordinates]);

  // Calculate visibility for all objects that have coordinates in our catalog
  const objectsData = useMemo(() => {
    if (!coords) return [];

    const results: Array<{
      id: string;
      name: string;
      visibility: VisibilityResult | null;
      color: string;
    }> = [];

    plannedProjects.forEach((planned, idx) => {
      const objectCoords = getObjectCoordinates(planned.objectId);
      if (!objectCoords) return;

      const visibility = calculateNightVisibility(
        objectCoords.ra,
        objectCoords.dec,
        coords,
        date
      );

      if (visibility && !visibility.neverRises) {
        results.push({
          id: planned.objectId,
          name: planned.objectName || planned.objectId,
          visibility,
          color: OBJECT_COLORS[idx % OBJECT_COLORS.length],
        });
      }
    });

    return results;
  }, [plannedProjects, coords, date]);

  // Build combined chart data with hourly altitude for each object
  const chartData = useMemo(() => {
    if (objectsData.length === 0) return [];

    // Use the first object's data structure as template
    const template = objectsData[0]?.visibility?.data || [];
    const hourlyData = template.filter((_, i) => i % 4 === 0); // Every hour

    return hourlyData.map((point, idx) => {
      const dataPoint: Record<string, any> = {
        hourLabel: point.hourLabel,
      };

      objectsData.forEach((obj) => {
        const objData = obj.visibility?.data?.filter((_, i) => i % 4 === 0);
        if (objData && objData[idx]) {
          dataPoint[obj.id] = objData[idx].altitude;
        }
      });

      return dataPoint;
    });
  }, [objectsData]);

  if (!coords) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'Configure your main location in settings to see visibility'
          : 'Configura tu localización principal en ajustes para ver la visibilidad'}
      </div>
    );
  }

  if (objectsData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'No visibility data available for planned objects'
          : 'Sin datos de visibilidad para los objetos planificados'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {language === 'en' ? 'Night Visibility - All Objects' : 'Visibilidad Nocturna - Todos los Objetos'}
        </h3>
        <span className="text-xs text-muted-foreground">
          ({objectsData.length} {language === 'en' ? 'objects with data' : 'objetos con datos'})
        </span>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[-10, 90]}
              ticks={
                altitudeLimit && altitudeLimit > 0 && ![0, 30, 60, 90].includes(altitudeLimit)
                  ? [0, altitudeLimit, 30, 60, 90]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .sort((a, b) => a - b)
                  : [0, 30, 60, 90]
              }
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}°`,
                name,
              ]}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
            {altitudeLimit !== undefined && altitudeLimit > 0 && (
              <ReferenceLine
                y={altitudeLimit}
                stroke="hsl(45 93% 47%)"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            )}
            <ReferenceLine
              y={30}
              stroke="hsl(var(--primary))"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
            {objectsData.map((obj) => (
              <Line
                key={obj.id}
                type="monotone"
                dataKey={obj.id}
                stroke={obj.color}
                strokeWidth={2}
                dot={false}
                name={obj.id}
              />
            ))}
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {language === 'en'
          ? `Altitude curves from 18:00 to 06:00.${altitudeLimit ? ` Yellow line: your ${altitudeLimit}° limit.` : ''} Objects above 30° offer better imaging conditions.`
          : `Curvas de altitud de 18:00 a 06:00.${altitudeLimit ? ` Línea amarilla: tu límite de ${altitudeLimit}°.` : ''} Objetos sobre 30° ofrecen mejores condiciones.`}
      </p>
    </div>
  );
}
