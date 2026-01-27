import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getObjectCoordinates } from '@/lib/celestial-coordinates';
import {
  calculateNightVisibility,
  parseCoordinates,
  formatTransitTime,
  getVisibilityDescription,
  type VisibilityResult,
  type ObserverLocation,
} from '@/lib/astronomy-calculations';
import { Clock, ArrowUp, Sunrise, Sunset } from 'lucide-react';

interface VisibilityChartProps {
  objectCode: string;
  coordinates: string; // "lat, lon" format
  date?: Date;
  compact?: boolean;
  language?: 'es' | 'en';
}

export default function VisibilityChart({
  objectCode,
  coordinates,
  date = new Date(),
  compact = false,
  language = 'es',
}: VisibilityChartProps) {
  const visibility = useMemo(() => {
    const coords = parseCoordinates(coordinates);
    const objectCoords = getObjectCoordinates(objectCode);

    if (!coords || !objectCoords) {
      return null;
    }

    return calculateNightVisibility(
      objectCoords.ra,
      objectCoords.dec,
      coords,
      date
    );
  }, [objectCode, coordinates, date]);

  if (!visibility) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'No visibility data available'
          : 'Sin datos de visibilidad'}
      </div>
    );
  }

  if (visibility.neverRises) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'Object never rises from your location'
          : 'El objeto nunca es visible desde tu ubicación'}
      </div>
    );
  }

  // Preparar datos para el gráfico (cada hora)
  const chartData = visibility.data.filter((_, i) => i % 4 === 0); // Cada hora

  // Estilo según la altitud
  const getGradientOffset = () => {
    const dataMax = Math.max(...visibility.data.map((d) => d.altitude));
    const dataMin = Math.min(...visibility.data.map((d) => d.altitude));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  };

  const gradientOffset = getGradientOffset();

  if (compact) {
    // Vista compacta para cards de planificación
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            {visibility.transitAltitude.toFixed(0)}°
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTransitTime(visibility.transitTime)}
          </span>
        </div>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`colorAlt-${objectCode}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset={gradientOffset} stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset={gradientOffset} stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="altitude"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill={`url(#colorAlt-${objectCode})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Vista completa para página de proyecto
  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <ArrowUp className="w-4 h-4 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">
              {language === 'en' ? 'Max Altitude' : 'Altitud máx.'}
            </div>
            <div className="font-semibold">{visibility.transitAltitude.toFixed(1)}°</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">
              {language === 'en' ? 'Transit' : 'Tránsito'}
            </div>
            <div className="font-semibold">{formatTransitTime(visibility.transitTime)}</div>
          </div>
        </div>
        {visibility.riseTime && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Sunrise className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">
                {language === 'en' ? 'Rises' : 'Sale'}
              </div>
              <div className="font-semibold">{formatTransitTime(visibility.riseTime)}</div>
            </div>
          </div>
        )}
        {visibility.setTime && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Sunset className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">
                {language === 'en' ? 'Sets' : 'Se oculta'}
              </div>
              <div className="font-semibold">{formatTransitTime(visibility.setTime)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Descripción de visibilidad */}
      <div className="text-sm text-center">
        <span
          className={`px-3 py-1 rounded-full ${
            visibility.isCircumpolar
              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
              : visibility.transitAltitude >= 60
              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
              : visibility.transitAltitude >= 30
              ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
              : 'bg-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          {getVisibilityDescription(visibility, language)}
        </span>
      </div>

      {/* Gráfico */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorAltFull-${objectCode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={gradientOffset} stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset={gradientOffset} stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[-10, 90]}
              ticks={[0, 30, 60, 90]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}°`, language === 'en' ? 'Altitude' : 'Altitud']}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              label={{
                value: language === 'en' ? 'Horizon' : 'Horizonte',
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <ReferenceLine
              y={30}
              stroke="hsl(var(--primary))"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="altitude"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill={`url(#colorAltFull-${objectCode})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {language === 'en'
          ? 'Altitude curve from 18:00 to 06:00. Objects above 30° offer better imaging conditions.'
          : 'Curva de altitud de 18:00 a 06:00. Objetos sobre 30° ofrecen mejores condiciones.'}
      </p>
    </div>
  );
}
