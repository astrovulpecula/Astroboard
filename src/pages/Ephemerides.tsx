import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft } from "lucide-react";
import { loadEphemeris, formatSpanishDate, type Ephemeris } from "@/lib/ephemeris-data";

const Ephemerides = () => {
  const navigate = useNavigate();
  const [ephemerides, setEphemerides] = useState<Ephemeris[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadEphemeris();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        // Filtrar solo efemérides futuras y ordenar por fecha
        const futureEphemerides = data
          .filter((eph) => {
            const eventDate = parseSpanishDate(eph.date);
            return eventDate && eventDate.getTime() >= now.getTime();
          })
          .sort((a, b) => {
            const dateA = parseSpanishDate(a.date);
            const dateB = parseSpanishDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
          });
        
        setEphemerides(futureEphemerides);
      } catch (error) {
        console.error("Error loading ephemerides:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Parsear fecha del formato "14-dic.-25" a objeto Date
  const parseSpanishDate = (dateStr: string): Date | null => {
    const monthMap: { [key: string]: number } = {
      'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    };

    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0]);
    const monthKey = parts[1].replace('.', '').toLowerCase();
    const year = parseInt(parts[2]) + 2000;

    const month = monthMap[monthKey];
    if (month === undefined) return null;

    return new Date(year, month, day);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Lluvia de meteoros': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Fases lunares': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Eclipse solar': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Eclipse lunar': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Planeta en oposición': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Conjunción planetaria': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Estaciones': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Órbita Tierra': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    };
    return colors[category] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              Próximas Efemérides
            </h1>
            <p className="text-slate-300 mt-2">
              Calendario de eventos astronómicos 2025-2026
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-slate-300">Cargando efemérides...</p>
          </div>
        )}

        {/* Ephemerides List */}
        {!loading && (
          <div className="grid gap-4">
            {ephemerides.map((eph, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Date */}
                  <div className="flex-shrink-0 text-center md:text-left">
                    <div className="inline-block bg-white/10 rounded-xl px-4 py-2 border border-white/20">
                      <Calendar className="w-5 h-5 mb-1 mx-auto md:mx-0" />
                      <p className="text-sm font-medium text-slate-300">
                        {formatSpanishDate(eph.date)}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(eph.category)}`}>
                        {eph.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{eph.eventES}</h3>
                    {eph.eventEN && (
                      <p className="text-slate-400 text-sm mb-2 italic">{eph.eventEN}</p>
                    )}
                    {eph.notes && (
                      <p className="text-slate-300 text-sm leading-relaxed">{eph.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {ephemerides.length === 0 && !loading && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400">No hay efemérides programadas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ephemerides;
