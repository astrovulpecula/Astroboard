import React, { useMemo, useState } from 'react';
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
  calculateAnnualVisibility,
  parseCoordinates,
  formatTransitTime,
  getVisibilityDescription,
  type VisibilityResult,
  type ObserverLocation,
} from '@/lib/astronomy-calculations';
import { Clock, ArrowUp, Sunrise, Sunset, Calendar } from 'lucide-react';

interface VisibilityChartProps {
  objectCode: string;
  coordinates: string; // "lat, lon" format
  date?: Date;
  compact?: boolean;
  language?: 'es' | 'en';
  altitudeLimit?: number; // User-defined minimum altitude limit in degrees
  showToggle?: boolean; // Whether to show the today/annual toggle
  defaultView?: 'today' | 'annual'; // Default view mode
}

export default function VisibilityChart({
  objectCode,
  coordinates,
  date = new Date(),
  compact = false,
  language = 'es',
  altitudeLimit,
  showToggle = true,
  defaultView = 'today',
}: VisibilityChartProps) {
  const [viewMode, setViewMode] = useState<'today' | 'annual'>(defaultView);

  const coords = useMemo(() => parseCoordinates(coordinates), [coordinates]);
  const objectCoords = useMemo(() => getObjectCoordinates(objectCode), [objectCode]);

  const visibility = useMemo(() => {
    if (!coords || !objectCoords) return null;
    return calculateNightVisibility(objectCoords.ra, objectCoords.dec, coords, date);
  }, [objectCoords, coords, date]);

  const annualVisibility = useMemo(() => {
    if (!coords || !objectCoords) return null;
    return calculateAnnualVisibility(objectCoords.ra, objectCoords.dec, coords, date.getFullYear());
  }, [objectCoords, coords, date]);

  if (!coords || !objectCoords) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'No visibility data available'
          : 'Sin datos de visibilidad'}
      </div>
    );
  }

  if (visibility?.neverRises) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'Object never rises from your location'
          : 'El objeto nunca es visible desde tu ubicación'}
      </div>
    );
  }

  if (!visibility) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {language === 'en'
          ? 'No visibility data available'
          : 'Sin datos de visibilidad'}
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

  // Toggle component
  const ViewToggle = () => (
    <div className="flex items-center justify-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
      <button
        onClick={() => setViewMode('today')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          viewMode === 'today'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {language === 'en' ? 'Today' : 'Hoy'}
      </button>
      <button
        onClick={() => setViewMode('annual')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          viewMode === 'annual'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {language === 'en' ? 'Annual' : 'Anual'}
      </button>
    </div>
  );

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
              {altitudeLimit !== undefined && altitudeLimit > 0 && (
                <ReferenceLine 
                  y={altitudeLimit} 
                  stroke="hsl(var(--warning, 45 93% 47%))" 
                  strokeWidth={1.5}
                  strokeDasharray="4 2" 
                />
              )}
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
      {/* Toggle */}
      {showToggle && (
        <div className="flex justify-center">
          <ViewToggle />
        </div>
      )}

      {viewMode === 'today' ? (
        <>
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
                  : visibility.transitAltitude >= 20
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
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
                  ticks={altitudeLimit && altitudeLimit > 0 && ![0, 30, 60, 90].includes(altitudeLimit)
                    ? [0, altitudeLimit, 30, 60, 90].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b)
                    : [0, 30, 60, 90]
                  }
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
              ? `Altitude curve from 18:00 to 06:00.${altitudeLimit ? ` Yellow line: your ${altitudeLimit}° limit.` : ''} Objects above 30° offer better imaging conditions.`
              : `Curva de altitud de 18:00 a 06:00.${altitudeLimit ? ` Línea amarilla: tu límite de ${altitudeLimit}°.` : ''} Objetos sobre 30° ofrecen mejores condiciones.`}
          </p>
        </>
      ) : (
        <>
          {/* Vista Anual */}
          {annualVisibility && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'en' ? 'Best Month' : 'Mejor mes'}
                    </div>
                    <div className="font-semibold">{annualVisibility.bestMonthName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <ArrowUp className="w-4 h-4 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'en' ? 'Peak Altitude' : 'Altitud pico'}
                    </div>
                    <div className="font-semibold">
                      {Math.max(...annualVisibility.data.map(d => d.maxAltitude)).toFixed(0)}°
                    </div>
                  </div>
                </div>
                {annualVisibility.isCircumpolar && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                    <div className="text-xs text-green-700 dark:text-green-400 font-medium">
                      {language === 'en' ? 'Circumpolar - always visible' : 'Circumpolar'}
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico Anual - Lineal */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={annualVisibility.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`colorAltAnnual-${objectCode}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      domain={[0, 90]}
                      ticks={altitudeLimit && altitudeLimit > 0 && ![0, 30, 60, 90].includes(altitudeLimit)
                        ? [0, altitudeLimit, 30, 60, 90].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b)
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
                        language === 'en' ? 'Max Altitude' : 'Altitud máx.'
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    {altitudeLimit !== undefined && altitudeLimit > 0 && (
                      <ReferenceLine
                        y={altitudeLimit}
                        stroke="hsl(45 93% 47%)"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="maxAltitude"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#colorAltAnnual-${objectCode})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {language === 'en'
                  ? `Maximum altitude per month throughout the year.${altitudeLimit ? ` Yellow line: your ${altitudeLimit}° limit.` : ''}`
                  : `Altitud máxima por mes a lo largo del año.${altitudeLimit ? ` Línea amarilla: tu límite de ${altitudeLimit}°.` : ''}`}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}