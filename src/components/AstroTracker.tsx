import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { validateJsonUpload } from "@/lib/json-validation";
import { safeLocalStorageSave, checkStorageQuota, formatBytes } from "@/lib/storage-utils";
import { useLanguage } from "@/hooks/use-language";
import { useCloudSync } from "@/hooks/useCloudSync";
import { supabase } from "@/integrations/supabase/client";
import { Language } from "@/lib/i18n";
import {
  Plus,
  FolderOpen,
  Telescope,
  Star,
  Upload,
  Download,
  Trash2,
  Moon,
  Sun,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Pencil,
  MessageCircle,
  Settings,
  User,
  Flame,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  CloudSun,
  BarChart3,
  ImageIcon,
  TrendingUp,
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  ChevronDownIcon,
  Target,
  Search,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { calculateMoonPhase, formatMoonPhase, calculateMoonTimes, type MoonPhase } from "@/lib/lunar-phase";
import { searchCelestialObjects, loadCelestialObjects } from "@/lib/celestial-data";
import { getNextEphemeris, formatSpanishDate, loadEphemeris, type Ephemeris } from "@/lib/ephemeris-data";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FitsAnalyzer, { FitsAnalysisResult } from "@/components/FitsAnalyzer";
import FitsCharts from "@/components/FitsCharts";
import PHD2Analyzer, { PHD2AnalysisResult } from "@/components/PHD2Analyzer";
import PHD2Charts from "@/components/PHD2Charts";
import VisibilityChart from "@/components/VisibilityChart";
import MultiObjectVisibilityChart from "@/components/MultiObjectVisibilityChart";
import { Eye } from "lucide-react";

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const INPUT_CLS = "border rounded-xl px-3 py-2 bg-white/80 dark:bg-slate-900/60 text-sm md:text-base";
const num = (v: any, d = 0) => (Number.isFinite(+v) ? +v : d);
const toISODate = (d: string) => {
  if (!/^\d{2}\/\d{2}\/\d{2,4}$/.test(d)) return d;
  const [dd, mm, yy] = d.split("/");
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};
const hh = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
const formatHoursToHHMM = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Función para formatear fechas según la preferencia del usuario
const formatDateDisplay = (dateStr: string, format: string = "DD/MM/YYYY") => {
  if (!dateStr) return "–";
  
  // Si la fecha ya está en formato ISO (YYYY-MM-DD)
  let date: Date;
  if (dateStr.includes("-")) {
    date = new Date(dateStr + "T00:00:00");
  } else if (dateStr.includes("/")) {
    // Si está en formato DD/MM/YYYY o similar
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [first, second, third] = parts;
      // Asumimos DD/MM/YYYY por defecto
      date = new Date(`${third.length === 2 ? "20" + third : third}-${second}-${first}`);
    } else {
      date = new Date(dateStr);
    }
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  switch (format) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY/MM/DD":
      return `${year}/${month}/${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};
const mean = (s: any) => {
  if (!s) return null;
  const a = [s.snrR, s.snrG, s.snrB].filter((v: any) => Number.isFinite(v));
  return a.length ? a.reduce((x: number, y: number) => x + y, 0) / a.length : null;
};
const totalExposureSec = (sessions: any[]) => sessions.reduce((a, s) => a + (s.lights || 0) * (s.exposureSec || 0), 0);
const cumulativeLights = (sessions: any[], i: number) =>
  sessions.slice(0, i + 1).reduce((a, s) => a + (s.lights || 0), 0);
const cumulativeHours = (sessions: any[], i: number) =>
  sessions.slice(0, i + 1).reduce((a, s) => a + (s.lights || 0) * (s.exposureSec || 0), 0) / 3600;

const sampleSessions = [
  {
    id: uid("ses"),
    date: toISODate("22/09/25"),
    lights: 48,
    exposureSec: 180,
    filter: "RGB",
    snrR: 49.54,
    snrG: 50.77,
    snrB: 48.36,
    notes: "Noche estable.",
    moonPhase: formatMoonPhase(calculateMoonPhase(toISODate("22/09/25"))),
  },
  {
    id: uid("ses"),
    date: toISODate("23/09/25"),
    lights: 60,
    exposureSec: 180,
    filter: "RGB",
    snrR: 51.91,
    snrG: 53.46,
    snrB: 50.89,
    notes: "Ligera bruma.",
    moonPhase: formatMoonPhase(calculateMoonPhase(toISODate("23/09/25"))),
  },
];

const sample = [
  {
    id: "M31",
    commonName: "Galaxia de Andrómeda",
    constellation: "Andrómeda",
    type: "Galaxia",
    createdAt: new Date().toISOString(),
    image: undefined,
    projects: [
      {
        id: uid("proj"),
        name: "Proyecto Trevinca",
        description: "Campaña principal RGB",
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        status: "active",
        completedDate: undefined,
        images: {},
        ratings: {},
        sessions: sampleSessions,
        panels: {
          1: sampleSessions,
        },
      },
    ],
  },
];

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700/60 ${className}`}>
    {children}
  </span>
);

const Card = ({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    className={`rounded-2xl shadow-sm p-3 md:p-4 ${className} ${onClick ? "cursor-pointer transition hover:shadow" : ""}`}
    data-card
    style={{
      border: "1px solid var(--card-border, rgb(226 232 240))",
      background: "var(--card-bg, rgba(255, 255, 255, 0.7))",
    }}
    onClick={onClick}
  >
    {children}
  </div>
);

type ImageItem = {
  src: string;
  title: string;
  type?: string;
  objectId?: string;
  projectId?: string;
};

const ImageCarousel = ({
  images,
  onImageClick,
}: {
  images: ImageItem[];
  onImageClick?: (objectId: string, projectId: string) => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleImageClick = () => {
    const currentImage = images[currentImageIndex];
    if (onImageClick && currentImage.objectId && currentImage.projectId) {
      onImageClick(currentImage.objectId, currentImage.projectId);
    }
  };

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex] || images[0];
  if (!currentImage) {
    return null;
  }

  return (
    <Card className="p-4 mb-4">
      <div className="relative h-48 overflow-hidden rounded-xl">
        <img
          src={currentImage.src}
          alt={currentImage.title}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            onImageClick && currentImage.objectId && currentImage.projectId
              ? "cursor-pointer hover:opacity-90"
              : ""
          }`}
          onClick={handleImageClick}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="text-white text-sm font-medium">{currentImage.title}</div>
          {currentImage.type && (
            <div className="text-white/80 text-xs">{currentImage.type}</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const SectionTitle = ({ icon: Icon, title }: { icon?: React.ComponentType<any>; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon className="w-4 h-4 md:w-5 md:h-5" />}
    <h3 className="text-base md:text-lg font-semibold tracking-tight">{title}</h3>
  </div>
);

const Btn = ({
  children,
  onClick,
  outline,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  outline?: boolean;
  type?: "button" | "submit" | "reset";
}) => {
  const isAstro = typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "astro";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base transition ${
        outline
          ? "border hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800"
          : isAstro
            ? "astro-btn"
            : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
};

const IconBtn = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e?: any) => void;
  children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    className="p-2 rounded-xl border bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition"
  >
    {children}
  </button>
);

const ObjectThumbnail = ({
  objectId,
  displayImage,
  onUpload,
  onDelete,
}: {
  objectId: string;
  displayImage: string | null;
  onUpload: (id: string, url: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setIsUploading(true);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxDim = 800;
            let w = img.width,
              h = img.height;
            if (w > h) {
              if (w > maxDim) {
                h *= maxDim / w;
                w = maxDim;
              }
            } else {
              if (h > maxDim) {
                w *= maxDim / h;
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            ctx?.drawImage(img, 0, 0, w, h);
            resolve();
          };
        });
        const url = canvas.toDataURL("image/jpeg", 0.8);
        await onUpload(objectId, url);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const f = e.target.files?.[0];
    if (!f) return;
    setIsUploading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const maxDim = 800;
          let w = img.width,
            h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h *= maxDim / w;
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w *= maxDim / h;
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          ctx?.drawImage(img, 0, 0, w, h);
          resolve();
        };
      });
      const url = canvas.toDataURL("image/jpeg", 0.8);
      await onUpload(objectId, url);
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  if (displayImage) {
    return (
      <div className="relative group flex-shrink-0">
        <img
          src={displayImage}
          alt={objectId}
          className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
          <label
            className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition"
            onClick={(e) => e.stopPropagation()}
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(objectId);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => e.stopPropagation()}
      className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        id={`object-image-${objectId}`}
      />
      <label
        htmlFor={`object-image-${objectId}`}
        className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
      >
        <Upload className="w-5 h-5 text-slate-400 mb-1" />
        <span className="text-xs text-slate-500">{isDragging ? "Soltar" : "Subir"}</span>
      </label>
    </div>
  );
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) => {
  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-2 md:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[90vh] overflow-y-auto my-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-semibold">{title}</h3>
            <IconBtn title="Cerrar" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconBtn>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm text-slate-600 dark:text-slate-400">{children}</span>
);

const FAB = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    aria-label={title}
    title={title}
    onClick={onClick}
    className="fixed md:hidden bottom-5 right-5 rounded-full p-4 shadow-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
  >
    <Plus className="w-6 h-6" />
  </button>
);

// Weather card for individual locations
const WeatherCard = ({ 
  location, 
  getWeatherIcon, 
  getWeatherDescription 
}: { 
  location: { name: string; coords: string }; 
  getWeatherIcon: (code: number) => string;
  getWeatherDescription: (code: number) => string;
}) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const coords = location.coords.split(',').map(c => c.trim());
        if (coords.length !== 2) {
          setLoading(false);
          return;
        }
        const [lat, lon] = coords;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=3`
        );
        if (!response.ok) throw new Error('Weather API error');
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error("Error loading weather data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [location.coords]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <CloudSun className="w-8 h-8 mx-auto mb-2" />
          <p>No se pudo cargar el pronóstico</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-500/20">
          <CloudSun className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">{location.name}</h3>
          <p className="text-xs text-muted-foreground mb-3">📍 {location.coords}</p>
          
          {/* Current Weather */}
          <div className="mb-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ahora</p>
                <p className="text-3xl font-bold">
                  {Math.round(weather.current_weather.temperature)}°C
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getWeatherDescription(weather.current_weather.weathercode)}
                </p>
              </div>
              <div className="text-5xl">
                {getWeatherIcon(weather.current_weather.weathercode)}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Viento: {Math.round(weather.current_weather.windspeed)} km/h
            </div>
          </div>

          {/* 3-day Forecast */}
          <div className="grid grid-cols-3 gap-2">
            {weather.daily.time.slice(0, 3).map((date: string, i: number) => {
              const dayName = i === 0 ? "Hoy" : i === 1 ? "Mañana" : new Date(date).toLocaleDateString('es-ES', { weekday: 'short' });
              return (
                <div key={i} className="text-center p-2 rounded-xl bg-muted/50">
                  <p className="text-xs font-medium mb-1">{dayName}</p>
                  <div className="text-xl mb-1">
                    {getWeatherIcon(weather.daily.weathercode[i])}
                  </div>
                  <p className="text-xs font-semibold">
                    {Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    💧 {weather.daily.precipitation_probability_max[i]}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

function FObject({ onSubmit }: { onSubmit: (obj: any) => void }) {
  const [id, setId] = useState("");
  const [commonName, setCommonName] = useState("");
  const [constellation, setConstellation] = useState("");
  const [type, setType] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Precargar datos al montar el componente
  useEffect(() => {
    loadCelestialObjects().catch(err => {
      console.error('Error precargando objetos celestes:', err);
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setId(value);
    
    if (value.trim().length > 0) {
      try {
        const results = await searchCelestialObjects(value.trim());
        console.log("Resultados de búsqueda:", results);
        if (results.length > 0) {
          console.log("Primer resultado:", results[0]);
        }
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching celestial objects:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (obj: any) => {
    console.log("Objeto seleccionado:", obj);
    console.log("nameEsp:", obj.nameEsp);
    console.log("constellation:", obj.constellation);
    console.log("objectType:", obj.objectType);
    
    setId(obj.code || "");
    setCommonName(obj.nameEsp || "");
    setConstellation(obj.constellation || "");
    setType(obj.objectType || "");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const x = id.trim();
    if (!x) return;

    let imageData = undefined;
    if (imageFile) {
      try {
        imageData = await compressImage(imageFile);
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
      }
    }

    onSubmit({ id: x, commonName, constellation, type, image: imageData });
  };

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label className="grid gap-1 relative">
        <Label>Código oficial</Label>
        <input 
          ref={inputRef}
          value={id} 
          onChange={handleIdChange}
          onKeyDown={handleKeyDown}
          className={INPUT_CLS} 
          placeholder="M31, NGC1234, etc." 
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {suggestions.map((obj, idx) => (
              <button
                key={obj.code}
                type="button"
                onClick={() => handleSelectSuggestion(obj)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${
                  idx === selectedIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <div className="font-semibold text-sm">{obj.code}</div>
                {obj.nameEsp && <div className="text-xs text-slate-600 dark:text-slate-400">{obj.nameEsp}</div>}
                {obj.constellation && <div className="text-xs text-slate-500 dark:text-slate-500">{obj.constellation} · {obj.objectType}</div>}
              </button>
            ))}
          </div>
        )}
      </label>
      <label className="grid gap-1">
        <Label>Nombre común</Label>
        <input
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
          className={INPUT_CLS}
          placeholder="Galaxia de Andrómeda"
        />
      </label>
      <label className="grid gap-1">
        <Label>Constelación</Label>
        <input
          value={constellation}
          onChange={(e) => setConstellation(e.target.value)}
          className={INPUT_CLS}
          placeholder="Andrómeda"
        />
      </label>
      <label className="grid gap-1">
        <Label>Tipo de objeto</Label>
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={INPUT_CLS}
          placeholder="Galaxia espiral, Nebulosa de emisión, etc."
        />
      </label>

      <div className="grid gap-1">
        <Label>Imagen del objeto (opcional)</Label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {imageFile ? imageFile.name : "Arrastra una imagen aquí o haz clic para seleccionar"}
          </p>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="object-image-upload" />
          <label
            htmlFor="object-image-upload"
            className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Seleccionar archivo
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-2">
        <Btn
          outline
          onClick={() => {
            setId("");
            setCommonName("");
            setConstellation("");
            setType("");
            setImageFile(null);
          }}
        >
          Limpiar
        </Btn>
        <Btn type="submit">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> Crear objeto
        </Btn>
      </div>
    </form>
  );
}

function FProject({
  onSubmit,
  cameras = [],
  telescopes = [],
  locations = [],
  mainLocation,
  guideTelescope,
  guideCamera,
  mount,
  initialData,
}: {
  onSubmit: (proj: any) => void;
  cameras?: string[];
  telescopes?: { name: string; focalLength: string }[];
  locations?: { name: string; coords: string }[];
  mainLocation?: { name: string; coords: string };
  guideTelescope?: { name: string; focalLength: string };
  guideCamera?: string;
  mount?: string;
  initialData?: {
    name?: string;
    description?: string;
    projectType?: string;
    numPanels?: number;
    goalHours?: number;
    location?: string;
    encuadreImage?: string;
  };
}) {
  // Determinar localización inicial
  const initialLocation = initialData?.location || mainLocation?.name || locations[0]?.name || "";
  const initialCoords = mainLocation?.coords || locations[0]?.coords || "";
  
  const [name, setName] = useState(initialData?.name || "Proyecto Trevinca");
  const [description, setDescription] = useState(initialData?.description || "Campaña principal");
  const [location, setLocation] = useState(initialLocation);
  const [googleCoords, setGoogleCoords] = useState(initialCoords);
  const [projectType, setProjectType] = useState(initialData?.projectType || "ONP");
  const [filters, setFilters] = useState<string[]>(["UV/IR", "HA/OIII", "No Filter"]);
  const [newFilter, setNewFilter] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedTelescope, setSelectedTelescope] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [customCamera, setCustomCamera] = useState("");
  const [customTelescope, setCustomTelescope] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customGoogleCoords, setCustomGoogleCoords] = useState("");
  const [showCustomCamera, setShowCustomCamera] = useState(false);
  const [showCustomTelescope, setShowCustomTelescope] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [numPanels, setNumPanels] = useState(initialData?.numPanels || 1);
  const [goalHours, setGoalHours] = useState<number | "">(initialData?.goalHours || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGuideCamera, setSelectedGuideCamera] = useState(guideCamera || "");
  const [selectedGuideTelescope, setSelectedGuideTelescope] = useState(guideTelescope?.name || "");
  const [selectedMount, setSelectedMount] = useState(mount || "");
  const [encuadreImage] = useState(initialData?.encuadreImage || null);

  const handleAddFilter = () => {
    if (newFilter.trim() && !filters.includes(newFilter.trim())) {
      setFilters([...filters, newFilter.trim()]);
      setNewFilter("");
    }
  };

  const handleRemoveFilter = (filter: string) => {
    setFilters(filters.filter((f) => f !== filter));
  };

  const handleSubmit = () => {
    const finalCamera = selectedCamera === "Otro" ? customCamera.trim() : selectedCamera;
    const finalTelescope = selectedTelescope === "Otro" ? customTelescope.trim() : selectedTelescope;
    const finalLocation = selectedLocation === "Otro" ? customLocation.trim() : location;
    const finalGoogleCoords = selectedLocation === "Otro" ? customGoogleCoords.trim() : googleCoords;
    onSubmit({
      name,
      description,
      location: finalLocation,
      googleCoords: finalGoogleCoords,
      projectType,
      filters,
      equipment: {
        camera: finalCamera,
        telescope: finalTelescope,
        guideCamera: selectedGuideCamera,
        guideTelescope: selectedGuideTelescope,
        mount: selectedMount,
      },
      numPanels,
      goalHours: goalHours === "" ? undefined : goalHours,
      startDate: new Date(startDate).toISOString(),
      encuadreImage,
    });
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <label className="grid gap-1">
        <Label>Nombre del proyecto</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT_CLS}
          placeholder="Proyecto Trevinca"
        />
      </label>

      <div className="grid gap-3">
        <Label>Localización</Label>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <Label>Lugar</Label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setShowCustomLocation(e.target.value === "Otro");
                if (e.target.value !== "Otro") {
                  // Buscar primero en mainLocation
                  if (mainLocation && e.target.value === mainLocation.name) {
                    setLocation(mainLocation.name);
                    setGoogleCoords(mainLocation.coords);
                  } else {
                    const selectedLoc = locations.find((l) => l.name === e.target.value);
                    if (selectedLoc) {
                      setLocation(selectedLoc.name);
                      setGoogleCoords(selectedLoc.coords);
                    }
                  }
                }
              }}
              className={INPUT_CLS}
            >
              <option value="">Seleccionar localización...</option>
              {mainLocation && mainLocation.name.trim() && (
                <option key={mainLocation.name} value={mainLocation.name}>
                  {mainLocation.name} (Principal)
                </option>
              )}
              {locations
                .filter((l) => l.name.trim() && l.name !== mainLocation?.name)
                .map((loc) => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              <option value="Otro">+ Añadir nueva localización</option>
            </select>
            {showCustomLocation && (
              <div className="grid gap-2 mt-2">
                <input
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Nombre de la nueva localización..."
                />
                <input
                  value={customGoogleCoords}
                  onChange={(e) => setCustomGoogleCoords(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Coordenadas Google (Ej: 37.0644, -3.1706)"
                />
              </div>
            )}
          </label>
        </div>
      </div>

      <label className="grid gap-1">
        <Label>Descripción</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT_CLS}
          rows={2}
          placeholder="Campaña principal"
        />
      </label>

      <label className="grid gap-1">
        <Label>Tipo de proyecto</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="projectType"
              value="ONP"
              checked={projectType === "ONP"}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">ONP (One-Night Project)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="projectType"
              value="SNP"
              checked={projectType === "SNP"}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">SNP (Several-Nights Project)</span>
          </label>
        </div>
      </label>

      <div className="grid gap-2">
        <Label>Filtros</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {filters.map((filter) => (
            <span
              key={filter}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm"
            >
              {filter}
              <button
                type="button"
                onClick={() => handleRemoveFilter(filter)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFilter();
              }
            }}
            className={`${INPUT_CLS} flex-1`}
            placeholder="IR/UV, HA/OIII, Otro..."
          />
          <button
            type="button"
            onClick={handleAddFilter}
            className="px-3 md:px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <Label>Equipo</Label>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <Label>Cámara</Label>
            <select
              value={selectedCamera}
              onChange={(e) => {
                setSelectedCamera(e.target.value);
                setShowCustomCamera(e.target.value === "Otro");
              }}
              className={INPUT_CLS}
            >
              <option value="">Seleccionar cámara...</option>
              {cameras
                .filter((c) => c.trim())
                .map((camera) => (
                  <option key={camera} value={camera}>
                    {camera}
                  </option>
                ))}
              <option value="Otro">+ Añadir nueva cámara</option>
            </select>
            {showCustomCamera && (
              <input
                value={customCamera}
                onChange={(e) => setCustomCamera(e.target.value)}
                className={`${INPUT_CLS} mt-2`}
                placeholder="Nombre de la nueva cámara..."
              />
            )}
          </label>

          <label className="grid gap-1">
            <Label>Telescopio</Label>
            <select
              value={selectedTelescope}
              onChange={(e) => {
                setSelectedTelescope(e.target.value);
                setShowCustomTelescope(e.target.value === "Otro");
              }}
              className={INPUT_CLS}
            >
              <option value="">Seleccionar telescopio...</option>
              {telescopes
                .filter((t) => t.name.trim())
                .map((telescope) => (
                  <option key={telescope.name} value={telescope.name}>
                    {telescope.name} {telescope.focalLength ? `(${telescope.focalLength}mm)` : ""}
                  </option>
                ))}
              <option value="Otro">+ Añadir nuevo telescopio</option>
            </select>
            {showCustomTelescope && (
              <input
                value={customTelescope}
                onChange={(e) => setCustomTelescope(e.target.value)}
                className={`${INPUT_CLS} mt-2`}
                placeholder="Nombre del nuevo telescopio..."
              />
            )}
          </label>

          <label className="grid gap-1">
            <Label>Telescopio guía</Label>
            <input
              value={selectedGuideTelescope}
              onChange={(e) => setSelectedGuideTelescope(e.target.value)}
              className={INPUT_CLS}
              placeholder="Opcional"
            />
          </label>

          <label className="grid gap-1">
            <Label>Cámara guía</Label>
            <input
              value={selectedGuideCamera}
              onChange={(e) => setSelectedGuideCamera(e.target.value)}
              className={INPUT_CLS}
              placeholder="Opcional"
            />
          </label>

          <label className="grid gap-1">
            <Label>Montura</Label>
            <input
              value={selectedMount}
              onChange={(e) => setSelectedMount(e.target.value)}
              className={INPUT_CLS}
              placeholder="Opcional"
            />
          </label>
        </div>
      </div>

      <label className="grid gap-1">
        <Label>Número de Paneles/Teselas</Label>
        <input
          type="number"
          min={1}
          max={10}
          value={numPanels}
          onChange={(e) => setNumPanels(parseInt(e.target.value) || 1)}
          className={INPUT_CLS}
        />
      </label>

      <label className="grid gap-1">
        <Label>{numPanels > 1 ? "Objetivo horas (por panel)" : "Objetivo horas"}</Label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={goalHours}
          onChange={(e) => setGoalHours(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={INPUT_CLS}
          placeholder="Ej: 10"
        />
        <p className="text-xs text-slate-500">
          {numPanels > 1
            ? "Horas objetivo por cada panel (opcional)"
            : "Horas totales objetivo para el proyecto (opcional)"}
        </p>
      </label>

      <label className="grid gap-1">
        <Label>Fecha de inicio del proyecto</Label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLS} />
      </label>

      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn type="submit">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> Crear proyecto
        </Btn>
      </div>
    </form>
  );
}

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const calculateVisibleMonths = (orto: string, ocaso: string): number => {
  if (!orto || !ocaso) return 0;
  const ortoNum = parseInt(orto);
  const ocasoNum = parseInt(ocaso);
  
  if (ortoNum <= ocasoNum) {
    return ocasoNum - ortoNum + 1;
  } else {
    // Crosses year boundary (e.g., orto=10, ocaso=3 means Oct-Mar)
    return (12 - ortoNum + 1) + ocasoNum;
  }
};

function FPlanned({
  onSubmit,
  locations = [],
  mainLocation,
  existingObjects = [],
}: {
  onSubmit: (planned: any) => void;
  locations?: { name: string; coords: string }[];
  mainLocation?: { name: string; coords: string };
  existingObjects?: any[];
}) {
  const [objectId, setObjectId] = useState("");
  const [objectName, setObjectName] = useState("");
  const [constellation, setConstellation] = useState("");
  const [objectType, setObjectType] = useState("");
  const [orto, setOrto] = useState("");
  const [ocaso, setOcaso] = useState("");
  const [isCircumpolar, setIsCircumpolar] = useState(false);
  const [signal, setSignal] = useState("");
  const [teselas, setTeselas] = useState("");
  const [cenit, setCenit] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [encuadreImage, setEncuadreImage] = useState<string | null>(null);
  const [objectImage, setObjectImage] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Check if the object already exists in the Objects section
  const existingObject = useMemo(() => {
    if (!objectId.trim()) return null;
    return existingObjects.find(
      (o) => o.id.toLowerCase() === objectId.trim().toLowerCase()
    );
  }, [objectId, existingObjects]);

  // Auto-fill fields from existing object when it's found
  useEffect(() => {
    if (existingObject) {
      // Auto-fill common name, constellation, and type from existing object
      if (existingObject.commonName) setObjectName(existingObject.commonName);
      if (existingObject.constellation) setConstellation(existingObject.constellation);
      if (existingObject.type) setObjectType(existingObject.type);
    }
  }, [existingObject]);

  // Get the image from the existing object (if any)
  const existingObjectImage = useMemo(() => {
    if (!existingObject) return null;
    return existingObject.image || 
      (existingObject.projects?.[existingObject.projects.length - 1] as any)?.finalImage || 
      null;
  }, [existingObject]);

  // Determine if the object image uploader should be disabled
  const isObjectImageDisabled = !!existingObject;

  const SIGNAL_OPTIONS = ["RGB", "LRGB", "HA", "OIII", "HA + OIII", "RGB+HA/OIII"];
  const TESELAS_OPTIONS = ["Sí", "No"];
  const MONTH_OPTIONS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const PRIORIDAD_OPTIONS = ["Alta", "Media", "Baja"];

  const visibleMonths = useMemo(() => {
    if (isCircumpolar) return 12;
    return calculateVisibleMonths(orto, ocaso);
  }, [orto, ocaso, isCircumpolar]);

  useEffect(() => {
    loadCelestialObjects().catch(err => {
      console.error('Error precargando objetos celestes:', err);
    });
  }, []);

  const handleIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setObjectId(value);
    
    if (value.trim().length > 0) {
      try {
        const results = await searchCelestialObjects(value.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching celestial objects:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (obj: any) => {
    setObjectId(obj.code || "");
    setObjectName(obj.nameEsp || "");
    setConstellation(obj.constellation || "");
    setObjectType(obj.objectType || "");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    // Clear custom object image when selecting a new suggestion
    setObjectImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEncuadreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDim) { h *= maxDim / w; w = maxDim; }
        } else {
          if (h > maxDim) { w *= maxDim / h; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        resolve();
      };
    });
    setEncuadreImage(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleObjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isObjectImageDisabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDim) { h *= maxDim / w; w = maxDim; }
        } else {
          if (h > maxDim) { w *= maxDim / h; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        resolve();
      };
    });
    setObjectImage(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleCircumpolarToggle = () => {
    setIsCircumpolar(!isCircumpolar);
    if (!isCircumpolar) {
      setOrto("");
      setOcaso("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectId.trim()) {
      alert("Debes proporcionar un código de objeto.");
      return;
    }
    
    // Use existing object image if available, otherwise use custom uploaded image
    const finalObjectImage = isObjectImageDisabled ? existingObjectImage : objectImage;
    
    onSubmit({
      id: uid("plan"),
      objectId: objectId.trim(),
      objectName,
      constellation,
      objectType,
      orto: isCircumpolar ? null : orto,
      ocaso: isCircumpolar ? null : ocaso,
      isCircumpolar,
      visibleMonths: isCircumpolar ? 12 : visibleMonths,
      signal,
      teselas,
      cenit,
      prioridad,
      encuadreImage,
      objectImage: finalObjectImage,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-1 relative">
        <Label>Código del objeto</Label>
        <input 
          ref={inputRef}
          value={objectId} 
          onChange={handleIdChange}
          onKeyDown={handleKeyDown}
          className={INPUT_CLS} 
          placeholder="M31, NGC1234, etc." 
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {suggestions.map((obj, idx) => (
              <button
                key={obj.code}
                type="button"
                onClick={() => handleSelectSuggestion(obj)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${
                  idx === selectedIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <div className="font-semibold text-sm">{obj.code}</div>
                {obj.nameEsp && <div className="text-xs text-slate-600 dark:text-slate-400">{obj.nameEsp}</div>}
                {obj.constellation && <div className="text-xs text-slate-500 dark:text-slate-500">{obj.constellation} · {obj.objectType}</div>}
              </button>
            ))}
          </div>
        )}
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Nombre común</Label>
          <input
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            className={INPUT_CLS}
            placeholder="Galaxia de Andrómeda"
          />
        </label>
        <label className="grid gap-1">
          <Label>Constelación</Label>
          <input
            value={constellation}
            onChange={(e) => setConstellation(e.target.value)}
            className={INPUT_CLS}
            placeholder="Andrómeda"
          />
        </label>
      </div>

      <label className="grid gap-1">
        <Label>Tipo de objeto</Label>
        <input
          value={objectType}
          onChange={(e) => setObjectType(e.target.value)}
          className={INPUT_CLS}
          placeholder="Galaxia espiral, Nebulosa, etc."
        />
      </label>

      <label className="grid gap-1">
        <Label>Señal</Label>
        <select
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {SIGNAL_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Teselas</Label>
        <select
          value={teselas}
          onChange={(e) => setTeselas(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {TESELAS_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Cenit</Label>
        <select
          value={cenit}
          onChange={(e) => setCenit(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Prioridad</Label>
        <select
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {PRIORIDAD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {/* Circumpolar toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCircumpolarToggle}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            isCircumpolar
              ? "bg-blue-600 text-white"
              : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Circumpolar
        </button>
        {isCircumpolar && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Visible todo el año
          </span>
        )}
      </div>

      {/* Orto, Ocaso, Visible fields */}
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="grid gap-1">
          <Label>Orto</Label>
          <select
            value={orto}
            onChange={(e) => setOrto(e.target.value)}
            disabled={isCircumpolar}
            className={`${INPUT_CLS} ${isCircumpolar ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <option value="">Seleccionar...</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <Label>Ocaso</Label>
          <select
            value={ocaso}
            onChange={(e) => setOcaso(e.target.value)}
            disabled={isCircumpolar}
            className={`${INPUT_CLS} ${isCircumpolar ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <option value="">Seleccionar...</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <Label>Visible</Label>
          <div
            className={`${INPUT_CLS} flex items-center ${isCircumpolar ? "opacity-50 bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <span className="font-medium">
              {isCircumpolar ? "12 meses" : visibleMonths > 0 ? `${visibleMonths} ${visibleMonths === 1 ? "mes" : "meses"}` : "–"}
            </span>
          </div>
        </label>
      </div>

      {/* Object Image Uploader */}
      <div className="grid gap-1">
        <Label>
          Imagen del objeto
          {isObjectImageDisabled && (
            <span className="ml-2 text-xs text-muted-foreground">(Usando imagen del objeto existente)</span>
          )}
        </Label>
        {isObjectImageDisabled ? (
          // Show existing object image (disabled state)
          <div className="relative">
            {existingObjectImage ? (
              <img
                src={existingObjectImage}
                alt="Imagen del objeto existente"
                className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-700 opacity-70"
              />
            ) : (
              <div className="border-2 border-dashed rounded-xl p-6 text-center border-slate-300 dark:border-slate-700 opacity-50 bg-muted/30">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-muted-foreground">
                  El objeto existe pero no tiene imagen
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-muted/20 rounded-xl flex items-center justify-center">
              <span className="bg-background/90 px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground">
                Objeto existente en la sección de Objetos
              </span>
            </div>
          </div>
        ) : objectImage ? (
          // Show uploaded custom image
          <div className="relative">
            <img
              src={objectImage}
              alt="Imagen del objeto"
              className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setObjectImage(null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload area for new objects
          <div className="border-2 border-dashed rounded-xl p-6 text-center border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Sube una imagen del objeto para mostrar en la planificación
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleObjectImageUpload}
              className="hidden"
              id="object-image-upload"
            />
            <label
              htmlFor="object-image-upload"
              className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Seleccionar archivo
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-1">
        <Label>Imagen de encuadre (opcional)</Label>
        {encuadreImage ? (
          <div className="relative">
            <img
              src={encuadreImage}
              alt="Encuadre"
              className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setEncuadreImage(null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-6 text-center border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600">
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Arrastra una imagen o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleEncuadreUpload}
              className="hidden"
              id="encuadre-upload"
            />
            <label
              htmlFor="encuadre-upload"
              className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Seleccionar archivo
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn type="submit">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> Crear planificación
        </Btn>
      </div>
    </form>
  );
}

function FPlannedEdit({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: any;
  onSubmit: (planned: any) => void;
  onCancel: () => void;
}) {
  const [objectId, setObjectId] = useState(initial.objectId || "");
  const [objectName, setObjectName] = useState(initial.objectName || "");
  const [constellation, setConstellation] = useState(initial.constellation || "");
  const [objectType, setObjectType] = useState(initial.objectType || "");
  const [orto, setOrto] = useState(initial.orto || "");
  const [ocaso, setOcaso] = useState(initial.ocaso || "");
  const [isCircumpolar, setIsCircumpolar] = useState(initial.isCircumpolar || false);
  const [signal, setSignal] = useState(initial.signal || "");
  const [teselas, setTeselas] = useState(initial.teselas || "");
  const [cenit, setCenit] = useState(initial.cenit || "");
  const [prioridad, setPrioridad] = useState(initial.prioridad || "");
  const [encuadreImage, setEncuadreImage] = useState<string | null>(initial.encuadreImage || null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const SIGNAL_OPTIONS = ["RGB", "LRGB", "HA", "OIII", "HA + OIII", "RGB+HA/OIII"];
  const TESELAS_OPTIONS = ["Sí", "No"];
  const MONTH_OPTIONS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const PRIORIDAD_OPTIONS = ["Alta", "Media", "Baja"];

  const visibleMonths = useMemo(() => {
    if (isCircumpolar) return 12;
    return calculateVisibleMonths(orto, ocaso);
  }, [orto, ocaso, isCircumpolar]);

  const handleIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setObjectId(value);
    
    if (value.trim().length > 0) {
      try {
        const results = await searchCelestialObjects(value.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching celestial objects:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (obj: any) => {
    setObjectId(obj.code || "");
    setObjectName(obj.nameEsp || "");
    setConstellation(obj.constellation || "");
    setObjectType(obj.objectType || "");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEncuadreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDim) { h *= maxDim / w; w = maxDim; }
        } else {
          if (h > maxDim) { w *= maxDim / h; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        resolve();
      };
    });
    setEncuadreImage(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleCircumpolarToggle = () => {
    setIsCircumpolar(!isCircumpolar);
    if (!isCircumpolar) {
      setOrto("");
      setOcaso("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectId.trim()) {
      alert("Debes proporcionar un código de objeto.");
      return;
    }
    
    onSubmit({
      ...initial,
      objectId: objectId.trim(),
      objectName,
      constellation,
      objectType,
      orto: isCircumpolar ? null : orto,
      ocaso: isCircumpolar ? null : ocaso,
      isCircumpolar,
      visibleMonths: isCircumpolar ? 12 : visibleMonths,
      signal,
      teselas,
      cenit,
      prioridad,
      encuadreImage,
    });
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-1 relative">
        <Label>Código del objeto</Label>
        <input 
          ref={inputRef}
          value={objectId} 
          onChange={handleIdChange}
          onKeyDown={handleKeyDown}
          className={INPUT_CLS} 
          placeholder="M31, NGC1234, etc." 
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {suggestions.map((obj, idx) => (
              <button
                key={obj.code}
                type="button"
                onClick={() => handleSelectSuggestion(obj)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${
                  idx === selectedIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <div className="font-semibold text-sm">{obj.code}</div>
                {obj.nameEsp && <div className="text-xs text-slate-600 dark:text-slate-400">{obj.nameEsp}</div>}
                {obj.constellation && <div className="text-xs text-slate-500 dark:text-slate-500">{obj.constellation} · {obj.objectType}</div>}
              </button>
            ))}
          </div>
        )}
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Nombre común</Label>
          <input
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            className={INPUT_CLS}
            placeholder="Galaxia de Andrómeda"
          />
        </label>
        <label className="grid gap-1">
          <Label>Constelación</Label>
          <input
            value={constellation}
            onChange={(e) => setConstellation(e.target.value)}
            className={INPUT_CLS}
            placeholder="Andrómeda"
          />
        </label>
      </div>

      <label className="grid gap-1">
        <Label>Tipo de objeto</Label>
        <input
          value={objectType}
          onChange={(e) => setObjectType(e.target.value)}
          className={INPUT_CLS}
          placeholder="Galaxia espiral, Nebulosa, etc."
        />
      </label>

      <label className="grid gap-1">
        <Label>Señal</Label>
        <select
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {SIGNAL_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Teselas</Label>
        <select
          value={teselas}
          onChange={(e) => setTeselas(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {TESELAS_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Cenit</Label>
        <select
          value={cenit}
          onChange={(e) => setCenit(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <Label>Prioridad</Label>
        <select
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
          {PRIORIDAD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {/* Circumpolar toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCircumpolarToggle}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            isCircumpolar
              ? "bg-blue-600 text-white"
              : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Circumpolar
        </button>
        {isCircumpolar && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Visible todo el año
          </span>
        )}
      </div>

      {/* Orto, Ocaso, Visible fields */}
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="grid gap-1">
          <Label>Orto</Label>
          <select
            value={orto}
            onChange={(e) => setOrto(e.target.value)}
            disabled={isCircumpolar}
            className={`${INPUT_CLS} ${isCircumpolar ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <option value="">Seleccionar...</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <Label>Ocaso</Label>
          <select
            value={ocaso}
            onChange={(e) => setOcaso(e.target.value)}
            disabled={isCircumpolar}
            className={`${INPUT_CLS} ${isCircumpolar ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <option value="">Seleccionar...</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <Label>Visible</Label>
          <div
            className={`${INPUT_CLS} flex items-center ${isCircumpolar ? "opacity-50 bg-slate-200 dark:bg-slate-800" : ""}`}
          >
            <span className="font-medium">
              {isCircumpolar ? "12 meses" : visibleMonths > 0 ? `${visibleMonths} ${visibleMonths === 1 ? "mes" : "meses"}` : "–"}
            </span>
          </div>
        </label>
      </div>

      <div className="grid gap-1">
        <Label>Imagen de encuadre (opcional)</Label>
        {encuadreImage ? (
          <div className="relative">
            <img
              src={encuadreImage}
              alt="Encuadre"
              className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setEncuadreImage(null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-6 text-center border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600">
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Arrastra una imagen o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleEncuadreUpload}
              className="hidden"
              id="encuadre-edit-upload"
            />
            <label
              htmlFor="encuadre-edit-upload"
              className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Seleccionar archivo
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn outline onClick={onCancel}>
          Cancelar
        </Btn>
        <Btn type="submit">
          <Pencil className="w-3 h-3 md:w-4 md:h-4" /> Guardar cambios
        </Btn>
      </div>
    </form>
  );
}

function FSession({
  onSubmit,
  initial,
  availableFilters,
  cameras,
  projectEquipment,
  telescopes,
}: {
  onSubmit: (session: any) => void;
  initial?: any;
  availableFilters: string[];
  cameras: string[];
  projectEquipment?: any;
  telescopes?: { name: string; focalLength: string }[];
}) {
  const init = initial || {};

  // Todos los useState deben ir primero
  const [date, setDate] = useState(init.date || new Date().toISOString().slice(0, 10));
  const [lights, setLights] = useState(init.lights ?? 60);
  const [exposureSec, setExposureSec] = useState(init.exposureSec ?? 180);
  const [filter, setFilter] = useState(init.filter || availableFilters[0] || "RGB");
  const [customFilter, setCustomFilter] = useState("");
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const [camera, setCamera] = useState(init.camera || projectEquipment?.camera || "");
  const [telescope, setTelescope] = useState(init.telescope || "");
  const [customTelescope, setCustomTelescope] = useState("");
  const [showCustomTelescope, setShowCustomTelescope] = useState(false);
  const [snrR, setSnrR] = useState(init.snrR ?? "");
  const [snrG, setSnrG] = useState(init.snrG ?? "");
  const [snrB, setSnrB] = useState(init.snrB ?? "");
  const [acceptedLights, setAcceptedLights] = useState(init.acceptedLights ?? "");
  const [rejectedLights, setRejectedLights] = useState(init.rejectedLights ?? "");
  const [notes, setNotes] = useState(init.notes ?? "");
  const [fitsAnalysis, setFitsAnalysis] = useState<FitsAnalysisResult | null>(init.fitsAnalysis || null);
  const [phd2Analysis, setPhd2Analysis] = useState<PHD2AnalysisResult | null>(init.phd2Analysis || null);
  // Filtros predeterminados como en FProject
  const predefinedFilters = ["UV/IR", "HA/OIII", "No Filter"];

  // Si no hay valor inicial, preseleccionar el telescopio del proyecto
  useEffect(() => {
    if (!init.telescope && projectEquipment?.telescope) {
      setTelescope(projectEquipment.telescope);
    }
  }, []);

  // Calcular fase lunar basado en la fecha seleccionada
  const moonPhase = useMemo(() => {
    if (!date) return null;
    return calculateMoonPhase(date);
  }, [date]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();

        const sessionData = {
          date,
          lights: num(lights),
          exposureSec: num(exposureSec, 1),
          filter,
          camera,
          telescope,
          snrR: snrR !== "" ? parseFloat(snrR) : undefined,
          snrG: snrG !== "" ? parseFloat(snrG) : undefined,
          snrB: snrB !== "" ? parseFloat(snrB) : undefined,
          acceptedLights: acceptedLights !== "" ? parseInt(acceptedLights) : undefined,
          rejectedLights: rejectedLights !== "" ? parseInt(rejectedLights) : undefined,
          notes,
          moonPhase: moonPhase ? formatMoonPhase(moonPhase) : undefined,
          fitsAnalysis: fitsAnalysis || undefined,
          phd2Analysis: phd2Analysis || undefined,
        };

        onSubmit(sessionData);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Fecha</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <Label>Filtro</Label>
          <div className="grid gap-2">
            {/* Botones de filtros predeterminados */}
            <div className="flex flex-wrap gap-2">
              {predefinedFilters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setShowCustomFilter(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    filter === f
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Select para otros filtros */}
            <select
              value={!predefinedFilters.includes(filter) && !showCustomFilter ? filter : ""}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setShowCustomFilter(true);
                  setCustomFilter("");
                } else if (e.target.value) {
                  setFilter(e.target.value);
                  setShowCustomFilter(false);
                }
              }}
              className={INPUT_CLS}
            >
              <option value="">Seleccionar otro filtro...</option>
              {availableFilters
                .filter((f) => !predefinedFilters.includes(f))
                .map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              <option value="custom">+ Añadir filtro personalizado</option>
            </select>

            {/* Input para filtro personalizado */}
            {showCustomFilter && (
              <input
                value={customFilter}
                onChange={(e) => {
                  setCustomFilter(e.target.value);
                  setFilter(e.target.value);
                }}
                className={INPUT_CLS}
                placeholder="Nombre del nuevo filtro..."
                autoFocus
              />
            )}
          </div>
        </label>
        <label className="grid gap-1">
          <Label>Lights</Label>
          <input
            type="number"
            value={lights}
            min={0}
            onChange={(e) => setLights(parseInt(e.target.value || "0", 10))}
            className={INPUT_CLS}
          />
        </label>
        <label className="grid gap-1">
          <Label>Exposición por light (s)</Label>
          <input
            type="number"
            value={exposureSec}
            min={1}
            onChange={(e) => setExposureSec(parseInt(e.target.value || "0", 10))}
            className={INPUT_CLS}
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Cámara</Label>
          <select value={camera} onChange={(e) => setCamera(e.target.value)} className={INPUT_CLS}>
            <option value="">Seleccionar cámara</option>
            {cameras
              .filter((c) => c.trim() !== "")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </label>

        <label className="grid gap-1">
          <Label>Telescopio</Label>
          <select
            value={telescope}
            onChange={(e) => {
              setTelescope(e.target.value);
              setShowCustomTelescope(e.target.value === "Otro");
            }}
            className={INPUT_CLS}
          >
            <option value="">Seleccionar telescopio...</option>
            {telescopes
              ?.filter((t) => t.name.trim())
              .map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} {t.focalLength ? `(${t.focalLength}mm)` : ""}
                </option>
              ))}
            <option value="Otro">+ Añadir nuevo telescopio</option>
          </select>
          {showCustomTelescope && (
            <input
              value={customTelescope}
              onChange={(e) => {
                setCustomTelescope(e.target.value);
                setTelescope(e.target.value);
              }}
              className={`${INPUT_CLS} mt-2`}
              placeholder="Nombre del nuevo telescopio..."
            />
          )}
        </label>
      </div>

      {moonPhase && (
        <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Fase lunar:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatMoonPhase(moonPhase)} ({moonPhase.illumination}% iluminación)
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <label className="grid gap-1">
          <Label>SNR - R</Label>
          <input value={snrR} onChange={(e) => setSnrR(e.target.value)} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <Label>SNR - G</Label>
          <input value={snrG} onChange={(e) => setSnrG(e.target.value)} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <Label>SNR - B</Label>
          <input value={snrB} onChange={(e) => setSnrB(e.target.value)} className={INPUT_CLS} />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Lights aceptados</Label>
          <input
            type="number"
            value={acceptedLights}
            min={0}
            onChange={(e) => setAcceptedLights(e.target.value)}
            className={INPUT_CLS}
            placeholder="Opcional"
          />
        </label>
        <label className="grid gap-1">
          <Label>Lights rechazados</Label>
          <input
            type="number"
            value={rejectedLights}
            min={0}
            onChange={(e) => setRejectedLights(e.target.value)}
            className={INPUT_CLS}
            placeholder="Opcional"
          />
        </label>
      </div>

      {/* FITS Analyzer - before notes */}
      <FitsAnalyzer value={fitsAnalysis} onChange={setFitsAnalysis} />

      {/* PHD2 Analyzer - after FITS */}
      <PHD2Analyzer value={phd2Analysis} onChange={setPhd2Analysis} />

      <label className="grid gap-1">
        <Label>Notas</Label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={INPUT_CLS} />
      </label>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2">
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Tiempo total: <b>{hh(lights * exposureSec)}</b>
        </div>
        <Btn type="submit">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> Guardar
        </Btn>
      </div>
    </form>
  );
}

// Automated session form - auto-fills from FITS metadata
function FSessionAutomated({
  onSubmit,
  availableFilters,
  cameras,
  projectEquipment,
  telescopes,
}: {
  onSubmit: (session: any) => void;
  availableFilters: string[];
  cameras: string[];
  projectEquipment?: any;
  telescopes?: { name: string; focalLength: string }[];
}) {
  // State for FITS and PHD2 analysis (at the top)
  const [fitsAnalysis, setFitsAnalysis] = useState<FitsAnalysisResult | null>(null);
  const [phd2Analysis, setPhd2Analysis] = useState<PHD2AnalysisResult | null>(null);
  
  // State for form fields
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lights, setLights] = useState(0);
  const [exposureSec, setExposureSec] = useState(180);
  const [filter, setFilter] = useState(availableFilters[0] || "RGB");
  const [fitsFilter, setFitsFilter] = useState<string | null>(null);
  const [useAppFilter, setUseAppFilter] = useState(true);
  const [camera, setCamera] = useState(projectEquipment?.camera || "");
  const [fitsCamera, setFitsCamera] = useState<string | null>(null);
  const [useAppCamera, setUseAppCamera] = useState(true);
  const [telescope, setTelescope] = useState("");
  const [fitsTelescope, setFitsTelescope] = useState<string | null>(null);
  const [useAppTelescope, setUseAppTelescope] = useState(true);
  const [customTelescope, setCustomTelescope] = useState("");
  const [showCustomTelescope, setShowCustomTelescope] = useState(false);
  const [snrR, setSnrR] = useState("");
  const [snrG, setSnrG] = useState("");
  const [snrB, setSnrB] = useState("");
  const [acceptedLights, setAcceptedLights] = useState("");
  const [rejectedLights, setRejectedLights] = useState("");
  const [notes, setNotes] = useState("");
  
  // Manual weather/environment fields (when FITS doesn't have data)
  const [manualMpsas, setManualMpsas] = useState("");
  const [manualAmbientTemp, setManualAmbientTemp] = useState("");
  const [manualHumidity, setManualHumidity] = useState("");
  const [manualWind, setManualWind] = useState("");
  
  const predefinedFilters = ["UV/IR", "HA/OIII", "No Filter"];

  // Auto-fill form when FITS analysis changes
  useEffect(() => {
    if (fitsAnalysis?.extractedInfo) {
      const info = fitsAnalysis.extractedInfo;
      
      // Auto-fill lights count
      if (info.totalLights > 0) {
        setLights(info.totalLights);
      }
      
      // Auto-fill exposure
      if (info.exposure) {
        setExposureSec(Math.round(info.exposure));
      }
      
      // Store FITS filter for user choice
      if (info.filters.length > 0) {
        setFitsFilter(info.filters[0]);
      }
      
      // Auto-fill date from FITS (use first available date)
      if (info.dates.length > 0) {
        setDate(info.dates[0]);
      }
      
      // Store FITS telescope for user choice
      if (info.telescopes && info.telescopes.length > 0) {
        setFitsTelescope(info.telescopes[0]);
      }
      
      // Store FITS camera for user choice
      if (info.cameras && info.cameras.length > 0) {
        setFitsCamera(info.cameras[0]);
      }
    }
  }, [fitsAnalysis]);

  // Pre-select telescope from project equipment
  useEffect(() => {
    if (projectEquipment?.telescope) {
      setTelescope(projectEquipment.telescope);
    }
  }, [projectEquipment?.telescope]);

  // Calculate moon phase
  const moonPhase = useMemo(() => {
    if (!date) return null;
    return calculateMoonPhase(date);
  }, [date]);

  // Get available dates from FITS
  const availableDates = fitsAnalysis?.extractedInfo?.dates || [];

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();

        // Build fitsAnalysis with manual data if needed
        let finalFitsAnalysis = fitsAnalysis;
        
        // If no FITS analysis but user entered manual data, create a synthetic one
        const hasManualData = manualMpsas || manualAmbientTemp || manualHumidity || manualWind;
        if (hasManualData && !fitsAnalysis) {
          finalFitsAnalysis = {
            files: [],
            averages: {
              mpsas: manualMpsas ? parseFloat(manualMpsas) : undefined,
              ambientTemp: manualAmbientTemp ? parseFloat(manualAmbientTemp) : undefined,
              humidity: manualHumidity ? parseFloat(manualHumidity) : undefined,
              wind: manualWind ? parseFloat(manualWind) : undefined,
            },
          };
        } else if (hasManualData && fitsAnalysis) {
          // Merge manual data with FITS data (manual overrides missing values)
          finalFitsAnalysis = {
            ...fitsAnalysis,
            averages: {
              ...fitsAnalysis.averages,
              mpsas: fitsAnalysis.averages.mpsas ?? (manualMpsas ? parseFloat(manualMpsas) : undefined),
              ambientTemp: fitsAnalysis.averages.ambientTemp ?? (manualAmbientTemp ? parseFloat(manualAmbientTemp) : undefined),
              humidity: fitsAnalysis.averages.humidity ?? (manualHumidity ? parseFloat(manualHumidity) : undefined),
              wind: fitsAnalysis.averages.wind ?? (manualWind ? parseFloat(manualWind) : undefined),
            },
          };
        }

        const sessionData = {
          date,
          lights: num(lights),
          exposureSec: num(exposureSec, 1),
          filter: useAppFilter ? filter : fitsFilter || filter,
          camera: useAppCamera ? camera : fitsCamera || camera,
          telescope: useAppTelescope ? telescope : fitsTelescope || telescope,
          snrR: snrR !== "" ? parseFloat(snrR) : undefined,
          snrG: snrG !== "" ? parseFloat(snrG) : undefined,
          snrB: snrB !== "" ? parseFloat(snrB) : undefined,
          acceptedLights: acceptedLights !== "" ? parseInt(acceptedLights) : undefined,
          rejectedLights: rejectedLights !== "" ? parseInt(rejectedLights) : undefined,
          notes,
          moonPhase: moonPhase ? formatMoonPhase(moonPhase) : undefined,
          fitsAnalysis: finalFitsAnalysis || undefined,
          phd2Analysis: phd2Analysis || undefined,
        };

        onSubmit(sessionData);
      }}
    >
      {/* FITS and PHD2 Analyzers at the top */}
      <div className="space-y-4 pb-4 border-b border-border">
        <FitsAnalyzer value={fitsAnalysis} onChange={setFitsAnalysis} />
        <PHD2Analyzer value={phd2Analysis} onChange={setPhd2Analysis} />
      </div>

      {/* Auto-filled fields notification */}
      {fitsAnalysis?.extractedInfo && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ Datos extraídos automáticamente: {fitsAnalysis.extractedInfo.totalLights} lights
            {fitsAnalysis.extractedInfo.exposure && `, ${fitsAnalysis.extractedInfo.exposure}s exposición`}
            {fitsAnalysis.extractedInfo.filters.length > 0 && `, filtro: ${fitsAnalysis.extractedInfo.filters.join(", ")}`}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Date selector with FITS dates */}
        <label className="grid gap-1">
          <Label>Fecha</Label>
          {availableDates.length > 1 ? (
            <div className="space-y-2">
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLS}
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Sesión nocturna: selecciona la fecha que prefieras
              </p>
            </div>
          ) : (
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className={INPUT_CLS} 
            />
          )}
        </label>

        {/* Filter selector with FITS option */}
        <label className="grid gap-1">
          <Label>Filtro</Label>
          <div className="grid gap-2">
            {fitsFilter && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-muted-foreground">Filtro del FITS:</span>
                <span className="text-sm font-medium">{fitsFilter}</span>
                <label className="flex items-center gap-1 ml-auto text-xs">
                  <input
                    type="checkbox"
                    checked={!useAppFilter}
                    onChange={(e) => setUseAppFilter(!e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Usar este
                </label>
              </div>
            )}
            
            {useAppFilter && (
              <>
                <div className="flex flex-wrap gap-2">
                  {predefinedFilters.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "border border-input hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <select
                  value={!predefinedFilters.includes(filter) ? filter : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFilter(e.target.value);
                    }
                  }}
                  className={INPUT_CLS}
                >
                  <option value="">Seleccionar otro filtro...</option>
                  {availableFilters
                    .filter((f) => !predefinedFilters.includes(f))
                    .map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                </select>
              </>
            )}
          </div>
        </label>

        <label className="grid gap-1">
          <Label>Lights</Label>
          <input
            type="number"
            value={lights}
            min={0}
            onChange={(e) => setLights(parseInt(e.target.value || "0", 10))}
            className={INPUT_CLS}
          />
        </label>
        <label className="grid gap-1">
          <Label>Exposición por light (s)</Label>
          <input
            type="number"
            value={exposureSec}
            min={1}
            onChange={(e) => setExposureSec(parseInt(e.target.value || "0", 10))}
            className={INPUT_CLS}
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Cámara</Label>
          <div className="grid gap-2">
            {fitsCamera && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-muted-foreground">Cámara del FITS:</span>
                <span className="text-sm font-medium truncate">{fitsCamera}</span>
                <label className="flex items-center gap-1 ml-auto text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={!useAppCamera}
                    onChange={(e) => setUseAppCamera(!e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Usar este
                </label>
              </div>
            )}
            {useAppCamera && (
              <select value={camera} onChange={(e) => setCamera(e.target.value)} className={INPUT_CLS}>
                <option value="">Seleccionar cámara</option>
                {cameras
                  .filter((c) => c.trim() !== "")
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
            )}
          </div>
        </label>

        <label className="grid gap-1">
          <Label>Telescopio</Label>
          <div className="grid gap-2">
            {fitsTelescope && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-muted-foreground">Telescopio del FITS:</span>
                <span className="text-sm font-medium truncate">{fitsTelescope}</span>
                <label className="flex items-center gap-1 ml-auto text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={!useAppTelescope}
                    onChange={(e) => setUseAppTelescope(!e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Usar este
                </label>
              </div>
            )}
            {useAppTelescope && (
              <>
                <select
                  value={telescope}
                  onChange={(e) => {
                    setTelescope(e.target.value);
                    setShowCustomTelescope(e.target.value === "Otro");
                  }}
                  className={INPUT_CLS}
                >
                  <option value="">Seleccionar telescopio...</option>
                  {telescopes
                    ?.filter((t) => t.name.trim())
                    .map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} {t.focalLength ? `(${t.focalLength}mm)` : ""}
                      </option>
                    ))}
                  <option value="Otro">+ Añadir nuevo telescopio</option>
                </select>
                {showCustomTelescope && (
                  <input
                    value={customTelescope}
                    onChange={(e) => {
                      setCustomTelescope(e.target.value);
                      setTelescope(e.target.value);
                    }}
                    className={`${INPUT_CLS} mt-2`}
                    placeholder="Nombre del nuevo telescopio..."
                  />
                )}
              </>
            )}
          </div>
        </label>
      </div>

      {moonPhase && (
        <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fase lunar:</span>
            <span className="font-medium">
              {formatMoonPhase(moonPhase)} ({moonPhase.illumination}% iluminación)
            </span>
          </div>
        </div>
      )}

      {/* SNR fields - left blank for manual entry */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <label className="grid gap-1">
          <Label>SNR - R</Label>
          <input value={snrR} onChange={(e) => setSnrR(e.target.value)} className={INPUT_CLS} placeholder="Opcional" />
        </label>
        <label className="grid gap-1">
          <Label>SNR - G</Label>
          <input value={snrG} onChange={(e) => setSnrG(e.target.value)} className={INPUT_CLS} placeholder="Opcional" />
        </label>
        <label className="grid gap-1">
          <Label>SNR - B</Label>
          <input value={snrB} onChange={(e) => setSnrB(e.target.value)} className={INPUT_CLS} placeholder="Opcional" />
        </label>
      </div>

      {/* Accepted/Rejected lights - left blank */}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Lights aceptados</Label>
          <input
            type="number"
            value={acceptedLights}
            min={0}
            onChange={(e) => setAcceptedLights(e.target.value)}
            className={INPUT_CLS}
            placeholder="Opcional"
          />
        </label>
        <label className="grid gap-1">
          <Label>Lights rechazados</Label>
          <input
            type="number"
            value={rejectedLights}
            min={0}
            onChange={(e) => setRejectedLights(e.target.value)}
            className={INPUT_CLS}
            placeholder="Opcional"
          />
        </label>
      </div>

      {/* Manual environment data fields - shown when FITS lacks this data */}
      {(!fitsAnalysis?.averages?.mpsas || !fitsAnalysis?.averages?.ambientTemp || !fitsAnalysis?.averages?.humidity || !fitsAnalysis?.averages?.wind) && (
        <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Thermometer className="w-4 h-4" />
            <span>Datos ambientales manuales</span>
            <span className="text-xs font-normal">(opcional, si FITS no los tiene)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {!fitsAnalysis?.averages?.mpsas && (
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">MPSAS</span>
                <input
                  type="number"
                  step="0.01"
                  value={manualMpsas}
                  onChange={(e) => setManualMpsas(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="21.5"
                />
              </label>
            )}
            {!fitsAnalysis?.averages?.ambientTemp && (
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Temp. °C</span>
                <input
                  type="number"
                  step="0.1"
                  value={manualAmbientTemp}
                  onChange={(e) => setManualAmbientTemp(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="15"
                />
              </label>
            )}
            {!fitsAnalysis?.averages?.humidity && (
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Humedad %</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={manualHumidity}
                  onChange={(e) => setManualHumidity(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="60"
                />
              </label>
            )}
            {!fitsAnalysis?.averages?.wind && (
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Viento m/s</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualWind}
                  onChange={(e) => setManualWind(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="5"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Notes - left blank */}
      <label className="grid gap-1">
        <Label>Notas</Label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={INPUT_CLS} placeholder="Opcional..." />
      </label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Tiempo total: <b>{hh(lights * exposureSec)}</b>
        </div>
        <Btn type="submit">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> Guardar
        </Btn>
      </div>
    </form>
  );
}

const compressImage = async (file: File, maxDimension = 1920, quality = 0.88): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensionar si es necesario
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del canvas"));
          return;
        }

        // Dibujar la imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir a WebP (o JPEG si WebP no está disponible)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Error al comprimir la imagen"));
              return;
            }
            const blobReader = new FileReader();
            blobReader.onloadend = () => resolve(String(blobReader.result));
            blobReader.onerror = reject;
            blobReader.readAsDataURL(blob);
          },
          "image/webp",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SNRChart = ({ sessions }: { sessions: any[] }) => {
  const [xAxisMode, setXAxisMode] = useState<"lights" | "hours">("lights");
  // Sort chronologically (oldest first = left side of chart)
  const sortedSessions = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  // Build data with cumulative values for ALL sessions
  const data = useMemo(() => {
    return sortedSessions.map((x, i, a) => {
      const snrValue = mean(x);
      return {
        lightTotal: cumulativeLights(a, i),
        hoursTotal: cumulativeHours(a, i),
        snr: Number.isFinite(snrValue) ? snrValue : null,
      };
    });
  }, [sortedSessions]);
  const first = useMemo(() => {
    return data.length > 0 ? data[0].snr : 0;
  }, [data]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle icon={Star} title="SNR (media) vs acumulado" />
        <RadioGroup value={xAxisMode} onValueChange={(v) => setXAxisMode(v as "lights" | "hours")} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lights" id="snr-lights" />
            <label htmlFor="snr-lights" className="text-sm cursor-pointer">Lights</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hours" id="snr-hours" />
            <label htmlFor="snr-hours" className="text-sm cursor-pointer">Horas</label>
          </div>
        </RadioGroup>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey={xAxisMode === "lights" ? "lightTotal" : "hoursTotal"} 
            tickMargin={8} 
            stroke="#ffffff"
            tickFormatter={(v) => xAxisMode === "hours" ? v.toFixed(1) : v}
          />
          <YAxis
            tickMargin={8}
            domain={[Math.max(first - 1, 0), "dataMax"]}
            tickFormatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
            stroke="#ffffff"
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Line type="monotone" dataKey="snr" stroke="#3b82f6" strokeWidth={3} dot />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const SNRRGBChart = ({ sessions }: { sessions: any[] }) => {
  const [xAxisMode, setXAxisMode] = useState<"lights" | "hours">("lights");
  // Sort chronologically (oldest first = left side of chart)
  const sortedSessions = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  // Build data with cumulative values for ALL sessions
  const data = useMemo(() => {
    return sortedSessions.map((x, i, a) => ({
      lightTotal: cumulativeLights(a, i),
      hoursTotal: cumulativeHours(a, i),
      r: Number.isFinite(x.snrR) ? x.snrR : null,
      g: Number.isFinite(x.snrG) ? x.snrG : null,
      b: Number.isFinite(x.snrB) ? x.snrB : null,
    }));
  }, [sortedSessions]);
  const firstMin = useMemo(() => {
    if (data.length === 0) return 0;
    const first = data[0];
    const v = [first.r, first.g, first.b].filter((x): x is number => Number.isFinite(x));
    return v.length ? Math.min(...v) : 0;
  }, [data]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle icon={Star} title="SNR por canal (R/G/B) vs acumulado" />
        <RadioGroup value={xAxisMode} onValueChange={(v) => setXAxisMode(v as "lights" | "hours")} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lights" id="snr-rgb-lights" />
            <label htmlFor="snr-rgb-lights" className="text-sm cursor-pointer">Lights</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hours" id="snr-rgb-hours" />
            <label htmlFor="snr-rgb-hours" className="text-sm cursor-pointer">Horas</label>
          </div>
        </RadioGroup>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey={xAxisMode === "lights" ? "lightTotal" : "hoursTotal"} 
            tickMargin={8} 
            stroke="#ffffff"
            tickFormatter={(v) => xAxisMode === "hours" ? v.toFixed(1) : v}
          />
          <YAxis
            tickMargin={8}
            domain={[Math.max(firstMin - 1, 0), "dataMax"]}
            tickFormatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
            stroke="#ffffff"
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Line type="monotone" dataKey="r" stroke="#ef4444" strokeWidth={2.5} dot name="R" />
          <Line type="monotone" dataKey="g" stroke="#22c55e" strokeWidth={2.5} dot name="G" />
          <Line type="monotone" dataKey="b" stroke="#3b82f6" strokeWidth={2.5} dot name="B" />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const MoonIlluminationChart = ({ sessions }: { sessions: any[] }) => {
  const s = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  const data = useMemo(
    () =>
      s.map((x, index) => {
        const moonData = calculateMoonPhase(x.date);
        return {
          session: index + 1,
          illumination: moonData.illumination,
        };
      }),
    [s],
  );

  const avgIllumination = useMemo(() => {
    const validValues = data.map((d) => d.illumination);
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
  }, [data]);

  const yDomain = useMemo(() => {
    if (!data.length) return [0, 100];
    const illuminations = data.map((d) => d.illumination);
    const min = Math.floor(Math.min(...illuminations));
    const max = Math.ceil(Math.max(...illuminations));
    return [min, max];
  }, [data]);

  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Moon} title="Iluminación lunar por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        % medio de iluminación:{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{avgIllumination.toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} domain={yDomain} stroke="#ffffff" tickFormatter={(value) => `${value}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v) => `${v}%`}
          />
          <Line
            type="monotone"
            dataKey="illumination"
            stroke="#fbbf24"
            strokeWidth={3}
            dot={{ fill: "#fbbf24", r: 4 }}
            name="Iluminación lunar"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const AcceptedRejectedChart = ({ sessions, dateFormat = "DD/MM/YYYY" }: { sessions: any[]; dateFormat?: string }) => {
  const d = useMemo(
    () =>
      sessions
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(
          (s) =>
            (s.acceptedLights !== undefined && s.acceptedLights !== null) ||
            (s.rejectedLights !== undefined && s.rejectedLights !== null),
        )
        .map((s, i) => ({
          sesion: i + 1,
          date: s.date,
          dateFormatted: formatDateDisplay(s.date, dateFormat),
          aceptados: s.acceptedLights || 0,
          rechazados: s.rejectedLights || 0,
        })),
    [sessions, dateFormat],
  );
  if (!d.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Star} title="Lights aceptados vs rechazados" />
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={d} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="sesion" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} stroke="#ffffff" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
          <Legend />
          <Bar dataKey="aceptados" fill="#22c55e" name="Aceptados" />
          <Bar dataKey="rechazados" fill="#ef4444" name="Rechazados" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

const ExposureChart = ({ sessions, dateFormat = "DD/MM/YYYY" }: { sessions: any[]; dateFormat?: string }) => {
  const d = useMemo(
    () =>
      sessions
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s, i) => ({ 
          sesion: i + 1, 
          date: s.date, 
          dateFormatted: formatDateDisplay(s.date, dateFormat),
          horas: (s.lights * s.exposureSec) / 3600 
        })),
    [sessions, dateFormat],
  );
  if (!d.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Calendar} title="Exposición por noche (horas)" />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="sesion"
            tickMargin={8}
            stroke="#ffffff"
            label={{ value: "Número de sesión", position: "insideBottom", offset: -10, fill: "#ffffff" }}
          />
          <YAxis tickMargin={8} stroke="#ffffff" />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            labelFormatter={(value) => `Sesión ${value}`}
            formatter={(value, name, props) => [value, `${props.payload.dateFormatted}`]}
          />
          <Bar dataKey="horas" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

// FITS MPSAS Chart - Sky Quality per Session
const FitsMpsasChart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.fitsAnalysis?.averages?.mpsas !== undefined)
      .map((s, i) => ({
        session: i + 1,
        mpsas: s.fitsAnalysis.averages.mpsas,
        date: s.date,
      }));
  }, [sessions]);

  const avgMpsas = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.mpsas, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Gauge} title="Calidad del cielo (MPSAS) por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        MPSAS medio: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgMpsas.toFixed(2)}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis domain={['auto', 'auto']} tickMargin={8} stroke="#ffffff" />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(2)} mag/arcsec²`, "MPSAS"]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Line
            type="monotone"
            dataKey="mpsas"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ fill: "#8b5cf6", r: 4 }}
            name="MPSAS"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// FITS Temperature Chart - Ambient & Sky Temperature per Session
const FitsTemperatureChart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.fitsAnalysis?.averages?.ambientTemp !== undefined || s.fitsAnalysis?.averages?.skyTemp !== undefined)
      .map((s, i) => ({
        session: i + 1,
        ambientTemp: s.fitsAnalysis?.averages?.ambientTemp,
        skyTemp: s.fitsAnalysis?.averages?.skyTemp,
        date: s.date,
      }));
  }, [sessions]);

  const avgAmbient = useMemo(() => {
    const filtered = data.filter((d) => d.ambientTemp !== undefined);
    if (!filtered.length) return null;
    return filtered.reduce((a, b) => a + (b.ambientTemp || 0), 0) / filtered.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Thermometer} title="Temperatura por sesión" />
      {avgAmbient !== null && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          Temp. ambiente media: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgAmbient.toFixed(1)}°C</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} stroke="#ffffff" tickFormatter={(value) => `${value}°C`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(1)}°C`]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ambientTemp"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ fill: "#f59e0b", r: 4 }}
            name="Ambiente"
          />
          <Line
            type="monotone"
            dataKey="skyTemp"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", r: 4 }}
            name="Cielo"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// FITS Humidity Chart - Humidity per Session
const FitsHumidityChart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.fitsAnalysis?.averages?.humidity !== undefined)
      .map((s, i) => ({
        session: i + 1,
        humidity: s.fitsAnalysis.averages.humidity,
        date: s.date,
      }));
  }, [sessions]);

  const avgHumidity = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.humidity, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Droplets} title="Humedad por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Humedad media: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgHumidity.toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis domain={[0, 100]} tickMargin={8} stroke="#ffffff" tickFormatter={(value) => `${value}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, "Humedad"]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Line
            type="monotone"
            dataKey="humidity"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ fill: "#06b6d4", r: 4 }}
            name="Humedad"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// FITS Wind Chart - Wind Speed per Session
const FitsWindChart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.fitsAnalysis?.averages?.wind !== undefined)
      .map((s, i) => ({
        session: i + 1,
        wind: s.fitsAnalysis.averages.wind,
        windGust: s.fitsAnalysis?.averages?.windGust,
        date: s.date,
      }));
  }, [sessions]);

  const avgWind = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.wind, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Wind} title="Viento por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Viento medio: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgWind.toFixed(1)} m/s</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} stroke="#ffffff" tickFormatter={(value) => `${value} m/s`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(1)} m/s`]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="wind"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: "#22c55e", r: 4 }}
            name="Viento"
          />
          <Line
            type="monotone"
            dataKey="windGust"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: "#ef4444", r: 4 }}
            name="Racha"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// FITS Focus Position Chart - Focus Position per Session
const FitsFocusChart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.fitsAnalysis?.averages?.focusPos !== undefined)
      .map((s, i) => ({
        session: i + 1,
        focusPos: s.fitsAnalysis.averages.focusPos,
        date: s.date,
      }));
  }, [sessions]);

  const avgFocus = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.focusPos, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Target} title="Posición de enfoque por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Enfoque medio: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgFocus.toFixed(0)}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis domain={['auto', 'auto']} tickMargin={8} stroke="#ffffff" />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [v.toFixed(0), "Posición"]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Line
            type="monotone"
            dataKey="focusPos"
            stroke="#ec4899"
            strokeWidth={3}
            dot={{ fill: "#ec4899", r: 4 }}
            name="Enfoque"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// PHD2 RMS Chart - Average RMS per Session
// PHD2 P50 Chart (Median RMS per session)
const PHD2P50Chart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.phd2Analysis?.medianRms !== undefined)
      .map((s, i) => ({
        session: i + 1,
        p50: s.phd2Analysis.medianRms,
        date: s.date,
      }));
  }, [sessions]);

  const avgP50 = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.p50, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Target} title="RMS típico (P50) por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Promedio P50: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgP50.toFixed(2)} arcsec</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis domain={[0, 'auto']} tickMargin={8} stroke="#ffffff" tickFormatter={(value) => `${value}"`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(2)} arcsec`, "P50 (Mediana)"]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: "#22c55e", r: 4 }}
            name="P50"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// PHD2 P68 Chart (≈1σ stability per session)
const PHD2P68Chart = ({ sessions }: { sessions: any[] }) => {
  const data = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((s) => s.phd2Analysis?.p68Rms !== undefined)
      .map((s, i) => ({
        session: i + 1,
        p68: s.phd2Analysis.p68Rms,
        date: s.date,
      }));
  }, [sessions]);

  const avgP68 = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + b.p68, 0) / data.length;
  }, [data]);

  if (!data.length) return null;

  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Target} title="P68 (≈1σ) por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Promedio P68: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgP68.toFixed(2)} arcsec</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="session" tickMargin={8} stroke="#ffffff" />
          <YAxis domain={[0, 'auto']} tickMargin={8} stroke="#ffffff" tickFormatter={(value) => `${value}"`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            formatter={(v: number) => [`${v.toFixed(2)} arcsec`, "P68 (≈1σ)"]}
            labelFormatter={(value) => `Sesión ${value}`}
          />
          <Line
            type="monotone"
            dataKey="p68"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", r: 4 }}
            name="P68"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

type TabType = {
  id: string;
  name: string;
  preset?: string;
  custom?: boolean;
  filters?: any[];
};

// ImageCard component moved outside to avoid hooks issues
const ImageCard = ({
  title,
  keyName,
  proj,
  upImgs,
  rating,
  onRatingChange,
  theme,
  onImageClick,
}: {
  title: string;
  keyName: string;
  proj: any;
  upImgs: (patch: any) => Promise<void> | void;
  rating?: number;
  onRatingChange?: (rating: number) => void;
  theme: string;
  onImageClick?: (src: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentRating, setCurrentRating] = useState(rating || 0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setIsUploading(true);
      try {
        const url = await compressImage(file);
        await upImgs({ [keyName]: url });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIsUploading(true);
    try {
      const url = await compressImage(f);
      await upImgs({ [keyName]: url });
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  const handleRatingClick = (newRating: number) => {
    const finalRating = newRating === currentRating ? 0 : newRating;
    setCurrentRating(finalRating);
    if (onRatingChange) {
      onRatingChange(finalRating);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle title={title} />
        {onRatingChange && (
          <div className="flex gap-1">
            {[1, 2, 3].map((star) => (
              <button
                key={star}
                onClick={() => handleRatingClick(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= currentRating
                      ? theme === "astro"
                        ? "fill-blue-400 text-blue-400"
                        : "fill-yellow-400 text-yellow-400"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {proj?.images?.[keyName] ? (
        <div className="space-y-3">
          <img
            src={proj.images[keyName]}
            alt={title}
            className="w-full rounded-xl border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              if (onImageClick) {
                onImageClick(proj.images[keyName]);
              }
            }}
          />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
              <Upload className="w-4 h-4" /> Reemplazar
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            <Btn outline onClick={() => upImgs({ [keyName]: undefined })}>
              <Trash2 className="w-4 h-4" /> Quitar
            </Btn>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`grid place-items-center h-52 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            id={`image-upload-${keyName}`}
          />
          <label
            htmlFor={`image-upload-${keyName}`}
            className="text-center text-sm text-slate-500 cursor-pointer w-full h-full flex flex-col items-center justify-center"
          >
            <Upload className="w-5 h-5 mx-auto mb-1" />
            <p className="mb-1">{isDragging ? "Suelta la imagen aquí" : "Arrastra una imagen aquí o haz clic"}</p>
            <p className="text-xs text-slate-400">para subir {title.toLowerCase()}</p>
          </label>
        </div>
      )}
    </Card>
  );
};

// Función para generar el reporte PDF con la configuración seleccionada
const generatePDFReport = async (
  obj: any,
  proj: any,
  config: any,
  dateFormat: string,
  toast: any
) => {
  // HTML escape function for XSS prevention
  const escapeHtml = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const stringVal = String(str);
    const div = document.createElement('div');
    div.textContent = stringVal;
    return div.innerHTML;
  };

  const { nights, totalLights, totalSeconds, currentHours, goalHours, diffDays, mainLocation } = (() => {
    const dates: string[] = proj.sessions.map((s: any) => s.date).filter((d: string) => d);
    const uniqueDates = Array.from(new Set(dates));
    const nights = uniqueDates.length;
    const totalLights = proj.sessions.reduce((sum: number, s: any) => sum + num(s.lights), 0);
    const totalSeconds = proj.sessions.reduce(
      (sum: number, s: any) => sum + num(s.lights) * num(s.exposureSec),
      0
    );
    const currentHours = (totalSeconds / 3600).toFixed(2);
    const goalHours = num(proj.goal, 0);
    const sortedDates = dates.map(d => new Date(toISODate(d))).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    const diffDays = sortedDates.length >= 2
      ? Math.floor((sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const locationCounts: Record<string, number> = {};
    proj.sessions.forEach((s: any) => {
      if (s.location) locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
    });
    const mainLocationName = Object.entries(locationCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || null;
    
    // Buscar la sesión con la localización principal para obtener sus detalles completos
    const mainLocationSession = mainLocationName 
      ? proj.sessions.find((s: any) => s.location === mainLocationName)
      : null;
    
    const mainLocation = mainLocationSession ? {
      name: mainLocationSession.location || '',
      coords: mainLocationSession.googleCoords || '',
      bortle: mainLocationSession.bortle || ''
    } : null;

    return { nights, totalLights, totalSeconds, currentHours, goalHours, diffDays, mainLocation };
  })();

  const mean = (s: any) => {
    const vals = [s.snrR, s.snrG, s.snrB].filter((v: any) => v != null);
    return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
  };

  const cumulativeLights = (sessions: any[], idx: number) =>
    sessions.slice(0, idx + 1).reduce((sum: number, s: any) => sum + num(s.lights), 0);

  const cumulativeHours = (sessions: any[], idx: number) =>
    sessions.slice(0, idx + 1).reduce((sum: number, s: any) => sum + num(s.lights) * num(s.exposureSec), 0) / 3600;

  const filterHours: Record<string, number> = {};
  proj.sessions.forEach((s: any) => {
    if (s.filter) {
      const seconds = (s.lights || 0) * (s.exposureSec || 0);
      filterHours[s.filter] = (filterHours[s.filter] || 0) + seconds;
    }
  });
  
  const chartDataByDate = proj.sessions.map((s: any, i: number) => ({
    date: formatDateDisplay(s.date, dateFormat),
    lights: cumulativeLights(proj.sessions, i),
    hours: cumulativeHours(proj.sessions, i),
  }));

  const filterData = Object.entries(filterHours).map(([filter, seconds]) => ({
    filter,
    hours: (seconds / 3600).toFixed(1),
  }));
  
  const statusLabels = {
    active: "Activo",
    paused: "Pausado",
    completed: "Completado",
  };

  const finalImage = (proj as any).finalImage || obj.image || '';

  const sessionDataWithSNR = proj.sessions.map((s: any, i: number) => {
    const snrMean = mean(s);
    return {
      date: formatDateDisplay(s.date, dateFormat),
      lights: s.lights || 0,
      filter: s.filter || '-',
      sessionHours: ((s.lights || 0) * (s.exposureSec || 0)) / 3600,
      cumulativeHours: cumulativeHours(proj.sessions, i),
      snrMean: snrMean !== null ? snrMean.toFixed(2) : '-',
      snrR: s.snrR != null ? s.snrR.toFixed(2) : '-',
      snrG: s.snrG != null ? s.snrG.toFixed(2) : '-',
      snrB: s.snrB != null ? s.snrB.toFixed(2) : '-',
    };
  });

  const snrMeanData = sessionDataWithSNR.map(s => ({
    date: s.date,
    snr: s.snrMean !== '-' ? parseFloat(s.snrMean) : null,
  })).filter(d => d.snr !== null);

  const snrRGBData = sessionDataWithSNR.map(s => ({
    date: s.date,
    snrR: s.snrR !== '-' ? parseFloat(s.snrR) : null,
    snrG: s.snrG !== '-' ? parseFloat(s.snrG) : null,
    snrB: s.snrB !== '-' ? parseFloat(s.snrB) : null,
  })).filter(d => d.snrR !== null || d.snrG !== null || d.snrB !== null);

  const avgSNR = snrMeanData.length > 0 
    ? (snrMeanData.reduce((sum, d) => sum + (d.snr || 0), 0) / snrMeanData.length).toFixed(2)
    : '-';
  
  const totalSessions = proj.sessions.length;
  const telescope = (proj as any).telescope || '-';
  const camera = (proj as any).camera || '-';

  // Determinar tema
  const isDark = config.theme === 'dark';
  const theme = {
    background: isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    containerBg: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    textPrimary: isDark ? '#e2e8f0' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textAccent: isDark ? '#60a5fa' : '#3b82f6',
    cardBg: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.8)',
    border: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
    borderAccent: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.4)',
    gridColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
  };

  // Construir HTML del reporte
  let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;">
  <title>Reporte - ${escapeHtml(obj.id)} - ${escapeHtml(proj.name)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${theme.background}; color: ${theme.textPrimary}; padding: 2rem; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; background: ${theme.containerBg}; border-radius: 1rem; padding: 2rem; box-shadow: 0 20px 60px rgba(0, 0, 0, ${isDark ? '0.5' : '0.1'}); }
    .header { display: flex; justify-content: space-between; align-items: start; padding: 2rem 0; border-bottom: 2px solid ${theme.border}; margin-bottom: 2rem; }
    .header-left { flex: 1; }
    .header-left h1 { font-size: 2.5rem; font-weight: 700; color: ${theme.textAccent}; margin-bottom: 0.5rem; word-spacing: 0.25em; }
    .header-left p { color: ${theme.textSecondary}; font-size: 1.1rem; word-spacing: 0.15em; }
    .header-right { flex-shrink: 0; margin-left: 2rem; }
    .header-right img { max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 0.75rem; border: 2px solid ${theme.borderAccent}; background: ${isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)'}; }
    .section { margin: 2rem 0; page-break-inside: avoid; break-inside: avoid; }
    .section-title { font-size: 1.5rem; font-weight: 600; color: ${theme.textAccent}; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid ${theme.borderAccent}; word-spacing: 0.25em; letter-spacing: 0.01em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .card { background: ${theme.cardBg}; border: 1px solid ${theme.border}; border-radius: 0.75rem; padding: 1.25rem; page-break-inside: avoid; break-inside: avoid; }
    .card-label { font-size: 0.8rem; color: ${theme.textSecondary}; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; word-spacing: 0.15em; }
    .card-value { font-size: 1.4rem; font-weight: 700; color: ${theme.textPrimary}; }
    .card-subtitle { font-size: 0.8rem; color: ${theme.textSecondary}; margin-top: 0.25rem; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }
    .status-active { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
    .status-paused { background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }
    .status-completed { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .chart-container { background: ${theme.cardBg}; border: 1px solid ${theme.border}; border-radius: 0.75rem; padding: 1.5rem; margin-top: 1rem; height: 320px; page-break-inside: avoid; break-inside: avoid; }
    .chart-section { page-break-inside: avoid; break-inside: avoid; }
    canvas { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; background: ${theme.cardBg}; border-radius: 0.75rem; overflow: hidden; margin-top: 1rem; font-size: 0.85rem; }
    thead { background: ${isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.8)'}; }
    th { padding: 0.75rem 0.5rem; text-align: left; font-weight: 600; color: ${theme.textAccent}; font-size: 0.8rem; word-spacing: 0.15em; }
    td { padding: 0.75rem 0.5rem; border-top: 1px solid ${theme.border}; color: ${theme.textPrimary}; }
    .footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid ${theme.border}; text-align: center; color: ${theme.textSecondary}; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container" id="report">
    <div class="header">
      <div class="header-left">
        <h1>Reporte del Proyecto</h1>
        <p>${escapeHtml(obj.id)} ${obj.commonName ? `- ${escapeHtml(obj.commonName)}` : ''}</p>
        <p style="margin-top: 0.5rem; font-size: 1rem;">${escapeHtml(proj.name)}</p>
      </div>
      ${config.includeImage && finalImage ? `<div class="header-right"><img src="${escapeHtml(finalImage)}" alt="Imagen final" /></div>` : ''}
    </div>
    `;

  // Imágenes de filtros (inicial y final)
  if (config.includeFilterImages) {
    const filterImages: Record<string, {filter: string; initial?: string; final?: string}> = {};
    
    // Recopilar imágenes iniciales y finales por filtro
    Object.entries(proj.images || {}).forEach(([key, src]) => {
      if (key.startsWith('initial') && key !== 'initialProject' && src) {
        const filterName = key.replace('initial', '');
        if (!filterImages[filterName]) filterImages[filterName] = { filter: filterName };
        filterImages[filterName].initial = src as string;
      } else if (key.startsWith('final') && key !== 'finalProject' && src) {
        const filterName = key.replace('final', '');
        if (!filterImages[filterName]) filterImages[filterName] = { filter: filterName };
        filterImages[filterName].final = src as string;
      }
    });
    
    const filterImagesArray = Object.values(filterImages);
    
    if (filterImagesArray.length > 0) {
      html += `
      <div class="section">
        <h2 class="section-title">Imágenes de Filtros</h2>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-top: 1rem;">`;
      
      filterImagesArray.forEach((item) => {
        html += `
          <div class="card">
            <h3 style="font-size: 1.2rem; font-weight: 600; color: ${theme.textAccent}; margin-bottom: 1.5rem; text-align: center;">${escapeHtml(item.filter)}</h3>
            <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">`;
        
        if (item.initial) {
          html += `
              <div style="width: 100%; text-align: center;">
                <p style="font-size: 0.85rem; color: ${theme.textSecondary}; margin-bottom: 0.75rem; font-weight: 600;">Inicial</p>
                <img src="${escapeHtml(item.initial)}" alt="Imagen inicial ${escapeHtml(item.filter)}" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 0.75rem; border: 2px solid ${theme.border};" />
              </div>`;
        }
        
        if (item.final) {
          html += `
              <div style="width: 100%; text-align: center;">
                <p style="font-size: 0.85rem; color: ${theme.textSecondary}; margin-bottom: 0.75rem; font-weight: 600;">Final</p>
                <img src="${escapeHtml(item.final)}" alt="Imagen final ${escapeHtml(item.filter)}" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 0.75rem; border: 2px solid ${theme.border};" />
              </div>`;
        }
        
        html += `
            </div>
          </div>`;
      });
      
      html += `
        </div>
      </div>`;
    }
  }

  // Estadísticas
  if (Object.values(config.includeStats).some((v: any) => v)) {
    html += `<div class="section">
      <h2 class="section-title">Estadísticas del Proyecto</h2>
      <div class="grid">`;
    
    if (config.includeStats.status) html += `<div class="card"><div class="card-label">Estado</div><div class="card-value"><span class="status-badge status-${proj.status || 'active'}">${statusLabels[proj.status || 'active']}</span></div></div>`;
    if (config.includeStats.nights) html += `<div class="card"><div class="card-label">Noches</div><div class="card-value">${nights}</div></div>`;
    if (config.includeStats.sessions) html += `<div class="card"><div class="card-label">Sesiones</div><div class="card-value">${totalSessions}</div></div>`;
    if (config.includeStats.activeTime) html += `<div class="card"><div class="card-label">Tiempo Activo</div><div class="card-value">${diffDays} día${diffDays !== 1 ? 's' : ''}</div></div>`;
    if (config.includeStats.totalLights) html += `<div class="card"><div class="card-label">Lights Totales</div><div class="card-value">${totalLights}</div></div>`;
    if (config.includeStats.totalExposure) html += `<div class="card"><div class="card-label">Exposición Total</div><div class="card-value">${hh(totalSeconds)}</div></div>`;
    if (config.includeStats.goal && goalHours > 0) html += `<div class="card"><div class="card-label">Objetivo</div><div class="card-value">${currentHours}h / ${goalHours}h</div><div class="card-subtitle">${((parseFloat(currentHours) / goalHours) * 100).toFixed(0)}% completado</div></div>`;
    if (config.includeStats.avgSNR && avgSNR !== '-') html += `<div class="card"><div class="card-label">SNR Medio</div><div class="card-value">${avgSNR}</div></div>`;
    if (config.includeStats.telescope) html += `<div class="card"><div class="card-label">Telescopio</div><div class="card-value" style="font-size: 1rem;">${escapeHtml(telescope)}</div></div>`;
    if (config.includeStats.camera) html += `<div class="card"><div class="card-label">Cámara</div><div class="card-value" style="font-size: 1rem;">${escapeHtml(camera)}</div></div>`;
    if (config.includeStats.location && mainLocation?.name) html += `<div class="card"><div class="card-label">Localización</div><div class="card-value" style="font-size: 1rem;">${escapeHtml(mainLocation.name)}</div>${mainLocation.coords ? `<div class="card-subtitle">${escapeHtml(mainLocation.coords)}</div>` : ''}</div>`;
    if (config.includeStats.bortle && mainLocation?.bortle) html += `<div class="card"><div class="card-label">Bortle</div><div class="card-value">${escapeHtml(mainLocation.bortle)}</div></div>`;
    
    html += `</div></div>`;
  }

  // Gráfica de progreso acumulado
  if (config.includeCharts.progressChart) {
    html += `
    <div class="section">
      <h2 class="section-title">Progreso Acumulado</h2>
      <div class="chart-container">
        <canvas id="progressChart"></canvas>
      </div>
    </div>`;
  }

  // Gráfica de exposición por filtro
  if (config.includeCharts.filterChart && Object.keys(filterHours).length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">Exposición por Filtro</h2>
      <div class="chart-container">
        <canvas id="filterChart"></canvas>
      </div>
    </div>`;
  }

  // Gráfica de lights por sesión
  if (config.includeCharts.lightsChart) {
    html += `
    <div class="section">
      <h2 class="section-title">Iluminación por Sesión</h2>
      <div class="chart-container">
        <canvas id="lightsChart"></canvas>
      </div>
    </div>`;
  }

  // Gráfica de SNR medio
  if (config.includeCharts.snrMeanChart && snrMeanData.length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">SNR Medio por Sesión</h2>
      <div class="chart-container">
        <canvas id="snrMeanChart"></canvas>
      </div>
    </div>`;
  }

  // Gráfica de SNR RGB
  if (config.includeCharts.snrRGBChart && snrRGBData.length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">SNR RGB por Sesión</h2>
      <div class="chart-container">
        <canvas id="snrRGBChart"></canvas>
      </div>
    </div>`;
  }

  // Tabla de sesiones
  if (config.includeTable) {
    html += `
    <div class="section">
      <h2 class="section-title">Tabla de Sesiones</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Filtro</th>
            <th>Lights</th>
            <th>Horas Sesión</th>
            <th>Horas Acum.</th>
            <th>SNR Medio</th>
          </tr>
        </thead>
        <tbody>
          ${sessionDataWithSNR.map(s => `
            <tr>
              <td>${escapeHtml(s.date)}</td>
              <td>${escapeHtml(s.filter)}</td>
              <td>${escapeHtml(String(s.lights))}</td>
              <td>${escapeHtml(s.sessionHours.toFixed(2))}h</td>
              <td>${escapeHtml(s.cumulativeHours.toFixed(2))}h</td>
              <td>${escapeHtml(s.snrMean)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }

  html += `
    <div class="footer">
      <p>Reporte generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <p style="margin-top: 0.5rem;">AstroBoard - Astronomy Tracker</p>
    </div>
  </div>

  <script>
    const chartColor = '${theme.textPrimary}';
    const gridColor = '${theme.gridColor}';
    const accentColor = '${theme.textAccent}';
    
    // Función para calcular min y max con margen
    const getYAxisRange = (data) => {
      const values = data.filter(v => v != null && !isNaN(v));
      if (values.length === 0) return { min: 0, max: 10 };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const margin = range * 0.1;
      return {
        min: Math.max(0, min - margin),
        max: max + margin
      };
    };
    
    ${config.includeCharts.progressChart ? `
    const progressData = ${JSON.stringify(chartDataByDate.map((d: any) => d.hours))};
    const progressRange = getYAxisRange(progressData);
    const progressCtx = document.getElementById('progressChart').getContext('2d');
    new Chart(progressCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(chartDataByDate.map((d: any) => d.date))},
        datasets: [{
          label: 'Horas acumuladas',
          data: progressData,
          borderColor: accentColor,
          backgroundColor: '${isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)'}',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: chartColor, font: { size: 11 } } } },
        scales: {
          y: { 
            min: progressRange.min,
            max: progressRange.max,
            ticks: { color: chartColor, font: { size: 10 } }, 
            grid: { color: gridColor } 
          },
          x: { ticks: { color: chartColor, font: { size: 9 } }, grid: { color: gridColor } }
        }
      }
    });` : ''}

    ${config.includeCharts.filterChart && filterData.length > 0 ? `
    const filterChartData = ${JSON.stringify(filterData.map((d: any) => parseFloat(d.hours)))};
    const filterRange = getYAxisRange(filterChartData);
    const filterCtx = document.getElementById('filterChart').getContext('2d');
    new Chart(filterCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(filterData.map((d: any) => d.filter))},
        datasets: [{
          label: 'Horas',
          data: filterChartData,
          backgroundColor: ['#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#34d399'],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            min: filterRange.min,
            max: filterRange.max,
            ticks: { color: chartColor, font: { size: 10 } }, 
            grid: { color: gridColor } 
          },
          x: { ticks: { color: chartColor, font: { size: 10 } }, grid: { color: gridColor } }
        }
      }
    });` : ''}

    ${config.includeCharts.lightsChart ? `
    const lightsData = ${JSON.stringify(proj.sessions.map((s: any) => s.lights || 0))};
    const lightsRange = getYAxisRange(lightsData);
    const lightsCtx = document.getElementById('lightsChart').getContext('2d');
    new Chart(lightsCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(chartDataByDate.map((d: any) => d.date))},
        datasets: [{
          label: 'Lights por sesión',
          data: lightsData,
          backgroundColor: '#a78bfa',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: chartColor, font: { size: 11 } } } },
        scales: {
          y: { 
            min: lightsRange.min,
            max: lightsRange.max,
            ticks: { color: chartColor, font: { size: 10 } }, 
            grid: { color: gridColor } 
          },
          x: { ticks: { color: chartColor, font: { size: 9 } }, grid: { color: gridColor } }
        }
      }
    });` : ''}

    ${config.includeCharts.snrMeanChart && snrMeanData.length > 0 ? `
    const snrMeanChartData = ${JSON.stringify(snrMeanData.map((d: any) => d.snr))};
    const snrMeanRange = getYAxisRange(snrMeanChartData);
    const snrMeanCtx = document.getElementById('snrMeanChart').getContext('2d');
    new Chart(snrMeanCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(snrMeanData.map((d: any) => d.date))},
        datasets: [{
          label: 'SNR Medio',
          data: snrMeanChartData,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: chartColor, font: { size: 11 } } } },
        scales: {
          y: { 
            min: snrMeanRange.min,
            max: snrMeanRange.max,
            ticks: { color: chartColor, font: { size: 10 } }, 
            grid: { color: gridColor } 
          },
          x: { ticks: { color: chartColor, font: { size: 9 } }, grid: { color: gridColor } }
        }
      }
    });` : ''}

    ${config.includeCharts.snrRGBChart && snrRGBData.length > 0 ? `
    const snrRGBAllValues = [
      ...${JSON.stringify(snrRGBData.map((d: any) => d.snrR))}.filter(v => v != null),
      ...${JSON.stringify(snrRGBData.map((d: any) => d.snrG))}.filter(v => v != null),
      ...${JSON.stringify(snrRGBData.map((d: any) => d.snrB))}.filter(v => v != null)
    ];
    const snrRGBRange = getYAxisRange(snrRGBAllValues);
    const snrRGBCtx = document.getElementById('snrRGBChart').getContext('2d');
    new Chart(snrRGBCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(snrRGBData.map((d: any) => d.date))},
        datasets: [
          {
            label: 'SNR R',
            data: ${JSON.stringify(snrRGBData.map((d: any) => d.snrR))},
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            tension: 0.4
          },
          {
            label: 'SNR G',
            data: ${JSON.stringify(snrRGBData.map((d: any) => d.snrG))},
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            tension: 0.4
          },
          {
            label: 'SNR B',
            data: ${JSON.stringify(snrRGBData.map((d: any) => d.snrB))},
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { labels: { color: chartColor, font: { size: 11 } } } },
        scales: {
          y: { 
            min: snrRGBRange.min,
            max: snrRGBRange.max,
            ticks: { color: chartColor, font: { size: 10 } }, 
            grid: { color: gridColor } 
          },
          x: { ticks: { color: chartColor, font: { size: 9 } }, grid: { color: gridColor } }
        }
      }
    });` : ''}
  </script>
</body>
</html>`;

  // Crear iframe oculto para renderizar
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '1200px';
  iframe.style.height = '2000px';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Esperar a que Chart.js esté disponible y se carguen las gráficas
    await new Promise(resolve => {
      if (iframe.contentWindow) {
        iframe.contentWindow.addEventListener('load', () => {
          setTimeout(resolve, 4000);
        });
      } else {
        setTimeout(resolve, 4000);
      }
    });

    // Convertir a PDF con paginación inteligente
    const reportElement = iframeDoc.getElementById('report');
    if (reportElement) {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = 297; // A4 height in mm
      const pageWidth = 210; // A4 width in mm
      const margin = 10; // margin in mm
      const usableHeight = pageHeight - (margin * 2);
      const usableWidth = pageWidth - (margin * 2);
      
      // Get all sections that should not be split
      const sections = reportElement.querySelectorAll('.section, .header');
      const sectionsArray = Array.from(sections);
      
      let currentY = margin;
      let isFirstPage = true;
      
      for (let i = 0; i < sectionsArray.length; i++) {
        const section = sectionsArray[i] as HTMLElement;
        
        // Capture this section
        const sectionCanvas = await html2canvas(section, {
          scale: 2,
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          logging: false,
          useCORS: true,
          allowTaint: true,
          windowWidth: 1200,
        });
        
        const sectionImgData = sectionCanvas.toDataURL('image/jpeg', 0.9);
        const sectionWidth = usableWidth;
        const sectionHeight = (sectionCanvas.height * sectionWidth) / sectionCanvas.width;
        
        // Check if this section fits on the current page
        if (!isFirstPage && currentY + sectionHeight > pageHeight - margin) {
          // Section doesn't fit, start a new page
          pdf.addPage();
          currentY = margin;
        }
        
        // If section is taller than a full page, we need to split it
        if (sectionHeight > usableHeight) {
          // For very tall sections, use the old slicing method
          let sectionHeightLeft = sectionHeight;
          let sectionPosition = 0;
          
          while (sectionHeightLeft > 0) {
            const availableSpace = isFirstPage && sectionPosition === 0 ? usableHeight - (currentY - margin) : usableHeight;
            
            if (sectionPosition > 0) {
              pdf.addPage();
              currentY = margin;
            }
            
            pdf.addImage(
              sectionImgData, 
              'JPEG', 
              margin, 
              currentY - sectionPosition, 
              sectionWidth, 
              sectionHeight, 
              undefined, 
              'FAST'
            );
            
            sectionPosition += availableSpace;
            sectionHeightLeft -= availableSpace;
            currentY = margin + Math.min(sectionHeightLeft, usableHeight);
          }
        } else {
          // Section fits, add it to the current page
          pdf.addImage(sectionImgData, 'JPEG', margin, currentY, sectionWidth, sectionHeight, undefined, 'FAST');
          currentY += sectionHeight + 5; // Add 5mm spacing between sections
        }
        
        isFirstPage = false;
      }

      pdf.save(`reporte-${obj.id}-${proj.name.replace(/[^a-z0-9]/gi, '-')}.pdf`);
      
      toast({
        title: "Reporte generado",
        description: "El reporte PDF se ha descargado correctamente",
      });
    }

    document.body.removeChild(iframe);
  }
};

export default function AstroTracker() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const cloudSync = useCloudSync();
  
  // TODOS los useState deben ir juntos al principio
  // IMPORTANT: Start with empty array - cloud users should NOT see sample data
  // Sample data is ONLY used as fallback for non-cloud users without localStorage
  const [objects, setObjects] = useState<any[]>([]);
  const [cloudDataLoaded, setCloudDataLoaded] = useState(false);
  const [view, setView] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [mObj, setMObj] = useState(false);
  const [mProj, setMProj] = useState(false);
  const [mSes, setMSes] = useState(false);
  const [mSesAuto, setMSesAuto] = useState(false);
  const [editSes, setEditSes] = useState<any>(null);
  const [sortObjects, setSortObjects] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [filterConstellation, setFilterConstellation] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [theme, setTheme] = useState("astro");
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [defaultTheme, setDefaultTheme] = useState("astro");
  const [jsonPath, setJsonPath] = useState("");
  const [cameras, setCameras] = useState<string[]>([""]);
  const [telescopes, setTelescopes] = useState<{ name: string; focalLength: string }[]>([
    { name: "", focalLength: "" },
  ]);
  const [showInitialFilePrompt, setShowInitialFilePrompt] = useState(false);
  const [hasImportedData, setHasImportedData] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(1);
  const [showEditPanels, setShowEditPanels] = useState(false);
  const [editNumPanels, setEditNumPanels] = useState(1);
  const [userName, setUserName] = useState<string>("");
  const [dateFormat, setDateFormat] = useState<string>("DD/MM/YYYY");
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editObjectData, setEditObjectData] = useState<any>(null);
  const [selectedConstellation, setSelectedConstellation] = useState<string>("");
  const [editObjectOriginalId, setEditObjectOriginalId] = useState<string | null>(null);
  const [showEditObjectModal, setShowEditObjectModal] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [projectSettingsData, setProjectSettingsData] = useState<any>({});
  const [tabs, setTabs] = useState<TabType[]>([]);
  const [active, setActive] = useState("");
  const [show, setShow] = useState(false);
  const [tabName, setTabName] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mainLocation, setMainLocation] = useState<{ name: string; coords: string }>({ name: "", coords: "" });
  const [locations, setLocations] = useState<{ name: string; coords: string }[]>([{ name: "", coords: "" }]);
  const [guideTelescope, setGuideTelescope] = useState<{ name: string; focalLength: string }>({ name: "", focalLength: "" });
  const [guideCamera, setGuideCamera] = useState<string>("");
  const [mount, setMount] = useState<string>("");
  const [minAltitudeLimit, setMinAltitudeLimit] = useState<number>(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    day: number;
    month: number;
    year: number;
    projects: any[];
  } | null>(null);
  const [panelSectionExpanded, setPanelSectionExpanded] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [sortProjects, setSortProjects] = useState("recent");
  const [projectSearchText, setProjectSearchText] = useState("");
  const [showProjectFilters, setShowProjectFilters] = useState(false);
  const [filterRating, setFilterRating] = useState<"all" | "3" | "2" | "1">("all");
  const [gallerySearchText, setGallerySearchText] = useState("");
  const [gallerySortMode, setGallerySortMode] = useState<"alpha" | "rating">("rating");
  const [showGalleryFilters, setShowGalleryFilters] = useState(false);
  const [galleryFilterConstellation, setGalleryFilterConstellation] = useState("all");
  const [highlightsSectionExpanded, setHighlightsSectionExpanded] = useState(true);
  const [objectsSectionExpanded, setObjectsSectionExpanded] = useState(true);
  const [evolutionSectionExpanded, setEvolutionSectionExpanded] = useState(true);
  const [timelineSectionExpanded, setTimelineSectionExpanded] = useState(true);
  const [visibilitySectionExpanded, setVisibilitySectionExpanded] = useState(true);
  const [mainSection, setMainSection] = useState<"pronostico" | "objetos" | "estadisticas" | "galeria" | "planificacion">("objetos");
  const [nextEphemeris, setNextEphemeris] = useState<Ephemeris | null>(null);
  
  // Estado para proyectos planificados
  const [plannedProjects, setPlannedProjects] = useState<any[]>([]);
  const [selectedPlannedId, setSelectedPlannedId] = useState<string | null>(null);
  const [mPlanned, setMPlanned] = useState(false);
  const [editingPlannedId, setEditingPlannedId] = useState<string | null>(null);
  const [plannedSearchText, setPlannedSearchText] = useState("");
  const [showPlannedFilters, setShowPlannedFilters] = useState(false);
  const [plannedFilterConstellation, setPlannedFilterConstellation] = useState("all");
  const [plannedFilterSignal, setPlannedFilterSignal] = useState("all");
  const [plannedFilterPriority, setPlannedFilterPriority] = useState("all");
  const [plannedFilterCenit, setPlannedFilterCenit] = useState("all");
  const [plannedSortMode, setPlannedSortMode] = useState<"alpha" | "chrono" | "priority">("chrono");
  const [plannedFromPlan, setPlannedFromPlan] = useState<any>(null);
  const [ephemerides, setEphemerides] = useState<Ephemeris[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [visibleHighlights, setVisibleHighlights] = useState({
    totalObjects: true,
    totalProjects: true,
    totalHours: true,
    totalLights: true,
    totalNights: true,
    totalSessions: true,
    onpSnp: true,
    activeProjects: true,
    ratedPhotos: true,
    snrRecord: true,
    hoursByYear: true,
    mostPhotographedObject: true,
    mostPhotographedConstellation: true,
    streaks: true,
    cameraUsage: true,
    telescopeUsage: true,
  });
  const [showStatsConfig, setShowStatsConfig] = useState(false);
  
  // Estados para configuración de reporte
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    includeImage: true,
    includeFilterImages: true,
    includeStats: {
      status: true,
      nights: true,
      sessions: true,
      activeTime: true,
      totalLights: true,
      totalExposure: true,
      goal: true,
      avgSNR: true,
      telescope: true,
      camera: true,
      location: true,
      bortle: true,
    },
    includeCharts: {
      progressChart: true,
      filterChart: true,
      lightsChart: true,
      snrMeanChart: true,
      snrRGBChart: true,
    },
    includeTable: true,
    theme: 'dark' as 'dark' | 'light',
  });

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === "dark") return "astro";
      return "dark";
    });
  };

  // Refs for debounced cloud sync - declared before useEffect that uses them
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSyncDataRef = useRef<{ objects: any[]; planned: any[]; settings: any } | null>(null);
  
  // Track the loaded cloud data to prevent overwriting with empty state
  const cloudLoadedDataRef = useRef<{ objects: any[] | null; planned: any[] | null }>({ objects: null, planned: null });

  // Ref to track if initialization has STARTED (sync) and COMPLETED (async)
  const initializationStartedRef = useRef(false);
  const initializationCompleteRef = useRef(false);
  
  // Simple counter to track pending changes - incremented on each user action
  // When > 0, we know user has made changes that need syncing
  const pendingChangesRef = useRef(0);

  // Load settings and data from localStorage or cloud on mount
  useEffect(() => {
    // Prevent double initialization in Strict Mode - check synchronously BEFORE any async
    if (initializationStartedRef.current) return;
    initializationStartedRef.current = true; // Set immediately to block second call
    
    const loadData = async () => {
      // Helper to apply settings
      const applySettings = (settings: any) => {
        if (settings.defaultTheme) {
          setDefaultTheme(settings.defaultTheme);
          setTheme(settings.defaultTheme);
        }
        if (settings.jsonPath) setJsonPath(settings.jsonPath);
        if (settings.cameras) setCameras(settings.cameras);
        if (settings.telescopes) setTelescopes(settings.telescopes);
        if (settings.userName) setUserName(settings.userName);
        if (settings.dateFormat) setDateFormat(settings.dateFormat);
        if (settings.mainLocation) setMainLocation(settings.mainLocation);
        if (settings.locations) setLocations(settings.locations);
        if (settings.guideTelescope) setGuideTelescope(settings.guideTelescope);
        if (settings.guideCamera) setGuideCamera(settings.guideCamera);
        if (settings.mount) setMount(settings.mount);
        if (settings.minAltitudeLimit !== undefined) setMinAltitudeLimit(settings.minAltitudeLimit);
        if (settings.visibleHighlights) setVisibleHighlights(settings.visibleHighlights);
      };

      // Try to load from cloud first if enabled
      if (cloudSyncRef.current.isCloudEnabled) {
        try {
          console.log('[Init] Loading from cloud...');
          const cloudData = await cloudSyncRef.current.loadFromCloud();
          
          // For cloud users, ONLY use cloud data - never fall back to localStorage
          // This ensures data isolation between users on the same browser
          const loadedObjects = (cloudData.objects && Array.isArray(cloudData.objects)) 
            ? cloudData.objects 
            : [];
          const loadedPlanned = (cloudData.planned && Array.isArray(cloudData.planned)) 
            ? cloudData.planned 
            : [];
          
          console.log('[Init] Loaded from cloud:', { 
            objectsCount: loadedObjects.length, 
            plannedCount: loadedPlanned.length,
            objectsData: loadedObjects.map((o: any) => o.id)
          });
          
          // Store the loaded data to verify against later
          cloudLoadedDataRef.current = { objects: loadedObjects, planned: loadedPlanned };
          
          console.log('[Init] Cloud data loaded:', { 
            objectsCount: loadedObjects.length,
            plannedCount: loadedPlanned.length 
          });
          
          setObjects(loadedObjects);
          setHasImportedData(loadedObjects.length > 0);
          setPlannedProjects(loadedPlanned);
          
          if (cloudData.settings) {
            applySettings(cloudData.settings);
          }
          // Note: For cloud users without settings, we use the default state values (empty strings)
          
          initializationCompleteRef.current = true;
          pendingChangesRef.current = 0; // Reset - no pending changes
          setCloudDataLoaded(true);
          return; // Cloud users never load from localStorage
        } catch (e) {
          console.error("Error loading from cloud:", e);
          // Even on error, cloud users should not load other users' localStorage data
          initializationCompleteRef.current = true;
          setCloudDataLoaded(true);
          return;
        }
      }

      // localStorage is ONLY used for non-cloud users (offline mode)
      const savedSettings = localStorage.getItem("astroTrackerSettings");
      const savedData = localStorage.getItem("astroTrackerData");

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          applySettings(settings);
        } catch (e) {
          console.error("Error loading settings:", e);
        }
      }

      // Load data from localStorage if exists
      if (savedData && savedData !== "[]") {
        try {
          const data = JSON.parse(savedData);
          if (Array.isArray(data) && data.length > 0) {
            setObjects(data);
            setHasImportedData(true);
          } else {
            setHasImportedData(false);
          }
        } catch (e) {
          console.error("Error loading data:", e);
          setHasImportedData(false);
        }
      } else {
        setHasImportedData(false);
      }

      // Load planned projects from localStorage
      const savedPlanned = localStorage.getItem("astroTrackerPlannedProjects");
      if (savedPlanned) {
        try {
          const planned = JSON.parse(savedPlanned);
          if (Array.isArray(planned)) {
            setPlannedProjects(planned);
          }
        } catch (e) {
          console.error("Error loading planned projects:", e);
        }
      }
      
      initializationCompleteRef.current = true;
    };

    loadData();

    // Load ephemeris data
    const loadEphemerisData = async () => {
      try {
        const data = await loadEphemeris();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        // Parse spanish date format
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
        
        // Filter future ephemerides and sort
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
        if (futureEphemerides.length > 0) {
          setNextEphemeris(futureEphemerides[0]);
        }
      } catch (error) {
        console.error("Error loading ephemerides:", error);
      }
    };
    loadEphemerisData();
  }, []); // Empty deps - runs only once on mount

  // Load weather data when mainLocation changes (separate effect to avoid re-running settings load)
  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        if (!mainLocation?.coords) return;
        
        const coords = mainLocation.coords.split(',').map(c => c.trim());
        if (coords.length !== 2) return;
        
        const [lat, lon] = coords;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=3`
        );
        
        if (!response.ok) throw new Error('Weather API error');
        const data = await response.json();
        setWeatherData(data);
      } catch (error) {
        console.error("Error loading weather data:", error);
      }
    };
    loadWeatherData();
  }, [mainLocation?.coords]);

  // Store cloudSync in a ref to avoid dependency issues in callbacks
  const cloudSyncRef = useRef(cloudSync);
  useEffect(() => {
    cloudSyncRef.current = cloudSync;
  }, [cloudSync]);

  // Function to perform immediate sync
  const performImmediateSync = useCallback(async () => {
    if (!cloudSyncRef.current.isCloudEnabled || !cloudDataLoaded || !pendingSyncDataRef.current) return;
    
    const { objects: objData, planned, settings } = pendingSyncDataRef.current;
    const synced = await cloudSyncRef.current.saveToCloud(objData, planned, settings);
    if (synced) {
      pendingSyncDataRef.current = null;
    }
  }, [cloudDataLoaded]);

  // Refs for settings to avoid including them in sync effect dependencies
  const settingsRef = useRef({
    defaultTheme,
    jsonPath,
    cameras,
    telescopes,
    mainLocation,
    locations,
    guideTelescope,
    guideCamera,
    mount,
    userName,
    dateFormat,
    minAltitudeLimit,
  });
  
  // Keep settingsRef up to date
  useEffect(() => {
    settingsRef.current = {
      defaultTheme,
      jsonPath,
      cameras,
      telescopes,
      mainLocation,
      locations,
      guideTelescope,
      guideCamera,
      mount,
      userName,
      dateFormat,
      minAltitudeLimit,
    };
  }, [defaultTheme, jsonPath, cameras, telescopes, mainLocation, locations, guideTelescope, guideCamera, mount, userName, dateFormat, minAltitudeLimit]);


  // Force cloud sync - used after import to ensure data is saved immediately
  // Now accepts optional settings parameter to ensure imported settings are also saved
  const forceCloudSync = useCallback(async (
    objectsToSave: any[], 
    plannedToSave: any[],
    importedSettings?: any
  ): Promise<boolean> => {
    if (!cloudSyncRef.current.isCloudEnabled) {
      console.log('[CloudSync] Force sync skipped: cloud not enabled');
      return false;
    }
    
    console.log('[CloudSync] Force sync triggered:', { 
      objectsCount: objectsToSave.length, 
      plannedCount: plannedToSave.length,
      hasImportedSettings: !!importedSettings
    });
    
    // Use imported settings if provided, otherwise use current settings from ref
    const settingsToSave = importedSettings || {
      defaultTheme: settingsRef.current.defaultTheme,
      jsonPath: settingsRef.current.jsonPath,
      cameras: settingsRef.current.cameras.filter((c) => c.trim() !== ""),
      telescopes: settingsRef.current.telescopes.filter((t) => t.name.trim() !== ""),
      mainLocation: settingsRef.current.mainLocation,
      locations: settingsRef.current.locations.filter((l) => l.name.trim() !== ""),
      guideTelescope: settingsRef.current.guideTelescope,
      guideCamera: settingsRef.current.guideCamera,
      mount: settingsRef.current.mount,
      userName: settingsRef.current.userName,
      dateFormat: settingsRef.current.dateFormat,
      minAltitudeLimit: settingsRef.current.minAltitudeLimit,
    };
    
    try {
      const synced = await cloudSyncRef.current.saveToCloud(objectsToSave, plannedToSave, settingsToSave);
      if (synced) {
        console.log('[CloudSync] Force sync successful - data persisted to cloud');
        cloudLoadedDataRef.current = { objects: objectsToSave, planned: plannedToSave };
        pendingSyncDataRef.current = null;
        pendingChangesRef.current = 0;
        return true;
      } else {
        console.error('[CloudSync] Force sync failed - saveToCloud returned false');
        return false;
      }
    } catch (error) {
      console.error('[CloudSync] Force sync error:', error);
      return false;
    }
  }, []);

  // Auto-save objects and plannedProjects to cloud whenever they change
  // Uses pendingChangesRef counter to distinguish user actions from initial load
  useEffect(() => {
    // Skip if initialization is not complete or cloud is not enabled
    if (!initializationCompleteRef.current || !cloudSyncRef.current.isCloudEnabled || !cloudDataLoaded) return;
    
    // Only sync if user has made changes (pendingChangesRef > 0)
    if (pendingChangesRef.current === 0) {
      console.log('[CloudSync] Skip: No pending changes (initial load or no user action)');
      return;
    }
    
    console.log('[CloudSync] Change detected:', { 
      objectsCount: objects.length,
      plannedCount: plannedProjects.length,
      pendingChanges: pendingChangesRef.current
    });
    
    // Clear any pending timeout
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }
    
    // Use current settings from ref
    const currentSettings = settingsRef.current;
    const settingsToSave = {
      defaultTheme: currentSettings.defaultTheme,
      jsonPath: currentSettings.jsonPath,
      cameras: currentSettings.cameras.filter((c) => c.trim() !== ""),
      telescopes: currentSettings.telescopes.filter((t) => t.name.trim() !== ""),
      mainLocation: currentSettings.mainLocation,
      locations: currentSettings.locations.filter((l) => l.name.trim() !== ""),
      guideTelescope: currentSettings.guideTelescope,
      guideCamera: currentSettings.guideCamera,
      mount: currentSettings.mount,
      userName: currentSettings.userName,
      dateFormat: currentSettings.dateFormat,
      minAltitudeLimit: currentSettings.minAltitudeLimit,
    };
    
    // Store pending data for potential flush on unmount
    pendingSyncDataRef.current = { objects, planned: plannedProjects, settings: settingsToSave };
    
    // Capture current values for the async callback
    const objectsToSave = [...objects];
    const plannedToSave = [...plannedProjects];
    
    // Debounce to prevent multiple rapid saves
    cloudSyncTimeoutRef.current = setTimeout(async () => {
      console.log('[CloudSync] Saving to cloud:', { 
        objectsCount: objectsToSave.length, 
        plannedCount: plannedToSave.length 
      });
      
      const synced = await cloudSyncRef.current.saveToCloud(objectsToSave, plannedToSave, settingsToSave);
      if (synced) {
        console.log('[CloudSync] Saved successfully');
        // Update the cloud loaded data ref to match current state
        cloudLoadedDataRef.current = { objects: objectsToSave, planned: plannedToSave };
        pendingSyncDataRef.current = null;
        // Reset pending changes counter after successful save
        pendingChangesRef.current = 0;
      } else {
        console.error('[CloudSync] Save failed');
      }
    }, 1500);
  }, [objects, plannedProjects, cloudDataLoaded]);

  // Auto-save to localStorage as backup
  useEffect(() => {
    const objectsString = JSON.stringify(objects);
    const dataSizeKB = (objectsString.length * 2) / 1024;
    
    if (dataSizeKB > 4096) {
      console.warn(`Datos muy grandes para localStorage: ${(dataSizeKB / 1024).toFixed(2)}MB`);
      if (!cloudSync.isCloudEnabled) {
        toast({
          title: "Datos demasiado grandes",
          description: `Los datos ocupan ${(dataSizeKB / 1024).toFixed(2)}MB. El límite del navegador es ~5MB.`,
          variant: "destructive",
        });
      }
      return;
    }
    
    safeLocalStorageSave(
      "astroTrackerData",
      objectsString,
      (warningMessage) => {
        if (!cloudSync.isCloudEnabled) {
          toast({
            title: "Aviso de almacenamiento",
            description: warningMessage,
            variant: "destructive",
          });
        }
      }
    );
  }, [objects, toast, cloudSync.isCloudEnabled]);

  // Auto-save planned projects to localStorage
  useEffect(() => {
    localStorage.setItem("astroTrackerPlannedProjects", JSON.stringify(plannedProjects));
  }, [plannedProjects]);

  // Cleanup cloud sync timeout on unmount and flush pending sync
  useEffect(() => {
    return () => {
      if (cloudSyncTimeoutRef.current) {
        clearTimeout(cloudSyncTimeoutRef.current);
      }
      // Flush pending sync on unmount
      if (pendingSyncDataRef.current) {
        performImmediateSync();
      }
    };
  }, [performImmediateSync]);

  // Save settings to localStorage
  const saveSettings = useCallback(async () => {
    const settings = {
      defaultTheme,
      jsonPath,
      cameras: cameras.filter((c) => c.trim() !== ""),
      telescopes: telescopes.filter((t) => t.name.trim() !== ""),
      mainLocation,
      locations: locations.filter((l) => l.name.trim() !== ""),
      guideTelescope,
      guideCamera,
      mount,
      userName,
      dateFormat,
      minAltitudeLimit,
    };
    
    const saved = await safeLocalStorageSave(
      "astroTrackerSettings",
      JSON.stringify(settings),
      (warningMessage) => {
        toast({
          title: "Aviso de almacenamiento",
          description: warningMessage,
          variant: "destructive",
        });
      }
    );
    
    if (saved) {
      setShowSettings(false);
    } else {
      toast({
        title: "Error de almacenamiento",
        description: "No se pudieron guardar los ajustes.",
        variant: "destructive",
      });
    }
  }, [defaultTheme, jsonPath, cameras, telescopes, mainLocation, locations, guideTelescope, guideCamera, mount, userName, dateFormat, minAltitudeLimit, toast]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Persist theme to localStorage when it changes
    try {
      const savedSettings = localStorage.getItem("astroTrackerSettings");
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.defaultTheme = theme;
      localStorage.setItem("astroTrackerSettings", JSON.stringify(settings));
      setDefaultTheme(theme);
    } catch (e) {
      console.error("Error saving theme:", e);
    }
  }, [theme]);

  // Función para exportar JSON (reutilizable)
  const exportJsonData = useCallback(() => {
    const exportData = {
      objects,
      plannedProjects,
      settings: {
        userName,
        cameras: cameras.filter((c) => c.trim() !== ""),
        telescopes: telescopes.filter((t) => t.name.trim() !== ""),
        locations: locations.filter((l) => l.name.trim() !== ""),
        mainLocation,
        guideTelescope,
        guideCamera,
        mount,
        dateFormat,
        defaultTheme,
        jsonPath,
        visibleHighlights,
        language,
        minAltitudeLimit,
      },
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Generate filename with date and time: astroboard_YYYY-MM-DD_HH-MM-SS.json
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // HH-MM-SS
    a.download = `astroboard_${dateStr}_${timeStr}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [objects, plannedProjects, userName, cameras, telescopes, locations, mainLocation, guideTelescope, guideCamera, mount, dateFormat, defaultTheme, jsonPath, visibleHighlights, language]);


  const filteredObjects = useMemo(() => {
    let filtered = objects;
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(search) ||
          (o.commonName || "").toLowerCase().includes(search) ||
          (o.constellation || "").toLowerCase().includes(search) ||
          (o.type || "").toLowerCase().includes(search),
      );
    }
    if (filterConstellation !== "all") filtered = filtered.filter((o) => o.constellation === filterConstellation);
    if (filterType !== "all") filtered = filtered.filter((o) => o.type === filterType);
    if (filterStatus !== "all") {
      filtered = filtered.filter((o) => o.projects.some((p: any) => p.status === filterStatus));
    }
    return filtered;
  }, [objects, searchText, filterConstellation, filterType, filterStatus]);

  const constellations = useMemo(() => {
    const cons = new Set(objects.map((o) => o.constellation).filter(Boolean));
    return Array.from(cons).sort();
  }, [objects]);

  const types = useMemo(() => {
    const ts = new Set(objects.map((o) => o.type).filter(Boolean));
    return Array.from(ts).sort();
  }, [objects]);

  const obj = useMemo(() => objects.find((o) => o.id === selectedObjectId) || null, [objects, selectedObjectId]);
  const proj = useMemo(() => obj?.projects.find((p) => p.id === selectedProjectId) || null, [obj, selectedProjectId]);

  // Verificar que los objetos y proyectos seleccionados existan, si no, redirigir a una vista segura
  useEffect(() => {
    if (view === "projects" && !obj) {
      setView("objects");
      setSelectedObjectId(null);
      setSelectedProjectId(null);
    }
    if (view === "project" && (!obj || !proj)) {
      if (obj && !proj) {
        setView("projects");
        setSelectedProjectId(null);
      } else {
        setView("objects");
        setSelectedObjectId(null);
        setSelectedProjectId(null);
      }
    }
  }, [view, obj, proj]);

  // Memoize random image selection for dashboard carousel
  const dashboardCarouselImages = useMemo(() => {
    const allImages: ImageItem[] = objects
      .flatMap((obj) => [
        obj.image
          ? {
              src: obj.image,
              title: `${obj.id}${obj.commonName ? " · " + obj.commonName : ""}`,
              objectId: obj.id,
              projectId: obj.projects[0]?.id,
            }
          : null,
        ...obj.projects.flatMap((proj) =>
          Object.entries(proj.images || {})
            .filter(([key]) => key !== "panelSchema") // Excluir imagen del esquema de paneles
            .map(([key, src]) => ({
              src: src as string,
              title: `${obj.id} - ${proj.name}`,
              type: key,
              objectId: obj.id,
              projectId: proj.id,
            })),
        ),
      ])
      .filter((item) => item !== null && item.src) as ImageItem[];

    if (allImages.length === 0) return [];
    if (allImages.length <= 6) return allImages;

    // Select 6 random images
    const shuffled = [...allImages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [
    objects.length,
    objects.reduce(
      (acc, obj) =>
        acc + (obj.image ? 1 : 0) + obj.projects.reduce((pAcc, p) => pAcc + Object.keys(p.images || {}).length, 0),
      0,
    ),
  ]);

  const addObj = useCallback(
    async (base: any) => {
      if (!base.id || !base.id.trim()) {
        alert("Debes proporcionar un código para el objeto.");
        return;
      }
      if (objects.some((o) => o.id.toLowerCase() === base.id.toLowerCase())) {
        alert("Ya existe un objeto con ese código.");
        return;
      }
      
      // Upload image to cloud if provided
      let imageUrl = undefined;
      if (base.image && cloudSync.isCloudEnabled) {
        const imageName = `object-${base.id.trim()}-${Date.now()}.jpg`;
        imageUrl = await cloudSync.uploadImageToCloud(base.image, imageName);
      } else if (base.image) {
        imageUrl = base.image;
      }
      
      const no = { ...base, id: base.id.trim(), createdAt: new Date().toISOString(), projects: [], image: imageUrl };
      pendingChangesRef.current++; // Mark as user modification
      setObjects([...objects, no]);
      setSelectedObjectId(no.id);
      setMObj(false);
      setView("projects");
    },
    [objects, cloudSync],
  );

  const delObj = useCallback(
    (id: string) => {
      if (!confirm("¿Eliminar este objeto?")) return;
      pendingChangesRef.current++; // Mark as user modification
      const newObjects = objects.filter((o) => o.id !== id);
      setObjects(newObjects);
      if (selectedObjectId === id) {
        setSelectedObjectId(null);
        setSelectedProjectId(null);
        setView("objects");
      }
    },
    [objects, selectedObjectId],
  );

  const addProj = useCallback(
    (base: any) => {
      if (!obj) return;
      // Crear estructura de paneles con sesiones
      const panels: any = {};
      for (let i = 1; i <= (base.numPanels || 1); i++) {
        panels[i] = [];
      }
      
      // Si viene con imagen de encuadre desde planificación, añadirla a las imágenes
      const images: any = {};
      if (base.encuadreImage && base.numPanels > 1) {
        images.panelSchema = base.encuadreImage;
      }
      
      const np = {
        id: uid("proj"),
        ...base,
        createdAt: new Date().toISOString(),
        startDate: base.startDate || new Date().toISOString(),
        status: "active",
        completedDate: undefined,
        sessions: [],
        panels,
        images,
        ratings: {},
      };
      pendingChangesRef.current++; // Mark as user modification
      setObjects(objects.map((o) => (o.id === obj.id ? { ...o, projects: [...o.projects, np] } : o)));
      setSelectedProjectId(np.id);
      setMProj(false);
      setView("project");
    },
    [objects, obj],
  );

  const updateProj = useCallback(
    (pid: string, updates: any) => {
      if (!obj) return;
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p) => {
                  if (p.id !== pid) return p;
                  // Si se cambia el status a completed y no tiene completedDate, asignar la fecha actual
                  const newUpdates = { ...updates };
                  if (updates.status === "completed" && !p.completedDate && p.status !== "completed") {
                    newUpdates.completedDate = new Date().toISOString();
                  }
                  return { ...p, ...newUpdates };
                }),
              },
        ),
      );
    },
    [objects, obj],
  );

  // Function to update rating for any image (used in gallery)
  const updateImageRating = useCallback(
    (objectId: string, projectId: string, keyName: string, newRating: number) => {
      setObjects((prevObjects) =>
        prevObjects.map((obj) =>
          obj.id === objectId
            ? {
                ...obj,
                projects: obj.projects.map((proj: any) =>
                  proj.id === projectId
                    ? {
                        ...proj,
                        ratings: {
                          ...(proj.ratings || {}),
                          [keyName]: newRating,
                        },
                      }
                    : proj
                ),
              }
            : obj
        )
      );
    },
    []
  );

  // Function to delete image (used in gallery)
  const deleteImageFromGallery = useCallback(
    (objectId: string, projectId: string, keyName: string) => {
      if (!confirm("¿Estás seguro de que quieres eliminar esta imagen?")) return;
      
      setObjects((prevObjects) =>
        prevObjects.map((obj) =>
          obj.id === objectId
            ? {
                ...obj,
                projects: obj.projects.map((proj: any) =>
                  proj.id === projectId
                    ? {
                        ...proj,
                        images: Object.fromEntries(
                          Object.entries(proj.images || {}).filter(([key]) => key !== keyName)
                        ),
                        ratings: Object.fromEntries(
                          Object.entries(proj.ratings || {}).filter(([key]) => key !== keyName)
                        ),
                      }
                    : proj
                ),
              }
            : obj
        )
      );
    },
    []
  );

  const updatePanelCount = useCallback(
    (newCount: number) => {
      if (!obj || !proj) return;
      const currentPanels = (proj as any).panels || {};
      const currentCount = Object.keys(currentPanels).length;

      if (newCount === currentCount) return;

      const newPanels: any = {};

      if (newCount > currentCount) {
        // Añadir paneles nuevos (vacíos)
        for (let i = 1; i <= currentCount; i++) {
          newPanels[i] = currentPanels[i] || [];
        }
        for (let i = currentCount + 1; i <= newCount; i++) {
          newPanels[i] = [];
        }
      } else {
        // Eliminar paneles (mantener solo los primeros newCount)
        for (let i = 1; i <= newCount; i++) {
          newPanels[i] = currentPanels[i] || [];
        }
        // Si el panel seleccionado ya no existe, seleccionar el primero
        if (selectedPanel > newCount) {
          setSelectedPanel(1);
        }
      }

      updateProj(proj.id, { panels: newPanels });
      setShowEditPanels(false);
    },
    [objects, obj, proj, selectedPanel, updateProj],
  );

  const addSes = useCallback(
    (base: any) => {
      console.log("addSes called with:", { base, obj, proj, selectedPanel });

      if (!obj || !proj) {
        console.error("Cannot add session: obj or proj is null", { obj, proj });
        return;
      }

      const s = { ...base, id: uid("ses") };
      const sessionFilter = s.filter || "RGB";

      console.log("Adding session:", s);

      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o: any) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p: any) =>
                  p.id === proj.id
                    ? {
                        ...p,
                        sessions: [...p.sessions, s],
                        panels: {
                          ...(p.panels || {}),
                          [selectedPanel]: [...(p.panels?.[selectedPanel] || []), s],
                        },
                        // Asegurar que el filtro existe en la lista de filtros del proyecto
                        filters: [...new Set([...(p.filters || []), sessionFilter])],
                      }
                    : p,
                ),
              },
        ),
      );
      setMSes(false);
      setMSesAuto(false);
      console.log("Session added successfully");
    },
    [objects, obj, proj, selectedPanel],
  );

  const editSession = useCallback(
    (sid: string, data: any) => {
      if (!obj || !proj) return;
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o: any) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p: any) =>
                  p.id !== proj.id
                    ? p
                    : {
                        ...p,
                        sessions: p.sessions.map((s: any) => (s.id === sid ? { ...s, ...data } : s)),
                        panels: Object.fromEntries(
                          Object.entries(p.panels || {}).map(([panelNum, sessions]: [string, any]) => [
                            panelNum,
                            sessions.map((s: any) => (s.id === sid ? { ...s, ...data } : s)),
                          ]),
                        ),
                      },
                ),
              },
        ),
      );
    },
    [objects, obj, proj],
  );

  const deleteSession = useCallback(
    (sid: string) => {
      if (!confirm("¿Eliminar sesión?")) return;
      if (!obj || !proj) return;
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o: any) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p: any) =>
                  p.id !== proj.id
                    ? p
                    : {
                        ...p,
                        sessions: p.sessions.filter((s: any) => s.id !== sid),
                        panels: Object.fromEntries(
                          Object.entries(p.panels || {}).map(([panelNum, sessions]: [string, any]) => [
                            panelNum,
                            sessions.filter((s: any) => s.id !== sid),
                          ]),
                        ),
                      },
                ),
              },
        ),
      );
    },
    [objects, obj, proj],
  );

  const delProj = useCallback(
    (pid: string) => {
      if (!obj || !confirm("¿Eliminar proyecto?")) return;
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o) => (o.id !== obj.id ? o : { ...o, projects: o.projects.filter((p) => p.id !== pid) })),
      );
      if (selectedProjectId === pid) {
        setSelectedProjectId(null);
        setView("projects");
      }
    },
    [objects, obj, selectedProjectId],
  );

  const upObjImg = useCallback(
    async (oid: string, img: string | null) => {
      if (!img) {
        pendingChangesRef.current++; // Mark as user modification
        setObjects(objects.map((o) => (o.id !== oid ? o : { ...o, image: null })));
        return;
      }
      
      // If cloud is enabled and this is a data URL, upload to cloud first
      if (cloudSync.isCloudEnabled && img.startsWith('data:')) {
        const imageName = `object-${oid}-${Date.now()}.jpg`;
        const cloudUrl = await cloudSync.uploadImageToCloud(img, imageName);
        pendingChangesRef.current++; // Mark as user modification
        setObjects(objects.map((o) => (o.id !== oid ? o : { ...o, image: cloudUrl })));
      } else {
        pendingChangesRef.current++; // Mark as user modification
        setObjects(objects.map((o) => (o.id !== oid ? o : { ...o, image: img })));
      }
    },
    [objects, cloudSync],
  );

  const upImgs = useCallback(
    async (patch: any) => {
      if (!obj || !proj) return;
      
      // Process each image in the patch
      const processedPatch: any = {};
      for (const [key, value] of Object.entries(patch)) {
        if (value && typeof value === 'string' && value.startsWith('data:') && cloudSync.isCloudEnabled) {
          // Upload to cloud storage
          const imageName = `${obj.id}-${proj.id}-${key}-${Date.now()}.jpg`;
          const cloudUrl = await cloudSync.uploadImageToCloud(value, imageName);
          processedPatch[key] = cloudUrl;
        } else {
          processedPatch[key] = value;
        }
      }
      
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p) =>
                  p.id !== proj.id ? p : { ...p, images: { ...(p.images || {}), ...processedPatch } },
                ),
              },
        ),
      );
    },
    [objects, obj, proj, cloudSync],
  );

  // Add planned project with cloud image upload
  const addPlannedProject = useCallback(
    async (planned: any) => {
      let processedPlanned = { ...planned };
      
      // Upload images to cloud if enabled
      if (cloudSync.isCloudEnabled) {
        if (planned.encuadreImage && planned.encuadreImage.startsWith('data:')) {
          const imageName = `planned-encuadre-${planned.id}-${Date.now()}.jpg`;
          const cloudUrl = await cloudSync.uploadImageToCloud(planned.encuadreImage, imageName);
          processedPlanned.encuadreImage = cloudUrl;
        }
        if (planned.objectImage && planned.objectImage.startsWith('data:')) {
          const imageName = `planned-object-${planned.id}-${Date.now()}.jpg`;
          const cloudUrl = await cloudSync.uploadImageToCloud(planned.objectImage, imageName);
          processedPlanned.objectImage = cloudUrl;
        }
      }
      
      pendingChangesRef.current++; // Mark as user modification
      setPlannedProjects(prev => [...prev, processedPlanned]);
    },
    [cloudSync]
  );

  // Update planned project with cloud image upload
  const updatePlannedProject = useCallback(
    async (updated: any) => {
      let processedUpdated = { ...updated };
      
      // Upload images to cloud if enabled
      if (cloudSync.isCloudEnabled) {
        if (updated.encuadreImage && updated.encuadreImage.startsWith('data:')) {
          const imageName = `planned-encuadre-${updated.id}-${Date.now()}.jpg`;
          const cloudUrl = await cloudSync.uploadImageToCloud(updated.encuadreImage, imageName);
          processedUpdated.encuadreImage = cloudUrl;
        }
        if (updated.objectImage && updated.objectImage.startsWith('data:')) {
          const imageName = `planned-object-${updated.id}-${Date.now()}.jpg`;
          const cloudUrl = await cloudSync.uploadImageToCloud(updated.objectImage, imageName);
          processedUpdated.objectImage = cloudUrl;
        }
      }
      
      pendingChangesRef.current++; // Mark as user modification
      setPlannedProjects(prev => prev.map(p => p.id === updated.id ? processedUpdated : p));
    },
    [cloudSync]
  );

  const updateRating = useCallback(
    (keyName: string, rating: number) => {
      if (!obj || !proj) return;
      pendingChangesRef.current++; // Mark as user modification
      setObjects(
        objects.map((o) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p) =>
                  p.id !== proj.id ? p : { ...p, ratings: { ...(p.ratings || {}), [keyName]: rating } },
                ),
              },
        ),
      );
    },
    [objects, obj, proj],
  );

  const ss = useMemo(() => {
    if (!proj) return [];
    const p: any = proj;
    // Obtener sesiones del panel seleccionado
    return (p.panels?.[selectedPanel] || []).slice().sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [proj, selectedPanel]);

  // Inicializar tabs basándose en los filtros del proyecto
  useEffect(() => {
    if (!proj) {
      setTabs([]);
      setActive("");
      return;
    }

    const projectFilters = (proj as any).filters || [];
    console.log("🔍 Proyecto cargado:", proj.name);
    console.log("🔍 Filtros del proyecto:", projectFilters);

    // Convertir filtros a string para comparación estable
    const filterString = JSON.stringify([...projectFilters].sort());

    setTabs((currentTabs) => {
      console.log(
        "🔍 Tabs actuales:",
        currentTabs.map((t) => `${t.name} (${t.custom ? "custom" : "auto"})`),
      );

      // Obtener nombres de tabs automáticas actuales (excluyendo la tab "?")
      const currentAutoTabNames = currentTabs
        .filter((t) => !t.custom && t.id !== "unclassified")
        .map((t) => t.name)
        .sort();
      const projectFilterNames = [...projectFilters].sort();

      // Comparar arrays
      const tabsMatchFilters = JSON.stringify(currentAutoTabNames) === JSON.stringify(projectFilterNames);

      console.log("🔍 ¿Tabs coinciden con filtros?", tabsMatchFilters);

      // Verificar si hay sesiones sin clasificar
      const up = (x: string) => (x || "").toUpperCase().trim();
      const unclassifiedSessions = ss.filter((s: any) => {
        const sessionFilter = up(s.filter);
        if (!sessionFilter) return true; // Sesiones sin filtro
        
        // Verificar si coincide con algún filtro del proyecto
        const matchesProjectFilter = projectFilters.some((filter: string) => {
          return sessionFilter === up(filter);
        });
        
        return !matchesProjectFilter; // Sesiones que NO coinciden
      });

      const hasUnclassifiedSessions = unclassifiedSessions.length > 0;
      console.log("🔍 Sesiones sin clasificar:", unclassifiedSessions.length);

      if (tabsMatchFilters && currentTabs.length > 0) {
        // Verificar si necesitamos agregar/quitar la tab "?"
        const hasUnclassifiedTab = currentTabs.some((t) => t.id === "unclassified");
        
        if (hasUnclassifiedSessions && !hasUnclassifiedTab) {
          console.log("➕ Agregando tab '?' para sesiones sin clasificar");
          return [
            ...currentTabs,
            {
              id: "unclassified",
              name: "?",
              custom: false,
            },
          ];
        } else if (!hasUnclassifiedSessions && hasUnclassifiedTab) {
          console.log("➖ Eliminando tab '?' (ya no hay sesiones sin clasificar)");
          const newTabs = currentTabs.filter((t) => t.id !== "unclassified");
          if (active === "unclassified") {
            setActive(newTabs[0]?.id || "");
          }
          return newTabs;
        }
        
        console.log("✅ Manteniendo tabs existentes");
        return currentTabs;
      }

      if (projectFilters.length > 0) {
        console.log("🔄 Recreando tabs desde filtros del proyecto");
        // Crear tabs automáticamente basadas en los filtros del proyecto
        const newTabs: TabType[] = projectFilters.map((filter: string) => ({
          id: `filter-${filter.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name: filter,
          custom: false,
        }));

        // Agregar tab "?" si hay sesiones sin clasificar
        if (hasUnclassifiedSessions) {
          newTabs.push({
            id: "unclassified",
            name: "?",
            custom: false,
          });
        }

        console.log(
          "📋 Nuevas tabs creadas:",
          newTabs.map((t) => t.name),
        );

        // Preservar tabs personalizadas
        const customTabs = currentTabs.filter((t) => t.custom);
        const allTabs = [...newTabs, ...customTabs];

        // Actualizar tab activa solo si la actual ya no existe
        if (!allTabs.find((t) => t.id === active)) {
          setActive(allTabs[0]?.id || "");
          console.log("🎯 Tab activa cambiada a:", allTabs[0]?.name);
        }

        return allTabs;
      } else {
        console.log("⚠️ Proyecto sin filtros, solo tabs personalizadas");
        // Si el proyecto no tiene filtros definidos, solo mantener tabs personalizadas
        const customTabs = currentTabs.filter((t) => t.custom && t.id !== "unclassified");
        
        // Agregar tab "?" si hay sesiones
        if (hasUnclassifiedSessions) {
          customTabs.push({
            id: "unclassified",
            name: "?",
            custom: false,
          });
        }
        
        if (customTabs.length > 0 && !customTabs.find((t) => t.id === active)) {
          setActive(customTabs[0]?.id || "");
        }
        return customTabs;
      }
    });
  }, [proj?.id, JSON.stringify((proj as any)?.filters || []), ss.length]);

  const createTab = useCallback(() => {
    const name = tabName.trim();
    if (!name) return;

    setShow(false);
    setTabName("");

    // Solo actualizar proj.filters - el useEffect creará la tab automáticamente
    if (obj && proj) {
      setObjects((prevObjects) =>
        prevObjects.map((o) =>
          o.id !== obj.id
            ? o
            : {
                ...o,
                projects: o.projects.map((p) =>
                  p.id !== proj.id
                    ? p
                    : {
                        ...p,
                        filters: [...((p as any).filters || []), name].filter((v, i, a) => a.indexOf(v) === i),
                      },
                ),
              },
        ),
      );

      // Activar la nueva tab después de que se cree
      setTimeout(() => {
        const newTabId = `filter-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        setActive(newTabId);
      }, 0);
    }
  }, [tabName, obj, proj, setShow, setTabName, setObjects, setActive]);

  const rm = useCallback(
    (id: string) => {
      if (!confirm("¿Eliminar esta pestaña de filtro?")) return;

      const tabToRemove = tabs.find((t) => t.id === id);
      if (!tabToRemove) return;

      // Remover del array de tabs
      setTabs((p) => p.filter((t) => t.id !== id));

      // Remover del proyecto (de proj.filters)
      if (obj && proj && tabToRemove.name) {
        setObjects((prevObjects) =>
          prevObjects.map((o) =>
            o.id !== obj.id
              ? o
              : {
                  ...o,
                  projects: o.projects.map((p) =>
                    p.id !== proj.id
                      ? p
                      : {
                          ...p,
                          filters: ((p as any).filters || []).filter((f: string) => f !== tabToRemove.name),
                        },
                  ),
                },
          ),
        );
      }

      // Si la tab eliminada era la activa, cambiar a la primera disponible
      if (active === id) {
        const remainingTabs = tabs.filter((t) => t.id !== id);
        setActive(remainingTabs[0]?.id || "");
      }
    },
    [tabs, active, obj, proj, setTabs, setActive, setObjects],
  );

  const startEditTab = (tab: TabType) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const saveTabName = (id: string) => {
    const name = editingTabName.trim();
    if (!name) {
      setEditingTabId(null);
      return;
    }
    setTabs((p) => p.map((t) => (t.id === id ? { ...t, name } : t)));
    setEditingTabId(null);
  };

  // Obtener filtros del proyecto, no solo de las tabs activas
  const availableFilters = useMemo(() => {
    if (!proj) return [];
    const projectFilters = (proj as any).filters || [];
    return projectFilters.length > 0 ? projectFilters : tabs.map((t) => t.name);
  }, [proj, tabs]);

  const filt = useCallback(
    (t: TabType | undefined) => {
      const up = (x: string) => (x || "").toUpperCase().trim();
      
      // Pestaña especial "?" para sesiones sin clasificar
      if (t?.id === "unclassified") {
        return ss.filter((s: any) => {
          const sessionFilter = up(s.filter);
          if (!sessionFilter) return true; // Sesiones sin filtro
          
          // Verificar si coincide con alguna pestaña existente
          const matchesAnyTab = tabs.some((tab) => {
            if (tab.id === "unclassified") return false;
            if (tab.preset === "rgb") return sessionFilter === "RGB";
            if (tab.preset === "haoiii") return sessionFilter.includes("HA") || sessionFilter.includes("OIII");
            return sessionFilter === up(tab.name);
          });
          
          return !matchesAnyTab; // Devolver sesiones que NO coinciden con ninguna pestaña
        });
      }
      
      if (t?.preset === "rgb") return ss.filter((s: any) => up(s.filter) === "RGB");
      if (t?.preset === "haoiii")
        return ss.filter((s: any) => {
          const f = up(s.filter);
          return f.includes("HA") || f.includes("OIII");
        });
      // Para tabs basadas en filtros del proyecto o custom, filtrar por nombre exacto (sin distinguir mayúsculas y sin espacios extra)
      if (t) {
        const tabName = up(t.name);
        return ss.filter((s: any) => {
          const sessionFilter = up(s.filter);
          return sessionFilter === tabName;
        });
      }
      return ss;
    },
    [ss, tabs],
  );

  const act = tabs.find((t) => t.id === active) || tabs[0] || { id: "", name: "Sin filtro", custom: false };
  const filtered = filt(act);
  const tabLabel = act?.preset === "rgb" ? "RGB" : act?.preset === "haoiii" ? "HA/OIII" : act?.name || "Sin filtro";
  const keyPrefix =
    act?.preset === "rgb"
      ? "RGB"
      : act?.preset === "haoiii"
        ? "HAOIII"
        : act?.name?.replace(/[^a-zA-Z0-9]/g, "") || "default";

  // Memoized global metrics calculation - moved out of IIFE to prevent render issues on mobile
  const globalMetrics = useMemo(() => {
    const totalObjects = objects.length;
    const totalProjects = objects.reduce((acc, obj) => acc + obj.projects.length, 0);
    const activeProjects = objects.reduce(
      (acc, obj) => acc + obj.projects.filter((p: any) => p.status === "active").length,
      0
    );
    const activeProjectsPercentage =
      totalProjects > 0 ? ((activeProjects / totalProjects) * 100).toFixed(1) : "0";

    let totalHours = 0;
    let totalLights = 0;
    const uniqueDates = new Set<string>();
    let totalSessions = 0;
    const objectExposures: Record<string, number> = {};

    objects.forEach((obj) => {
      let objExposure = 0;
      obj.projects.forEach((proj) => {
        proj.sessions.forEach((session: any) => {
          const sessionExposure = ((session.lights || 0) * (session.exposureSec || 0)) / 3600;
          totalHours += sessionExposure;
          objExposure += sessionExposure;
          totalLights += session.lights || 0;
          uniqueDates.add(session.date);
          totalSessions++;
        });
      });
      if (objExposure > 0) {
        objectExposures[obj.id] = objExposure;
      }
    });

    const totalNights = uniqueDates.size;
    const maxExposureObj = Object.entries(objectExposures).sort(([, a], [, b]) => b - a)[0];

    // Streak calculations
    const allDates = Array.from(uniqueDates).sort();
    let currentStreak = 0;
    let maxStreak = 0;

    if (allDates.length > 0) {
      currentStreak = 1;
      for (let i = allDates.length - 2; i >= 0; i--) {
        const prevDate = new Date(allDates[i]);
        const currDate = new Date(allDates[i + 1]);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(allDates[allDates.length - 1]);
      lastDate.setHours(0, 0, 0, 0);
      const daysSinceLastSession = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isStreakActive = daysSinceLastSession <= 1;
      if (!isStreakActive) {
        currentStreak = 0;
      }

      let tempStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < allDates.length; i++) {
        const prevDate = new Date(allDates[i - 1]);
        const currDate = new Date(allDates[i]);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      if (isStreakActive) {
        maxStreak = Math.max(maxStreak, currentStreak);
      }
    }

    // Camera usage
    const cameraCounts: Record<string, number> = {};
    objects.forEach((obj) => {
      obj.projects.forEach((proj) => {
        proj.sessions.forEach((session: any) => {
          if (session.camera) {
            cameraCounts[session.camera] = (cameraCounts[session.camera] || 0) + (session.lights || 0);
          }
        });
      });
    });
    const totalCameraLights = Object.values(cameraCounts).reduce((sum, count) => sum + count, 0);

    // Telescope usage
    const telescopeCounts: Record<string, { seconds: number; lights: number }> = {};
    objects.forEach((obj) => {
      obj.projects.forEach((proj) => {
        proj.sessions.forEach((session: any) => {
          if (session.telescope) {
            const seconds = (session.lights || 0) * (session.exposureSec || 0);
            const lights = session.lights || 0;
            if (!telescopeCounts[session.telescope]) {
              telescopeCounts[session.telescope] = { seconds: 0, lights: 0 };
            }
            telescopeCounts[session.telescope].seconds += seconds;
            telescopeCounts[session.telescope].lights += lights;
          }
        });
      });
    });
    const totalTelescopeLights = Object.values(telescopeCounts).reduce((sum, data) => sum + data.lights, 0);

    // Most photographed constellation
    const constellationCounts: Record<string, number> = {};
    objects.forEach((obj) => {
      if (obj.constellation) {
        constellationCounts[obj.constellation] = (constellationCounts[obj.constellation] || 0) + 1;
      }
    });
    const mostPhotographedConstellation = Object.entries(constellationCounts).sort(([, a], [, b]) => b - a)[0];

    // ONP vs SNP
    let onpCount = 0;
    let snpCount = 0;
    objects.forEach((obj) => {
      obj.projects.forEach((proj: any) => {
        if (proj.projectType === "ONP") {
          onpCount++;
        } else if (proj.projectType === "SNP") {
          snpCount++;
        } else {
          onpCount++;
        }
      });
    });

    // Photo ratings
    let rating3Count = 0;
    let rating2Count = 0;
    let rating1Count = 0;
    objects.forEach((obj) => {
      obj.projects.forEach((proj: any) => {
        const ratings = proj.ratings || {};
        Object.values(ratings).forEach((rating: any) => {
          if (rating === 3) rating3Count++;
          else if (rating === 2) rating2Count++;
          else if (rating === 1) rating1Count++;
        });
      });
    });
    const totalRated = rating3Count + rating2Count + rating1Count;

    // SNR record
    let maxSNR = 0;
    let maxSNRObject = "";
    let maxSNRProject = "";
    objects.forEach((obj) => {
      obj.projects.forEach((proj: any) => {
        proj.sessions.forEach((session: any) => {
          const sessionMean = mean(session);
          if (sessionMean !== null && sessionMean > maxSNR) {
            maxSNR = sessionMean;
            maxSNRObject = obj.id;
            maxSNRProject = proj.name;
          }
        });
      });
    });

    // RMS records (lowest P50 and P68)
    let minP50Rms = Infinity;
    let minP50RmsObject = "";
    let minP50RmsProject = "";
    let minP50RmsProjectId = "";
    let minP68Rms = Infinity;
    let minP68RmsObject = "";
    let minP68RmsProject = "";
    let minP68RmsProjectId = "";
    
    objects.forEach((obj) => {
      obj.projects.forEach((proj: any) => {
        proj.sessions.forEach((session: any) => {
          if (session.phd2Analysis) {
            const analysis = session.phd2Analysis;
            if (analysis.medianRms !== undefined && analysis.medianRms > 0 && analysis.medianRms < minP50Rms) {
              minP50Rms = analysis.medianRms;
              minP50RmsObject = obj.id;
              minP50RmsProject = proj.name;
              minP50RmsProjectId = proj.id;
            }
            if (analysis.p68Rms !== undefined && analysis.p68Rms > 0 && analysis.p68Rms < minP68Rms) {
              minP68Rms = analysis.p68Rms;
              minP68RmsObject = obj.id;
              minP68RmsProject = proj.name;
              minP68RmsProjectId = proj.id;
            }
          }
        });
      });
    });
    
    // Convert Infinity to 0 if no data found
    if (minP50Rms === Infinity) minP50Rms = 0;
    if (minP68Rms === Infinity) minP68Rms = 0;

    // Hours by year
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    objects.forEach((obj) => {
      obj.projects.forEach((proj) => {
        proj.sessions.forEach((session: any) => {
          if (session.date) {
            const year = new Date(session.date).getFullYear();
            if (!years.includes(year)) years.push(year);
          }
        });
      });
    });
    years.sort();
    const minYear = years.length > 0 ? years[0] : currentYear;

    return {
      totalObjects,
      totalProjects,
      activeProjects,
      activeProjectsPercentage,
      totalHours,
      totalLights,
      totalNights,
      totalSessions,
      maxExposureObj,
      currentStreak,
      maxStreak,
      cameraCounts,
      totalCameraLights,
      telescopeCounts,
      totalTelescopeLights,
      mostPhotographedConstellation,
      constellationCounts,
      onpCount,
      snpCount,
      rating3Count,
      rating2Count,
      rating1Count,
      totalRated,
      maxSNR,
      maxSNRObject,
      maxSNRProject,
      currentYear,
      minYear,
      years,
      minP50Rms,
      minP50RmsObject,
      minP50RmsProject,
      minP50RmsProjectId,
      minP68Rms,
      minP68RmsObject,
      minP68RmsProject,
      minP68RmsProjectId,
    };
  }, [objects]);

  return (
    <div className={theme === "dark" ? "dark" : ""} data-theme={theme}>
      <style>{`
        [data-theme="astro"] {
          --gradient-start: #ffa07a;
          --gradient-mid: #ff6b4a;
          --gradient-end: #1e3a8a;
          --card-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 160, 122, 0.3) 100%);
          --card-border: rgba(255, 160, 122, 0.3);
        }
        [data-theme="astro"] .astro-bg {
          background: linear-gradient(135deg, #ffe4d6 0%, #ffa07a 25%, #ff6b4a 50%, #3b5998 75%, #1e3a8a 100%);
        }
        [data-theme="astro"] [data-card] {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 160, 122, 0.3) 100%);
          border: none !important;
        }
        [data-theme="astro"] .astro-btn {
          background: linear-gradient(135deg, #ffa07a 0%, #ff6b4a 100%);
          color: white;
          border: none;
        }
        [data-theme="astro"] .astro-btn:hover {
          background: linear-gradient(135deg, #ff8f69 0%, #ff5a39 100%);
        }
        [data-theme="astro"] .astro-text {
          background: linear-gradient(135deg, #ffa07a 0%, #1e3a8a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        [data-theme="astro"] .astro-border {
          border-color: rgba(255, 160, 122, 0.4);
        }
        [data-theme="astro"] h1, 
        [data-theme="astro"] h2, 
        [data-theme="astro"] h3, 
        [data-theme="astro"] h4 {
          background: linear-gradient(135deg, #ff6b4a 0%, #1e3a8a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        [data-theme="light"] {
          --card-bg: rgba(255, 255, 255, 0.7);
          --card-border: rgb(226 232 240);
        }
        [data-theme="light"].dark {
          --card-bg: transparent;
          --card-border: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div
        className={`min-h-screen overflow-x-hidden ${theme === "astro" ? "astro-bg" : "bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950"} text-slate-900 dark:text-slate-100`}
      >
        <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800/70 pt-[env(safe-area-inset-top)] md:pt-0">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  setView("objects");
                  setSelectedObjectId(null);
                  setSelectedProjectId(null);
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <img src={theme === "dark" ? logoDark : logoLight} alt="AstroBoard" className="h-10 w-10 md:h-14 md:w-14" />
              </button>
              {/* Hide name on mobile, show on md+ */}
              <div className="hidden md:block">
                <div className="font-semibold">AstroBoard</div>
                <div className="text-xs text-slate-500">
                  {view === "objects" ? "Dashboard" : view === "projects" ? "Proyectos" : view === "project" ? "Sesiones" : view === "ratings" ? "Galería de Valoraciones" : view === "constellationDetail" ? `Constelación: ${selectedConstellation}` : view === "ephemerides" ? "Efemérides" : "ONP vs SNP"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {view !== "objects" && (
                <Btn
                  outline
                  onClick={() => {
                    if (view === "constellationDetail") {
                      setView("objects");
                      setSelectedConstellation("");
                    } else if (view === "project") {
                      setView("projects");
                      setSelectedProjectId(null);
                    } else if (view === "ratings" || view === "onp-snp" || view === "ephemerides") {
                      setView("objects");
                    } else {
                      setView("objects");
                      setSelectedObjectId(null);
                      setSelectedProjectId(null);
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">{t('back')}</span>
                </Btn>
              )}
              {/* Export button: icon only on mobile */}
              <IconBtn
                title={t('export')}
                onClick={exportJsonData}
              >
                <Download className="w-4 h-4" />
              </IconBtn>
              {/* Import button: icon only on mobile */}
              <label className="p-2 rounded-xl border bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition cursor-pointer" title={t('import')}>
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const importedFileName = f.name;
                    const text = await f.text();
                    let json;
                    try {
                      json = JSON.parse(text);
                    } catch {
                      alert("JSON no válido: el archivo no contiene JSON válido");
                      e.target.value = "";
                      return;
                    }

                    // Validar y sanitizar datos con Zod
                    const validationResult = validateJsonUpload(json);
                    if (!validationResult.success) {
                      alert(validationResult.error || "Error de validación");
                      e.target.value = "";
                      return;
                    }

                    const objectsData = validationResult.data!.objects;
                    const settingsData = validationResult.data!.settings;

                    // Procesar objetos
                    const processedObjects = objectsData.map((obj: any) => {
                      if (obj.projects && Array.isArray(obj.projects)) {
                        const processedProjects = obj.projects.map((proj: any) => {
                          // Recopilar todos los filtros únicos de las sesiones
                          const allFiltersFromSessions = new Set<string>();

                          console.log("📦 Procesando proyecto:", proj.name);
                          console.log("📦 Sesiones en proyecto:", proj.sessions);

                          // Buscar filtros directamente en proj.sessions
                          if (proj.sessions && Array.isArray(proj.sessions)) {
                            proj.sessions.forEach((session: any) => {
                              if (session.filter) {
                                console.log("✅ Filtro encontrado:", session.filter);
                                allFiltersFromSessions.add(session.filter);
                              }
                            });
                          }

                          // También buscar en paneles por compatibilidad con formatos antiguos
                          if (proj.panels && Array.isArray(proj.panels)) {
                            proj.panels.forEach((panel: any) => {
                              if (panel.sessions && Array.isArray(panel.sessions)) {
                                panel.sessions.forEach((session: any) => {
                                  if (session.filter) {
                                    console.log("✅ Filtro encontrado en panel:", session.filter);
                                    allFiltersFromSessions.add(session.filter);
                                  }
                                });
                              }
                            });
                          }

                          // Combinar filtros existentes del proyecto con los encontrados en las sesiones
                          const existingFilters = proj.filters || [];
                          const combinedFilters = [
                            ...new Set([...existingFilters, ...Array.from(allFiltersFromSessions)]),
                          ];

                          console.log("🎯 Filtros finales para proyecto:", proj.name, combinedFilters);

                          return {
                            ...proj,
                            filters: combinedFilters,
                          };
                        });

                        return {
                          ...obj,
                          projects: processedProjects,
                        };
                      }
                      return obj;
                    });

                    setObjects(processedObjects);

                    // Restaurar settings si existen
                    if (settingsData) {
                      if (settingsData.userName) setUserName(settingsData.userName);
                      if (settingsData.cameras && Array.isArray(settingsData.cameras)) {
                        setCameras(settingsData.cameras.length > 0 ? settingsData.cameras : [""]);
                      }
                      if (settingsData.telescopes && Array.isArray(settingsData.telescopes)) {
                        setTelescopes(
                          settingsData.telescopes.length > 0
                            ? settingsData.telescopes
                            : [{ name: "", focalLength: "" }],
                        );
                      }
                      if (settingsData.locations && Array.isArray(settingsData.locations)) {
                        setLocations(
                          settingsData.locations.length > 0 ? settingsData.locations : [{ name: "", coords: "" }],
                        );
                      }
                      if (settingsData.mainLocation) setMainLocation(settingsData.mainLocation);
                      if (settingsData.guideTelescope) setGuideTelescope(settingsData.guideTelescope);
                      if (settingsData.guideCamera) setGuideCamera(settingsData.guideCamera);
                      if (settingsData.mount) setMount(settingsData.mount);
                      if (settingsData.dateFormat) setDateFormat(settingsData.dateFormat);
                      if (settingsData.minAltitudeLimit !== undefined) setMinAltitudeLimit(settingsData.minAltitudeLimit);
                      if (settingsData.defaultTheme) {
                        setDefaultTheme(settingsData.defaultTheme);
                        setTheme(settingsData.defaultTheme);
                      }
                      if (settingsData.jsonPath) setJsonPath(settingsData.jsonPath);
                      else setJsonPath(importedFileName);
                      if (settingsData.visibleHighlights) setVisibleHighlights(settingsData.visibleHighlights);
                      if (settingsData.language && (settingsData.language === 'es' || settingsData.language === 'en')) {
                        setLanguage(settingsData.language);
                      }
                      // Guardar settings en localStorage
                      const settings = {
                        defaultTheme: settingsData.defaultTheme || defaultTheme,
                        jsonPath: settingsData.jsonPath || importedFileName,
                        cameras: settingsData.cameras || cameras.filter((c) => c.trim() !== ""),
                        telescopes: settingsData.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                        locations: settingsData.locations || locations.filter((l) => l.name.trim() !== ""),
                        mainLocation: settingsData.mainLocation || mainLocation,
                        guideTelescope: settingsData.guideTelescope || guideTelescope,
                        guideCamera: settingsData.guideCamera || guideCamera,
                        mount: settingsData.mount || mount,
                        dateFormat: settingsData.dateFormat || dateFormat,
                        userName: settingsData.userName || userName,
                        visibleHighlights: settingsData.visibleHighlights || visibleHighlights,
                        language: settingsData.language || language,
                        minAltitudeLimit: settingsData.minAltitudeLimit !== undefined ? settingsData.minAltitudeLimit : minAltitudeLimit,
                      };
                      localStorage.setItem("astroTrackerSettings", JSON.stringify(settings));
                    } else {
                      // Si no hay settingsData, igual guardar el nombre del archivo
                      setJsonPath(importedFileName);
                      const currentSettings = localStorage.getItem("astroTrackerSettings");
                      const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};
                      parsedSettings.jsonPath = importedFileName;
                      localStorage.setItem("astroTrackerSettings", JSON.stringify(parsedSettings));
                    }

                    // SOBRESCRIBIR plannedProjects - siempre reemplazar con los datos del JSON
                    // Si el JSON no tiene plannedProjects, se establecerá un array vacío
                    const importedPlanned = (json.plannedProjects && Array.isArray(json.plannedProjects)) 
                      ? json.plannedProjects 
                      : [];
                    // Siempre sobrescribir, incluso si está vacío
                    setPlannedProjects(importedPlanned);
                    localStorage.setItem("astroTrackerPlannedProjects", JSON.stringify(importedPlanned));

                    // Force immediate cloud sync for imported data
                    if (cloudSyncRef.current.isCloudEnabled) {
                      console.log('[Import] Triggering force cloud sync with await');
                      // Build the complete settings object to sync
                      const settingsForSync = {
                        defaultTheme: settingsData?.defaultTheme || defaultTheme,
                        jsonPath: settingsData?.jsonPath || importedFileName,
                        cameras: settingsData?.cameras || cameras.filter((c) => c.trim() !== ""),
                        telescopes: settingsData?.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                        mainLocation: settingsData?.mainLocation || mainLocation,
                        locations: settingsData?.locations || locations.filter((l) => l.name.trim() !== ""),
                        guideTelescope: settingsData?.guideTelescope || guideTelescope,
                        guideCamera: settingsData?.guideCamera || guideCamera,
                        mount: settingsData?.mount || mount,
                        userName: settingsData?.userName || userName,
                        dateFormat: settingsData?.dateFormat || dateFormat,
                        minAltitudeLimit: settingsData?.minAltitudeLimit !== undefined ? settingsData.minAltitudeLimit : minAltitudeLimit,
                      };
                      const syncSuccess = await forceCloudSync(processedObjects, importedPlanned, settingsForSync);
                      if (syncSuccess) {
                        toast({
                          title: 'Datos sincronizados',
                          description: 'Los datos importados se han guardado en la nube correctamente',
                        });
                      } else {
                        toast({
                          title: 'Error de sincronización',
                          description: 'Los datos se cargaron localmente pero no se pudieron guardar en la nube',
                          variant: 'destructive',
                        });
                      }
                    }

                    setHasImportedData(true);
                    setView("objects");
                    setSelectedObjectId(null);
                    setSelectedProjectId(null);
                    e.target.value = "";
                  }}
                />
              </label>
              <IconBtn
                title={
                  theme === "light" ? "Cambiar a oscuro" : theme === "dark" ? "Cambiar a Astro" : "Cambiar a claro"
                }
                onClick={cycleTheme}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : theme === "dark" ? (
                  <Star className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </IconBtn>
              <IconBtn title="Configuración" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
          {view === "objects" && (
            <div className="grid gap-4" key="view-objects">
              {/* Saludo personalizado con fase lunar */}
              {(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();

                let greeting = t('goodMorning');
                // Buenos días: 07:01 - 12:00
                // Buenas tardes: 12:01 - 20:00
                // Buenas noches: 20:01 - 07:00
                if ((hour === 12 && minute >= 1) || (hour > 12 && hour < 20)) {
                  greeting = t('goodAfternoon');
                } else if (hour >= 20 || hour < 7 || (hour === 7 && minute === 0)) {
                  greeting = t('goodEvening');
                }

                const moonPhase = calculateMoonPhase(now);
                
                // Parse coordinates from mainLocation
                let latitude = 40.4;
                let longitude = -3.7;
                if (mainLocation?.coords) {
                  const coords = mainLocation.coords.split(',').map(c => parseFloat(c.trim()));
                  if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    latitude = coords[0];
                    longitude = coords[1];
                  }
                }
                
                const moonTimes = calculateMoonTimes(now, latitude, longitude);
                const displayName = userName || '';

                const formatTime = (date: Date) => {
                  return date.toLocaleTimeString(language === 'en' ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" });
                };

                return (
                  <div className="mb-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                      {greeting}{displayName ? `, ${displayName}` : ''}
                    </h2>
                    {(objects.length > 0 || plannedProjects.length > 0) && (
                      <div className="space-y-1">
                        <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl">
                          {t('todayMoonPhase')} {formatMoonPhase(moonPhase, language)} • {moonPhase.illumination}% {t('illuminated')}
                        </p>
                        <p className="text-slate-500 dark:text-slate-500 text-base md:text-lg">
                          {t('risesAt')} {formatTime(moonTimes.moonrise)} • {t('setsAt')} {formatTime(moonTimes.moonset)} •{" "}
                          {formatHoursToHHMM(moonTimes.darkHours)} {t('totalDarkness')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Next Ephemeris Card */}
              {nextEphemeris && (
                <div className="mb-6">
                  <div 
                    onClick={() => setView("ephemerides")}
                    className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20 rounded-2xl p-6 border border-indigo-200/50 dark:border-indigo-500/30 cursor-pointer hover:scale-[1.02] transition-transform duration-200 overflow-hidden"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/20 dark:bg-indigo-500/30">
                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-1 truncate">
                          {t('nextEphemeris')}
                        </h3>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2 truncate">
                          {formatSpanishDate(nextEphemeris.date)}
                        </p>
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">
                          {language === 'en' ? nextEphemeris.eventEN : nextEphemeris.eventES}
                        </p>
                        {nextEphemeris.notes && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {nextEphemeris.notes}
                          </p>
                        )}
                        <div className="mt-2 inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                          {nextEphemeris.category}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Currently visible objects indicator - shows right after ephemeris */}
              {plannedProjects.length > 0 && (() => {
                const currentMonth = new Date().getMonth() + 1; // 1-12
                const MONTH_NAMES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const currentMonthName = language === 'en' ? MONTH_NAMES_EN[currentMonth - 1] : MONTH_NAMES_ES[currentMonth - 1];
                
                const visibleNow = plannedProjects.filter(planned => {
                  if (planned.isCircumpolar) return true;
                  if (!planned.orto || !planned.ocaso) return false;
                  
                  const ortoNum = parseInt(planned.orto);
                  const ocasoNum = parseInt(planned.ocaso);
                  
                  if (ortoNum <= ocasoNum) {
                    return currentMonth >= ortoNum && currentMonth <= ocasoNum;
                  } else {
                    // Crosses year boundary
                    return currentMonth >= ortoNum || currentMonth <= ocasoNum;
                  }
                });
                
                if (visibleNow.length === 0) {
                  return (
                    <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border overflow-hidden">
                      <p className="text-sm text-muted-foreground break-words">
                        {t('noPlannedObjectsVisible')} <span className="font-semibold">{currentMonthName}</span>
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 overflow-hidden">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 break-words">
                      🔭 {t('visibleObjectsIn')} <span className="font-bold">{currentMonthName}</span>: {visibleNow.map(p => p.objectId).join(", ")}
                    </p>
                  </div>
                );
              })()}

              {/* Image Carousel - Before Navigation Buttons */}
              {dashboardCarouselImages.length > 0 && (
                <div className="mb-6">
                  <ImageCarousel
                    images={dashboardCarouselImages}
                    onImageClick={(objectId, projectId) => {
                      setSelectedObjectId(objectId);
                      setSelectedProjectId(projectId);
                      setView("project");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              )}

              {/* Active Projects Visibility Chart - After Carousel, Before Navigation */}
              {(() => {
                // Get objects with active projects
                const activeProjectObjects = objects.filter(obj => 
                  obj.projects.some((p: any) => p.status === "active" || p.status === "paused")
                );
                
                if (activeProjectObjects.length > 0 && mainLocation?.coords) {
                  const activeObjects = activeProjectObjects.map(obj => ({
                    id: obj.id,
                    objectId: obj.id,
                    objectName: obj.commonName,
                    signal: undefined,
                  }));
                  
                  return (
                    <div className="mb-6">
                      <Card className="p-4">
                        <MultiObjectVisibilityChart
                          objects={activeObjects}
                          coordinates={mainLocation.coords}
                          date={new Date()}
                          language={language}
                          altitudeLimit={minAltitudeLimit}
                          title={language === 'en' ? 'Night Visibility - Active Projects' : 'Visibilidad Nocturna - Proyectos Activos'}
                        />
                      </Card>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Navigation Buttons - Hidden on mobile, shown on md+ */}
              <div className="hidden md:grid md:grid-cols-5 gap-2 mb-6">
                <button
                  onClick={() => setMainSection("pronostico")}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-sm min-w-0 overflow-hidden ${
                    mainSection === "pronostico"
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${mainSection === "pronostico" ? "bg-primary-foreground/20" : "bg-background"}`}>
                    <CloudSun className={`w-5 h-5 ${mainSection === "pronostico" ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {t('forecast')}
                  </span>
                </button>

                <button
                  onClick={() => setMainSection("planificacion")}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-sm min-w-0 overflow-hidden ${
                    mainSection === "planificacion"
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${mainSection === "planificacion" ? "bg-primary-foreground/20" : "bg-background"}`}>
                    <Calendar className={`w-5 h-5 ${mainSection === "planificacion" ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {t('planning')}
                  </span>
                </button>

                <button
                  onClick={() => setMainSection("objetos")}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-sm min-w-0 overflow-hidden ${
                    mainSection === "objetos"
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${mainSection === "objetos" ? "bg-primary-foreground/20" : "bg-background"}`}>
                    <Telescope className={`w-5 h-5 ${mainSection === "objetos" ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {t('objectsSection')}
                  </span>
                </button>

                <button
                  onClick={() => setMainSection("estadisticas")}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-sm min-w-0 overflow-hidden ${
                    mainSection === "estadisticas"
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${mainSection === "estadisticas" ? "bg-primary-foreground/20" : "bg-background"}`}>
                    <BarChart3 className={`w-5 h-5 ${mainSection === "estadisticas" ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {t('statisticsSection')}
                  </span>
                </button>

                <button
                  onClick={() => setMainSection("galeria")}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-sm min-w-0 overflow-hidden ${
                    mainSection === "galeria"
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${mainSection === "galeria" ? "bg-primary-foreground/20" : "bg-background"}`}>
                    <ImageIcon className={`w-5 h-5 ${mainSection === "galeria" ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {t('gallery')}
                  </span>
                </button>
              </div>

              {/* SECTION: Pronóstico */}
              {mainSection === "pronostico" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CloudSun className="w-6 h-6" /> {t('weatherForecast')}
                  </h2>
                  
                  {/* Weather for each location */}
                  {(() => {
                    const allLocations = [
                      mainLocation,
                      ...locations.filter(l => l.name.trim() && l.coords.trim() && l.name !== mainLocation?.name)
                    ].filter(l => l?.name?.trim() && l?.coords?.trim());

                    if (allLocations.length === 0) {
                      return (
                        <Card className="p-8 text-center">
                          <CloudSun className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground mb-4">
                            No tienes localizaciones configuradas para ver el pronóstico
                          </p>
                          <Btn onClick={() => setShowSettings(true)}>
                            <Settings className="w-4 h-4" /> Configurar localizaciones
                          </Btn>
                        </Card>
                      );
                    }

                    const getWeatherIcon = (code: number) => {
                      if (code === 0) return "☀️";
                      if (code <= 3) return "⛅";
                      if (code <= 48) return "☁️";
                      if (code <= 67) return "🌧️";
                      if (code <= 77) return "🌨️";
                      if (code <= 82) return "🌦️";
                      if (code >= 95) return "⛈️";
                      return "🌤️";
                    };

                    const getWeatherDescription = (code: number) => {
                      if (code === 0) return "Cielo despejado";
                      if (code <= 3) return "Parcialmente nublado";
                      if (code <= 48) return "Nublado";
                      if (code <= 67) return "Lluvia";
                      if (code <= 77) return "Nieve";
                      if (code <= 82) return "Chubascos";
                      if (code >= 95) return "Tormenta";
                      return "Variable";
                    };

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {allLocations.map((loc, idx) => (
                          <WeatherCard 
                            key={`${loc.name}-${idx}`} 
                            location={loc} 
                            getWeatherIcon={getWeatherIcon}
                            getWeatherDescription={getWeatherDescription}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SECTION: Planificación */}
              {mainSection === "planificacion" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Calendar className="w-6 h-6" /> Proyectos Planificados
                    </h2>
                    <Btn onClick={() => setMPlanned(true)}>
                      <Plus className="w-4 h-4" /> Nueva planificación
                    </Btn>
                  </div>
                  
                  {plannedProjects.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {language === 'en' ? 'No planning data yet. Create your first planned project.' : 'No hay datos de planificación todavía. Crea tu primer proyecto planificado.'}
                      </p>
                    </Card>
                  ) : (
                  <>
                  <p className="text-muted-foreground">
                    Aquí puedes planificar tus próximos proyectos de astrofotografía. Cuando estés listo, podrás convertirlos en proyectos reales.
                  </p>
                  {plannedProjects.length > 0 && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Visibilidad Anual
                      </h3>
                      <div className="space-y-2">
                        {/* Month headers */}
                        <div className="flex">
                          <div className="w-24 flex-shrink-0" />
                          <div className="flex-1 grid grid-cols-12 gap-px text-xs text-center text-muted-foreground">
                            {["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                              <div key={i} className="py-1">{m}</div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Object visibility bars */}
                        {plannedProjects.map((planned, idx) => {
                          // Signal-based colors - each signal type has a unique color
                          const signalColors: Record<string, string> = {
                            "RGB": "bg-emerald-500",
                            "LRGB": "bg-blue-500",
                            "HA": "bg-rose-500",
                            "OIII": "bg-cyan-500",
                            "HA + OIII": "bg-purple-500",
                            "RGB+HA/OIII": "bg-amber-500",
                          };
                          const barColor = planned.signal ? signalColors[planned.signal] || "bg-slate-400" : "bg-slate-400";
                          
                          // Calculate which months are visible
                          const getVisibleMonths = () => {
                            if (planned.isCircumpolar) {
                              return Array(12).fill(true);
                            }
                            if (!planned.orto || !planned.ocaso) {
                              return Array(12).fill(false);
                            }
                            const ortoNum = parseInt(planned.orto);
                            const ocasoNum = parseInt(planned.ocaso);
                            const visible = Array(12).fill(false);
                            
                            if (ortoNum <= ocasoNum) {
                              for (let i = ortoNum - 1; i <= ocasoNum - 1; i++) {
                                visible[i] = true;
                              }
                            } else {
                              // Crosses year boundary
                              for (let i = ortoNum - 1; i < 12; i++) {
                                visible[i] = true;
                              }
                              for (let i = 0; i <= ocasoNum - 1; i++) {
                                visible[i] = true;
                              }
                            }
                            return visible;
                          };
                          
                          const visibleMonths = getVisibleMonths();
                          
                          // Check if month is the zenith month - convert month name to index
                          const MONTH_NAMES_FOR_CENIT = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                          const cenitMonthIdx = planned.cenit ? MONTH_NAMES_FOR_CENIT.indexOf(planned.cenit) : -1;
                          
                          return (
                            <div key={planned.id} className="flex items-center">
                              <div className="w-24 flex-shrink-0 text-xs font-medium truncate pr-2" title={planned.objectId}>
                                {planned.objectId}
                              </div>
                              <div className="flex-1 grid grid-cols-12 gap-px">
                                {visibleMonths.map((isVisible, monthIdx) => {
                                  const isZenith = monthIdx === cenitMonthIdx && isVisible;
                                  return (
                                    <div
                                      key={monthIdx}
                                      className={`h-4 rounded-sm transition-colors relative overflow-hidden ${
                                        isVisible
                                          ? barColor
                                          : "bg-muted-foreground/20"
                                      }`}
                                      title={isVisible ? `${planned.objectId}${isZenith ? " (Cenit)" : ""}` : ""}
                                    >
                                      {isZenith && (
                                        <div 
                                          className="absolute inset-0"
                                          style={{
                                            background: `repeating-linear-gradient(
                                              -45deg,
                                              transparent,
                                              transparent 3px,
                                              rgba(0, 0, 0, 0.5) 3px,
                                              rgba(0, 0, 0, 0.5) 6px
                                            )`
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Current month indicator */}
                        <div className="flex mt-2">
                          <div className="w-24 flex-shrink-0" />
                          <div className="flex-1 grid grid-cols-12 gap-px">
                            {Array(12).fill(null).map((_, i) => {
                              const currentMonth = new Date().getMonth();
                              return (
                                <div
                                  key={i}
                                  className={`h-1 rounded-full ${
                                    i === currentMonth
                                      ? "bg-foreground"
                                      : "bg-transparent"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Multi-Object Nocturnal Visibility Chart */}
                  {plannedProjects.length > 0 && mainLocation?.coords && (
                    <Card className="p-4">
                      <MultiObjectVisibilityChart
                        objects={plannedProjects.map(p => ({
                          id: p.id,
                          objectId: p.objectId,
                          objectName: p.objectName,
                          signal: p.signal,
                        }))}
                        coordinates={mainLocation.coords}
                        date={new Date()}
                        language={language}
                        altitudeLimit={minAltitudeLimit}
                        title={language === 'en' ? 'Night Visibility - Planned Objects' : 'Visibilidad Nocturna - Objetos Planificados'}
                      />
                    </Card>
                  )}

                  {/* Search and Filters */}
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sorting buttons */}
                      {plannedProjects.length > 0 && (
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <button 
                            onClick={() => setPlannedSortMode("alpha")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${plannedSortMode === "alpha" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                            title="Ordenar alfabéticamente (A-Z)"
                          >
                            A-Z
                          </button>
                          <button 
                            onClick={() => setPlannedSortMode("chrono")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${plannedSortMode === "chrono" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                            title="Ordenar cronológicamente"
                          >
                            1-3
                          </button>
                        </div>
                      )}
                      
                      {/* Search input */}
                      <div className="relative flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={plannedSearchText}
                          onChange={(e) => setPlannedSearchText(e.target.value)}
                          placeholder="Buscar por objeto, nombre o descripción..."
                          className={`${INPUT_CLS} w-full pl-10`}
                        />
                        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        {plannedSearchText && (
                          <button
                            onClick={() => setPlannedSearchText("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <Btn outline onClick={() => setShowPlannedFilters(!showPlannedFilters)}>
                        {showPlannedFilters ? "Ocultar filtros" : "Filtros avanzados"}
                      </Btn>
                    </div>
                    
                    {/* Advanced Filters Panel */}
                    {showPlannedFilters && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Constelación</span>
                          <select
                            value={plannedFilterConstellation}
                            onChange={(e) => setPlannedFilterConstellation(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todas</option>
                            {[...new Set(plannedProjects.map(p => p.constellation).filter(Boolean))].sort().map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Señal</span>
                          <select
                            value={plannedFilterSignal}
                            onChange={(e) => setPlannedFilterSignal(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todas</option>
                            {[...new Set(plannedProjects.map(p => p.signal).filter(Boolean))].sort().map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Prioridad</span>
                          <select
                            value={plannedFilterPriority}
                            onChange={(e) => setPlannedFilterPriority(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todas</option>
                            <option value="Alta">Alta</option>
                            <option value="Media">Media</option>
                            <option value="Baja">Baja</option>
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Cenit</span>
                          <select
                            value={plannedFilterCenit}
                            onChange={(e) => setPlannedFilterCenit(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todos</option>
                            <option value="proximo">Próximo</option>
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </label>
                        <div className="col-span-2 md:col-span-4 flex justify-end">
                          <Btn 
                            outline
                            onClick={() => {
                              setPlannedFilterConstellation("all");
                              setPlannedFilterSignal("all");
                              setPlannedFilterPriority("all");
                              setPlannedFilterCenit("all");
                              setPlannedSearchText("");
                            }}
                          >
                            Limpiar filtros
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Planned Projects Grid */}
                  {(() => {
                    // Filter by search text
                    let filteredPlanned = plannedProjects.filter((p) => {
                      if (!plannedSearchText.trim()) return true;
                      const search = plannedSearchText.toLowerCase();
                      return (
                        p.objectId?.toLowerCase().includes(search) ||
                        p.objectName?.toLowerCase().includes(search) ||
                        p.name?.toLowerCase().includes(search) ||
                        p.description?.toLowerCase().includes(search) ||
                        p.constellation?.toLowerCase().includes(search)
                      );
                    });
                    
                    // Apply advanced filters
                    if (plannedFilterConstellation !== "all") {
                      filteredPlanned = filteredPlanned.filter(p => p.constellation === plannedFilterConstellation);
                    }
                    if (plannedFilterSignal !== "all") {
                      filteredPlanned = filteredPlanned.filter(p => p.signal === plannedFilterSignal);
                    }
                    if (plannedFilterPriority !== "all") {
                      filteredPlanned = filteredPlanned.filter(p => p.prioridad === plannedFilterPriority);
                    }
                    if (plannedFilterCenit !== "all" && plannedFilterCenit !== "proximo") {
                      filteredPlanned = filteredPlanned.filter(p => p.cenit === plannedFilterCenit);
                    }
                    
                    // Apply sorting
                    const MONTH_NAMES_SORT = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    const currentMonthIdx = new Date().getMonth(); // 0-11
                    
                    const getMonthDistance = (cenitMonth: string | undefined): number => {
                      if (!cenitMonth) return 12; // No cenit = max distance
                      const cenitIdx = MONTH_NAMES_SORT.indexOf(cenitMonth);
                      if (cenitIdx === -1) return 12;
                      // Calculate circular distance (shortest path around the year)
                      const diff = cenitIdx - currentMonthIdx;
                      // We want future months first, so positive diff is preferred
                      if (diff >= 0) return diff;
                      return diff + 12; // Wrap around to next year
                    };
                    
                    const sortedPlanned = [...filteredPlanned].sort((a, b) => {
                      // If "proximo" filter is selected, always sort by proximity
                      if (plannedFilterCenit === "proximo") {
                        return getMonthDistance(a.cenit) - getMonthDistance(b.cenit);
                      }
                      
                      if (plannedSortMode === "alpha") {
                        return (a.objectId || "").localeCompare(b.objectId || "");
                      } else if (plannedSortMode === "priority") {
                        const priorityOrder: Record<string, number> = { "Alta": 0, "Media": 1, "Baja": 2 };
                        const aPriority = priorityOrder[a.prioridad] ?? 3;
                        const bPriority = priorityOrder[b.prioridad] ?? 3;
                        return aPriority - bPriority;
                      } else {
                        // chrono - most recent first
                        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                      }
                    });

                    if (sortedPlanned.length === 0) {
                      return (
                        <Card className="p-8 text-center">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground mb-4">
                            {plannedProjects.length === 0 
                              ? "No tienes proyectos planificados todavía"
                              : "No se encontraron proyectos que coincidan con los filtros"
                            }
                          </p>
                          {plannedProjects.length === 0 && (
                            <Btn onClick={() => setMPlanned(true)}>
                              <Plus className="w-4 h-4" /> Crear primera planificación
                            </Btn>
                          )}
                        </Card>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedPlanned.map((planned) => {
                          // Check if object exists and get its image
                          const existingObj = objects.find(
                            (o) => o.id.toLowerCase() === planned.objectId.toLowerCase()
                          );
                          const existingObjImage = existingObj?.image || 
                            (existingObj?.projects[existingObj.projects.length - 1] as any)?.finalImage;
                          
                          // Priority: existing object image > planned.objectImage (custom uploaded)
                          const thumbnailImage = existingObjImage || planned.objectImage || null;
                          
                          return (
                            <Card
                              key={planned.id}
                              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setSelectedPlannedId(planned.id)}
                            >
                              <div className="space-y-3">
                                {/* Thumbnail - image on top */}
                                <div className="relative">
                                  {thumbnailImage ? (
                                    <img
                                      src={thumbnailImage}
                                      alt={planned.objectId}
                                      className="w-full h-40 rounded-xl object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="w-full h-40 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                      <Telescope className="w-10 h-10 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  {/* Delete button positioned on top right of image */}
                                  <button
                                    title="Eliminar"
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm("¿Eliminar este proyecto planificado?")) {
                                        pendingChangesRef.current++; // Mark as user modification
                                        setPlannedProjects(plannedProjects.filter((p) => p.id !== planned.id));
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {/* Content - text below */}
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-lg font-bold truncate">{planned.objectId}</p>
                                      {planned.objectName && (
                                        <p className="text-sm text-muted-foreground truncate">{planned.objectName}</p>
                                      )}
                                    </div>
                                  </div>
                                  {planned.name && (
                                    <p className="text-sm font-medium truncate">{planned.name}</p>
                                  )}
                                  <div className="flex flex-wrap gap-1.5">
                                    {planned.constellation && <Badge className="text-xs">{planned.constellation}</Badge>}
                                    {planned.projectType && <Badge className="text-xs">{planned.projectType}</Badge>}
                                    {planned.signal && <Badge className="text-xs bg-secondary text-secondary-foreground">{planned.signal}</Badge>}
                                    {planned.teselas && <Badge className="text-xs border border-border bg-transparent">Teselas: {planned.teselas}</Badge>}
                                    {planned.cenit && <Badge className="text-xs border border-border bg-transparent">Cenit: {planned.cenit}</Badge>}
                                    {planned.prioridad && <Badge className={`text-xs ${planned.prioridad === "Alta" ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700" : planned.prioridad === "Media" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" : "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"}`}>Prioridad: {planned.prioridad}</Badge>}
                                  </div>
                                  
                                  {/* Compact Visibility Chart */}
                                  {mainLocation?.coords && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <VisibilityChart
                                        objectCode={planned.objectId}
                                        coordinates={mainLocation.coords}
                                        date={new Date()}
                                        compact={true}
                                        language={language}
                                        altitudeLimit={minAltitudeLimit}
                                        showToggle={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Planned Project Detail View */}
                  {selectedPlannedId && (() => {
                    const planned = plannedProjects.find((p) => p.id === selectedPlannedId);
                    if (!planned) return null;

                    return (
                      <Modal
                        open={true}
                        onClose={() => setSelectedPlannedId(null)}
                        title={`${planned.objectId} - ${planned.name}`}
                        wide
                      >
                        <div className="space-y-4">
                          {/* Encuadre Image */}
                          {planned.encuadreImage && (
                            <div>
                              <Label>Encuadre</Label>
                              <img
                                src={planned.encuadreImage}
                                alt="Encuadre"
                                className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700 mt-2 cursor-pointer"
                                onClick={() => {
                                  setImageModalSrc(planned.encuadreImage);
                                  setImageModalOpen(true);
                                }}
                              />
                            </div>
                          )}

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Objeto</Label>
                              <p className="font-medium">{planned.objectId}</p>
                              {planned.objectName && <p className="text-sm text-muted-foreground">{planned.objectName}</p>}
                            </div>
                            <div>
                              <Label>Constelación</Label>
                              <p className="font-medium">{planned.constellation || "—"}</p>
                            </div>
                            <div>
                              <Label>Tipo de objeto</Label>
                              <p className="font-medium">{planned.objectType || "—"}</p>
                            </div>
                            <div>
                              <Label>Nombre proyecto</Label>
                              <p className="font-medium">{planned.name || "—"}</p>
                            </div>
                          </div>

                          {/* Visibility Info */}
                          {(planned.orto || planned.ocaso || planned.isCircumpolar) && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Orto</Label>
                                <p className="font-medium">
                                  {planned.isCircumpolar ? "—" : planned.orto ? MONTHS.find(m => m.value === planned.orto)?.label : "—"}
                                </p>
                              </div>
                              <div>
                                <Label>Ocaso</Label>
                                <p className="font-medium">
                                  {planned.isCircumpolar ? "—" : planned.ocaso ? MONTHS.find(m => m.value === planned.ocaso)?.label : "—"}
                                </p>
                              </div>
                              <div>
                                <Label>Visible</Label>
                                <p className="font-medium">
                                  {planned.isCircumpolar ? "Circumpolar (12 meses)" : planned.visibleMonths ? `${planned.visibleMonths} meses` : "—"}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Detailed Visibility Chart */}
                          {mainLocation?.coords && (
                            <div className="pt-4 border-t border-border">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                {language === 'en' ? 'Visibility Chart' : 'Gráfico de Visibilidad'}
                              </h4>
                              <VisibilityChart
                                objectCode={planned.objectId}
                                coordinates={mainLocation.coords}
                                date={new Date()}
                                compact={false}
                                language={language}
                                altitudeLimit={minAltitudeLimit}
                                showToggle={true}
                              />
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-4 border-t">
                            <Btn
                              outline
                              onClick={() => setSelectedPlannedId(null)}
                            >
                              Cerrar
                            </Btn>
                            <Btn
                              outline
                              onClick={() => {
                                setEditingPlannedId(planned.id);
                                setSelectedPlannedId(null);
                              }}
                            >
                              <Pencil className="w-4 h-4" /> Editar
                            </Btn>
                            <Btn
                              onClick={() => {
                                // Check if object exists
                                const existingObj = objects.find(
                                  (o) => o.id.toLowerCase() === planned.objectId.toLowerCase()
                                );

                                if (existingObj) {
                                  // Object exists, set up to create project for it
                                  setSelectedObjectId(existingObj.id);
                                  setPlannedFromPlan(planned);
                                  setMProj(true);
                                } else {
                                  // Need to create object first
                                  const newObj = {
                                    id: planned.objectId,
                                    commonName: planned.objectName || "",
                                    constellation: planned.constellation || "",
                                    type: planned.objectType || "",
                                    createdAt: new Date().toISOString(),
                                    projects: [],
                                    image: undefined,
                                  };
                                  setObjects([...objects, newObj]);
                                  setSelectedObjectId(newObj.id);
                                  setPlannedFromPlan(planned);
                                  setMProj(true);
                                }
                                setSelectedPlannedId(null);
                              }}
                            >
                              <Plus className="w-4 h-4" /> Crear proyecto
                            </Btn>
                          </div>
                        </div>
                      </Modal>
                    );
                  })()}
                  </>
                  )}
                </div>
              )}

              {/* SECTION: Objetos */}
              {mainSection === "objetos" && (
                <>

                  {/* Objects Section Title and Controls */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Telescope className="w-5 h-5" />
                      <h3 className="text-xl md:text-2xl font-bold">{t('astronomicalObjects')}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {objects.length > 0 && (
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <button 
                            onClick={() => setSortObjects("alpha")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortObjects === "alpha" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                            title={language === 'en' ? "Sort alphabetically (A-Z)" : "Ordenar alfabéticamente (A-Z)"}
                          >
                            A-Z
                          </button>
                          <button 
                            onClick={() => setSortObjects("recent")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortObjects === "recent" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                            title={language === 'en' ? "Sort by most recent" : "Ordenar por más recientes"}
                          >
                            1-3
                          </button>
                        </div>
                      )}
                      <Btn onClick={() => setMObj(true)}>
                        <Plus className="w-4 h-4" /> <span className="hidden md:inline">{t('newObject')}</span><span className="md:hidden">{language === 'en' ? 'New' : 'Nuevo'}</span>
                      </Btn>
                    </div>
                  </div>

                  {objects.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Telescope className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {language === 'en' ? 'No objects yet. Create your first object.' : 'No hay objetos todavía. Crea tu primer objeto.'}
                      </p>
                    </Card>
                  ) : (
                  <>

                  {/* Search and Filters */}
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Buscar por código, nombre, constelación o tipo..."
                          className={`${INPUT_CLS} w-full pl-10`}
                        />
                        <Telescope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        {searchText && (
                          <button
                            onClick={() => setSearchText("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Btn outline onClick={() => setShowFilters(!showFilters)}>
                        {showFilters ? "Ocultar filtros" : "Filtros avanzados"}
                      </Btn>
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <label className="grid gap-1">
                          <Label>Filtrar por constelación</Label>
                          <select
                            value={filterConstellation}
                            onChange={(e) => setFilterConstellation(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todas las constelaciones</option>
                            {constellations.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <Label>Filtrar por tipo</Label>
                          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={INPUT_CLS}>
                            <option value="all">Todos los tipos</option>
                            {types.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <Label>Filtrar por estado</Label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="all">Todos los estados</option>
                            <option value="active">Activo</option>
                            <option value="paused">Pausado</option>
                            <option value="closed">Terminado</option>
                          </select>
                        </label>
                        {(filterConstellation !== "all" || filterType !== "all" || filterStatus !== "all") && (
                          <div className="md:col-span-3">
                            <Btn
                              outline
                              onClick={() => {
                                setFilterConstellation("all");
                                setFilterType("all");
                                setFilterStatus("all");
                              }}
                            >
                              Limpiar filtros
                            </Btn>
                          </div>
                        )}
                      </div>
                    )}

                    {(searchText || filterConstellation !== "all" || filterType !== "all") && (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {filteredObjects.length} objeto(s) encontrado(s)
                      </div>
                    )}
                  </div>

                  {/* Separar objetos con proyectos activos y archivados */}
                  {(() => {
                    const sortedObjects = filteredObjects.slice().sort((a, b) => {
                      if (sortObjects === "alpha") return a.id.localeCompare(b.id);
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });
                    
                    // Objetos con al menos un proyecto activo o pausado
                    const activeObjects = sortedObjects.filter((o) => 
                      o.projects.some((p: any) => p.status === "active" || p.status === "paused")
                    );
                    
                    // Objetos donde todos los proyectos están cerrados/terminados
                    const archivedObjects = sortedObjects.filter((o) => 
                      o.projects.every((p: any) => p.status === "closed" || p.status === "completed")
                    );

                    const renderObjectCard = (o: any) => {
                      const all = o.projects.flatMap((p: any) => p.sessions);
                      const seconds = totalExposureSec(all);
                      const nights = new Set(all.map((s: any) => s.date)).size;
                      const displayImage = o.image || (o.projects[o.projects.length - 1] as any)?.finalImage || null;
                      
                      return (
                        <Card
                          key={o.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedObjectId(o.id);
                            setView("projects");
                          }}
                        >
                          <div className="space-y-3">
                            {/* Thumbnail - image on top */}
                            <div className="relative">
                              {displayImage ? (
                                <img
                                  src={displayImage}
                                  alt={o.id}
                                  className="w-full h-40 rounded-xl object-cover border border-border"
                                />
                              ) : (
                                <div className="w-full h-40 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                  <Telescope className="w-10 h-10 text-muted-foreground/50" />
                                </div>
                              )}
                              {/* Delete button positioned on top right of image */}
                              <button
                                title="Eliminar"
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  delObj(o.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Content - text below */}
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditObjectOriginalId(o.id);
                                      setEditObjectData({
                                        id: o.id,
                                        commonName: o.commonName || "",
                                        constellation: o.constellation || "",
                                        type: o.type || "",
                                      });
                                      setShowEditObjectModal(true);
                                    }}
                                    className="text-lg font-bold truncate hover:underline text-left"
                                    title="Clic para editar"
                                  >
                                    {o.id}
                                  </button>
                                  {o.commonName && (
                                    <p className="text-sm text-muted-foreground truncate">
                                      {o.commonName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {o.constellation && <Badge>{o.constellation}</Badge>}
                                {o.type && <Badge>{o.type}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {o.projects.length} proy. · {nights} noche(s) · {hh(seconds)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        {/* Sección de Proyectos Activos - Colapsable */}
                        {activeObjects.length > 0 && (
                          <Collapsible defaultOpen={true}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                              <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                {language === 'en' ? 'Active Projects' : 'Proyectos Activos'}
                                <span className="text-sm font-normal text-muted-foreground">({activeObjects.length})</span>
                              </h4>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {activeObjects.map(renderObjectCard)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Sección de Archivo - Colapsable */}
                        {archivedObjects.length > 0 && (
                          <Collapsible defaultOpen={true}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                              <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-slate-500" />
                                {language === 'en' ? 'Archive' : 'Archivo'}
                                <span className="text-sm font-normal text-muted-foreground">({archivedObjects.length})</span>
                              </h4>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {archivedObjects.map(renderObjectCard)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Si no hay objetos activos ni archivados (solo por si acaso) */}
                        {activeObjects.length === 0 && archivedObjects.length === 0 && (
                          <Card className="p-8 text-center">
                            <Telescope className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {language === 'en' ? 'No objects match your filters.' : 'No hay objetos que coincidan con los filtros.'}
                            </p>
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                  </>
                  )}
                </>
              )}

              {/* SECTION: Métricas */}
              {mainSection === "estadisticas" && (
                <>
                  {/* Título de Highlights */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" /> {language === 'en' ? 'Metrics' : 'Métricas'}
                    </h2>
                    <button
                      onClick={() => setShowStatsConfig(true)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title={language === 'en' ? 'Configure visible metrics' : 'Configurar métricas visibles'}
                    >
                      <Settings className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  {/* Modal de configuración de métricas */}
                  <Modal open={showStatsConfig} onClose={() => setShowStatsConfig(false)} title={language === 'en' ? 'Configure Metrics' : 'Configurar Métricas'}>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {language === 'en' ? 'Select which metrics you want to show on the dashboard.' : 'Selecciona qué métricas quieres mostrar en el dashboard.'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalObjects}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalObjects: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Total de Objetos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalProjects}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalProjects: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Total de Proyectos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalHours}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalHours: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Horas Totales</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalLights}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalLights: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Lights Totales</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalNights}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalNights: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Noches</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.totalSessions}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, totalSessions: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Sesiones</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.onpSnp}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, onpSnp: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">ONP vs SNP</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.activeProjects}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, activeProjects: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Proyectos Activos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.ratedPhotos}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, ratedPhotos: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Fotos Valoradas</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.snrRecord}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, snrRecord: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">SNR Récord</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.hoursByYear}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, hoursByYear: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Horas por Año</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.mostPhotographedObject}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, mostPhotographedObject: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Objeto con Mayor Exposición</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.mostPhotographedConstellation}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, mostPhotographedConstellation: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Constelación Más Fotografiada</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.streaks}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, streaks: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Rachas Consecutivas</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.cameraUsage}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, cameraUsage: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Uso de Cámaras</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleHighlights.telescopeUsage}
                            onChange={(e) => setVisibleHighlights({ ...visibleHighlights, telescopeUsage: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Uso de Telescopios</span>
                        </label>
                      </div>
                      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setVisibleHighlights({
                            totalObjects: true,
                            totalProjects: true,
                            totalHours: true,
                            totalLights: true,
                            totalNights: true,
                            totalSessions: true,
                            onpSnp: true,
                            activeProjects: true,
                            ratedPhotos: true,
                            snrRecord: true,
                            hoursByYear: true,
                            mostPhotographedObject: true,
                            mostPhotographedConstellation: true,
                            streaks: true,
                            cameraUsage: true,
                            telescopeUsage: true,
                          })}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Activar todas
                        </button>
                        <button
                          onClick={() => setShowStatsConfig(false)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </Modal>

                  {objects.length === 0 ? (
                    <Card className="p-8 text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {language === 'en' ? 'No statistics yet. Create objects and sessions to see your data.' : 'No hay estadísticas todavía. Crea objetos y sesiones para ver tus datos.'}
                      </p>
                    </Card>
                  ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Total de Objetos */}
                    {visibleHighlights.totalObjects && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-500/10">
                            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total de Objetos</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalObjects}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Total de Proyectos */}
                    {visibleHighlights.totalProjects && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-indigo-500/10">
                            <FolderOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total de Proyectos</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalProjects}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Horas Totales */}
                    {visibleHighlights.totalHours && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-500/10">
                            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Horas Totales</div>
                            <div className="text-2xl font-bold">{hh(globalMetrics.totalHours * 3600)}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Lights Totales */}
                    {visibleHighlights.totalLights && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-amber-500/10">
                            <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Lights Totales</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalLights}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Noches */}
                    {visibleHighlights.totalNights && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-green-500/10">
                            <Moon className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Noches</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalNights}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Sesiones */}
                    {visibleHighlights.totalSessions && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-cyan-500/10">
                            <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Sesiones</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalSessions}</div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* ONP vs SNP Projects */}
                    {visibleHighlights.onpSnp && (
                      <Card 
                        className="p-5 cursor-pointer hover:shadow-lg transition-shadow ring-2 ring-emerald-500/70 dark:ring-emerald-400/70"
                        onClick={() => setView("onp-snp")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-teal-500/10">
                            <Telescope className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">ONP vs SNP</div>
                            <div className="text-2xl font-bold">
                              {globalMetrics.onpCount} / {globalMetrics.snpCount}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              One-Night / Several-Nights
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Proyectos Activos */}
                    {visibleHighlights.activeProjects && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-orange-500/10">
                            <FolderOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Proyectos Activos</div>
                            <div className="text-2xl font-bold">{globalMetrics.activeProjects}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {globalMetrics.activeProjectsPercentage}% del total
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Fotos Valoradas - navigates to gallery section */}
                    {visibleHighlights.ratedPhotos && (
                      <Card 
                        className="p-5 cursor-pointer hover:shadow-lg transition-shadow ring-2 ring-emerald-500/70 dark:ring-emerald-400/70" 
                        onClick={() => setMainSection("galeria")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-500/10">
                            <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Fotos Valoradas</div>
                            <div className="text-2xl font-bold">{globalMetrics.totalRated}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {globalMetrics.rating3Count}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {globalMetrics.rating2Count}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {globalMetrics.rating1Count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* SNR Record */}
                    {visibleHighlights.snrRecord && globalMetrics.maxSNR > 0 && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-emerald-500/10">
                            <Star className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">SNR Récord</div>
                            <div className="text-2xl font-bold">{globalMetrics.maxSNR.toFixed(2)}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {globalMetrics.maxSNRObject} · {globalMetrics.maxSNRProject}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* RMS P50 Record (Lowest) */}
                    <Card 
                      className={`p-5 ${globalMetrics.minP50Rms > 0 ? 'cursor-pointer hover:shadow-lg ring-2 ring-emerald-500/70 dark:ring-emerald-400/70' : ''} transition-shadow`}
                      onClick={() => {
                        if (globalMetrics.minP50Rms > 0) {
                          const obj = objects.find(o => o.projects.some((p: any) => p.id === globalMetrics.minP50RmsProjectId));
                          if (obj) {
                            const proj = obj.projects.find((p: any) => p.id === globalMetrics.minP50RmsProjectId);
                            if (proj) {
                              setSelectedObjectId(obj.id);
                              setSelectedProjectId(proj.id);
                              setView("project");
                            }
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-sky-500/10">
                          <Target className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">RMS P50 Récord</div>
                          <div className="text-2xl font-bold">{globalMetrics.minP50Rms > 0 ? `${globalMetrics.minP50Rms.toFixed(2)}"` : '0.00"'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {globalMetrics.minP50Rms > 0 ? `${globalMetrics.minP50RmsObject} · ${globalMetrics.minP50RmsProject}` : 'Sin datos PHD2'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* RMS P68 Record (Lowest) */}
                    <Card 
                      className={`p-5 ${globalMetrics.minP68Rms > 0 ? 'cursor-pointer hover:shadow-lg ring-2 ring-emerald-500/70 dark:ring-emerald-400/70' : ''} transition-shadow`}
                      onClick={() => {
                        if (globalMetrics.minP68Rms > 0) {
                          const obj = objects.find(o => o.projects.some((p: any) => p.id === globalMetrics.minP68RmsProjectId));
                          if (obj) {
                            const proj = obj.projects.find((p: any) => p.id === globalMetrics.minP68RmsProjectId);
                            if (proj) {
                              setSelectedObjectId(obj.id);
                              setSelectedProjectId(proj.id);
                              setView("project");
                            }
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-violet-500/10">
                          <Target className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">RMS P68 Récord</div>
                          <div className="text-2xl font-bold">{globalMetrics.minP68Rms > 0 ? `${globalMetrics.minP68Rms.toFixed(2)}"` : '0.00"'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {globalMetrics.minP68Rms > 0 ? `${globalMetrics.minP68RmsObject} · ${globalMetrics.minP68RmsProject}` : 'Sin datos PHD2'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Hours by Year */}
                    {visibleHighlights.hoursByYear && (() => {
                      const currentYearSeconds = objects.reduce((acc, obj) => {
                        return acc + obj.projects.reduce((pAcc, proj) => {
                          return pAcc + proj.sessions.reduce((sAcc, session: any) => {
                            if (session.date && new Date(session.date).getFullYear() === selectedYear) {
                              return sAcc + (session.lights || 0) * (session.exposureSec || 0);
                            }
                            return sAcc;
                          }, 0);
                        }, 0);
                      }, 0);
                      
                      const previousYearSeconds = objects.reduce((acc, obj) => {
                        return acc + obj.projects.reduce((pAcc, proj) => {
                          return pAcc + proj.sessions.reduce((sAcc, session: any) => {
                            if (session.date && new Date(session.date).getFullYear() === selectedYear - 1) {
                              return sAcc + (session.lights || 0) * (session.exposureSec || 0);
                            }
                            return sAcc;
                          }, 0);
                        }, 0);
                      }, 0);
                      
                      const percentageChange = previousYearSeconds > 0 
                        ? ((currentYearSeconds - previousYearSeconds) / previousYearSeconds) * 100 
                        : null;
                      
                      return (
                        <Card className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-rose-500/10">
                                <Calendar className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                              </div>
                              <div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {language === 'en' ? `Hours in ${selectedYear}` : `Horas en ${selectedYear}`}
                                </div>
                                <div className="text-2xl font-bold">{hh(currentYearSeconds)}</div>
                                {percentageChange !== null && (
                                  <div className={`text-xs font-medium ${percentageChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% vs {selectedYear - 1}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedYear((prev) => Math.max(globalMetrics.minYear, prev - 1))}
                                disabled={selectedYear <= globalMetrics.minYear}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setSelectedYear((prev) => Math.min(globalMetrics.currentYear, prev + 1))}
                                disabled={selectedYear >= globalMetrics.currentYear}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })()}

                    {/* Object with Most Exposure */}
                    {visibleHighlights.mostPhotographedObject && globalMetrics.maxExposureObj && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-yellow-500/10">
                            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                              Objeto con Mayor Exposición
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className="text-2xl font-bold">{globalMetrics.maxExposureObj[0]}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {hh(globalMetrics.maxExposureObj[1] * 3600)} horas
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {objects.find((o) => o.id === globalMetrics.maxExposureObj?.[0])?.commonName || globalMetrics.maxExposureObj[0]}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Most Photographed Constellation */}
                    {visibleHighlights.mostPhotographedConstellation && globalMetrics.mostPhotographedConstellation && (
                      <Card 
                        className="p-5 cursor-pointer hover:shadow-lg hover:scale-105 transition-all ring-2 ring-emerald-500/70 dark:ring-emerald-400/70"
                        onClick={() => {
                          setSelectedConstellation(globalMetrics.mostPhotographedConstellation![0]);
                          setView("constellationDetail");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-indigo-500/10">
                            <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Constelación Más Fotografiada
                            </div>
                            <div className="text-2xl font-bold">{globalMetrics.mostPhotographedConstellation[0]}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {globalMetrics.mostPhotographedConstellation[1]} objeto{globalMetrics.mostPhotographedConstellation[1] !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Streaks Highlight */}
                    {visibleHighlights.streaks && (
                      <>
                        {/* Racha de noches consecutivas */}
                        <Card className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-pink-500/10">
                              <Flame className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                Racha de Noches Consecutivas
                              </div>
                              <div className="text-2xl font-bold">
                                {globalMetrics.currentStreak > 0 ? globalMetrics.currentStreak : 0} noche{globalMetrics.currentStreak !== 1 ? "s" : ""}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {globalMetrics.currentStreak > 0 ? (
                                  <>
                                    Racha actual • Récord: {globalMetrics.maxStreak} noche{globalMetrics.maxStreak !== 1 ? "s" : ""}
                                  </>
                                ) : (
                                  <>
                                    Sin racha activa • Récord: {globalMetrics.maxStreak} noche{globalMetrics.maxStreak !== 1 ? "s" : ""}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </>
                    )}

                    {/* Calendar Card - Expandable (LAST) */}
                    <Card 
                      className="p-5 cursor-pointer hover:shadow-md transition-all ring-2 ring-emerald-500/70 dark:ring-emerald-400/70"
                      onClick={() => setCalendarExpanded(!calendarExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-500/10 flex-shrink-0">
                          <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Días con sesiones</div>
                          <div className="text-2xl font-bold">
                            {(() => {
                              const allSessions = objects.flatMap((o) => o.projects.flatMap((p) => p.sessions || []));
                              const currentMonthSessions = allSessions.filter((s) => {
                                const sessionDate = new Date(s.date);
                                return sessionDate.getFullYear() === calendarYear && sessionDate.getMonth() === calendarMonth;
                              });
                              return new Set(currentMonthSessions.map((s) => new Date(s.date).getDate())).size;
                            })()}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            en {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][calendarMonth]}
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${calendarExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </Card>
                  </div>

                  {/* Expanded Calendar Section */}
                  {calendarExpanded && (
                    <div className="mt-4">
                      <Card className="p-4">
                        {/* Month/Year navigation */}
                        <div className="flex items-center justify-between mb-4 px-1">
                          <button
                            onClick={() => {
                              if (calendarMonth === 0) {
                                setCalendarMonth(11);
                                setCalendarYear(calendarYear - 1);
                              } else {
                                setCalendarMonth(calendarMonth - 1);
                              }
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="font-semibold text-lg">
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][calendarMonth]} {calendarYear}
                          </span>
                          <button
                            onClick={() => {
                              if (calendarMonth === 11) {
                                setCalendarMonth(0);
                                setCalendarYear(calendarYear + 1);
                              } else {
                                setCalendarMonth(calendarMonth + 1);
                              }
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-2 text-center">
                          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                            <div key={d} className="py-2 font-medium text-sm text-slate-500 dark:text-slate-400">
                              {d}
                            </div>
                          ))}
                          {(() => {
                            const allSessions = objects.flatMap((o) => o.projects.flatMap((p) => 
                              (p.sessions || []).map((s: any) => ({ ...s, objectId: o.id, objectName: o.id, projectId: p.id, projectName: p.name }))
                            ));
                            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                            const firstDayOfWeek = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
                            const days: React.ReactNode[] = [];
                            
                            // Empty cells before first day
                            for (let i = 0; i < firstDayOfWeek; i++) {
                              days.push(<div key={`empty-${i}`} className="py-3" />);
                            }
                            
                            // Day cells
                            for (let day = 1; day <= daysInMonth; day++) {
                              const sessionsOnDay = allSessions.filter((s: any) => {
                                const d = new Date(s.date);
                                return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && d.getDate() === day;
                              });
                              const hasSessions = sessionsOnDay.length > 0;
                              
                              days.push(
                                <button
                                  key={day}
                                  onClick={() => {
                                    if (hasSessions) {
                                      // Group sessions by project
                                      const projectMap = new Map<string, any>();
                                      sessionsOnDay.forEach((s: any) => {
                                        const key = `${s.objectId}-${s.projectId}`;
                                        if (!projectMap.has(key)) {
                                          projectMap.set(key, {
                                            objectId: s.objectId,
                                            objectName: s.objectName,
                                            projectId: s.projectId,
                                            projectName: s.projectName,
                                            sessionsCount: 0
                                          });
                                        }
                                        projectMap.get(key).sessionsCount++;
                                      });
                                      setSelectedDayInfo({
                                        day,
                                        month: calendarMonth,
                                        year: calendarYear,
                                        projects: Array.from(projectMap.values())
                                      });
                                    }
                                  }}
                                  className={`py-3 flex items-center justify-center rounded-lg text-sm transition
                                    ${hasSessions 
                                      ? "bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600" 
                                      : "text-slate-600 dark:text-slate-400 cursor-default hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }
                                  `}
                                  disabled={!hasSessions}
                                >
                                  {day}
                                </button>
                              );
                            }
                            
                            return days;
                          })()}
                        </div>

                        {/* Selected Day Info */}
                        {selectedDayInfo && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-sm font-medium mb-2">
                              {selectedDayInfo.day} de {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][selectedDayInfo.month]} {selectedDayInfo.year}
                            </div>
                            <div className="space-y-2">
                              {selectedDayInfo.projects.map((p: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const obj = objects.find(o => o.id === p.objectId);
                                    if (obj) {
                                      const proj = obj.projects.find((pr: any) => pr.id === p.projectId);
                                      if (proj) {
                                        setSelectedObjectId(obj.id);
                                        setSelectedProjectId(proj.id);
                                        setView("project");
                                      }
                                    }
                                  }}
                                  className="w-full text-left p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                >
                                  <div className="font-medium text-sm">{p.objectName}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.projectName} · {p.sessionsCount} sesión(es)</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}

                  {/* Camera and Telescope Usage - Full Width Row with 2 Columns */}
                  {(visibleHighlights.cameraUsage || visibleHighlights.telescopeUsage) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Camera Usage Statistics */}
                      {visibleHighlights.cameraUsage && Object.keys(globalMetrics.cameraCounts).length > 0 && (
                        <Card className="p-5">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            Uso de cámaras (% de lights)
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(globalMetrics.cameraCounts)
                              .sort(([, a], [, b]) => b - a)
                              .map(([camera, count]) => {
                                const percentage =
                                  globalMetrics.totalCameraLights > 0 ? ((count / globalMetrics.totalCameraLights) * 100).toFixed(1) : 0;
                                return (
                                  <div
                                    key={camera}
                                    className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                                  >
                                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">{camera}</div>
                                    <div className="text-xs text-blue-700 dark:text-blue-300">
                                      {count} lights ({percentage}%)
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </Card>
                      )}

                      {/* Telescope Usage Statistics */}
                      {visibleHighlights.telescopeUsage && Object.keys(globalMetrics.telescopeCounts).length > 0 && (
                        <Card className="p-5">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">Uso de telescopios</div>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(globalMetrics.telescopeCounts)
                              .sort(([, a], [, b]) => b.seconds - a.seconds)
                              .map(([telescope, data]) => {
                                const percentage =
                                  globalMetrics.totalTelescopeLights > 0
                                    ? ((data.lights / globalMetrics.totalTelescopeLights) * 100).toFixed(1)
                                    : "0";
                                return (
                                  <div
                                    key={telescope}
                                    className="px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800"
                                  >
                                    <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                      {telescope}
                                    </div>
                                    <div className="text-xs text-purple-700 dark:text-purple-300">
                                      {hh(data.seconds)} • {data.lights} lights ({percentage}%)
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                  </>
                  )}
                </>
              )}

              {/* SECTION: Galería */}
              {mainSection === "galeria" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ImageIcon className="w-6 h-6" /> Galería de Valoraciones
                  </h2>
                  {objects.length === 0 ? (
                    <Card className="p-8 text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {language === 'en' ? 'No gallery images yet. Rate your photos to see them here.' : 'No hay imágenes en la galería todavía. Valora tus fotos para verlas aquí.'}
                      </p>
                    </Card>
                  ) : (
                  <>
                  {(() => {
                    // Collect all rated images
                    const allRatedImages: Array<{
                      src: string;
                      title: string;
                      rating: number;
                      objectId: string;
                      objectName: string;
                      projectId: string;
                      projectName: string;
                      keyName: string;
                      constellation: string;
                    }> = [];
                    
                    objects.forEach((obj) => {
                      obj.projects.forEach((proj: any) => {
                        const ratings = proj.ratings || {};
                        const images = proj.images || {};
                        
                        Object.keys(ratings).forEach((keyName) => {
                          const rating = ratings[keyName];
                          const imageSrc = images[keyName];
                          
                          if (rating > 0 && imageSrc) {
                            // Generate a readable title based on keyName
                            let title = keyName;
                            if (keyName === "finalProject") {
                              title = "Imagen final del proyecto";
                            } else if (keyName.startsWith("initial")) {
                              title = `Imagen inicial ${keyName.replace("initial", "")}`;
                            } else if (keyName.startsWith("final")) {
                              title = `Imagen final ${keyName.replace("final", "")}`;
                            } else if (keyName === "panelSchema") {
                              title = "Esquema de paneles";
                            }
                            
                            allRatedImages.push({
                              src: imageSrc,
                              title,
                              rating,
                              objectId: obj.id,
                              objectName: obj.commonName || obj.id,
                              projectId: proj.id,
                              projectName: proj.name,
                              keyName,
                              constellation: obj.constellation || "",
                            });
                          }
                        });
                      });
                    });

                    // Get unique constellations for filter
                    const uniqueConstellations = [...new Set(allRatedImages.map(img => img.constellation).filter(Boolean))].sort();

                    // Count images by rating
                    const rating3Count = allRatedImages.filter((img) => img.rating === 3).length;
                    const rating2Count = allRatedImages.filter((img) => img.rating === 2).length;
                    const rating1Count = allRatedImages.filter((img) => img.rating === 1).length;

                    return (
                      <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-purple-500/10">
                                <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                                <div className="text-xl font-bold">{allRatedImages.length}</div>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-yellow-500/10">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3].map((i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">3 Estrellas</div>
                                <div className="text-xl font-bold">{rating3Count}</div>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-blue-500/10">
                                <div className="flex gap-0.5">
                                  {[1, 2].map((i) => (
                                    <Star key={i} className="w-3 h-3 fill-blue-400 text-blue-400" />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">2 Estrellas</div>
                                <div className="text-xl font-bold">{rating2Count}</div>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-slate-500/10">
                                <Star className="w-3 h-3 fill-slate-400 text-slate-400" />
                              </div>
                              <div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">1 Estrella</div>
                                <div className="text-xl font-bold">{rating1Count}</div>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Advanced Search Panel */}
                        <div className="grid gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Sorting buttons */}
                            {allRatedImages.length > 0 && (
                              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                <button 
                                  onClick={() => setGallerySortMode("alpha")}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${gallerySortMode === "alpha" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                                  title="Ordenar alfabéticamente (A-Z)"
                                >
                                  A-Z
                                </button>
                                <button 
                                  onClick={() => setGallerySortMode("rating")}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${gallerySortMode === "rating" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                                  title="Ordenar por valoración"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            
                            {/* Search input */}
                            <div className="relative flex-1 min-w-[200px]">
                              <input
                                type="text"
                                value={gallerySearchText}
                                onChange={(e) => setGallerySearchText(e.target.value)}
                                placeholder="Buscar por objeto o proyecto..."
                                className={`${INPUT_CLS} w-full pl-10`}
                              />
                              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              {gallerySearchText && (
                                <button
                                  onClick={() => setGallerySearchText("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            
                            <Btn outline onClick={() => setShowGalleryFilters(!showGalleryFilters)}>
                              {showGalleryFilters ? "Ocultar filtros" : "Filtros avanzados"}
                            </Btn>
                          </div>
                          
                          {/* Advanced Filters Panel */}
                          {showGalleryFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                              <label className="grid gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Constelación</span>
                                <select
                                  value={galleryFilterConstellation}
                                  onChange={(e) => setGalleryFilterConstellation(e.target.value)}
                                  className={INPUT_CLS}
                                >
                                  <option value="all">Todas</option>
                                  {uniqueConstellations.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Valoración</span>
                                <Select value={filterRating} onValueChange={(v) => setFilterRating(v as any)}>
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Todas" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    <SelectItem value="all">
                                      <span className="flex items-center gap-2">
                                        <Check className="w-4 h-4 opacity-0" />
                                        Todas
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="3">
                                      <span className="flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        3 Estrellas
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="2">
                                      <span className="flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        2 Estrellas
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="1">
                                      <span className="flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        1 Estrella
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </label>
                              <div className="flex items-end">
                                <button
                                  onClick={() => {
                                    setGallerySearchText("");
                                    setGalleryFilterConstellation("all");
                                    setFilterRating("all");
                                  }}
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Limpiar filtros
                                </button>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Gallery */}
                        {(() => {
                          const filteredImages = allRatedImages
                            .filter((img) => {
                              // Apply search filter
                              if (gallerySearchText) {
                                const searchLower = gallerySearchText.toLowerCase();
                                if (!img.objectName.toLowerCase().includes(searchLower) && 
                                    !img.projectName.toLowerCase().includes(searchLower) &&
                                    !img.objectId.toLowerCase().includes(searchLower)) {
                                  return false;
                                }
                              }
                              // Apply constellation filter
                              if (galleryFilterConstellation !== "all" && img.constellation !== galleryFilterConstellation) {
                                return false;
                              }
                              // Apply rating filter
                              if (filterRating !== "all" && img.rating !== parseInt(filterRating)) {
                                return false;
                              }
                              return true;
                            })
                            .sort((a, b) => {
                              if (gallerySortMode === "alpha") {
                                return a.objectName.localeCompare(b.objectName);
                              }
                              return b.rating - a.rating;
                            });

                          if (filteredImages.length === 0) {
                            return (
                              <Card className="p-8 text-center">
                                <Star className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="text-slate-600 dark:text-slate-400">
                                  No hay imágenes {filterRating !== "all" ? `con ${filterRating} ${filterRating === "1" ? "estrella" : "estrellas"}` : "valoradas"} aún
                                </p>
                              </Card>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filteredImages.map((img, idx) => (
                                <Card key={`${img.projectId}-${img.keyName}-${idx}`} className="p-4 relative">
                                  <div className="mb-3 relative group">
                                    <img
                                      src={img.src}
                                      alt={img.title}
                                      className="w-full h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => {
                                        setImageModalSrc(img.src);
                                        setImageModalOpen(true);
                                      }}
                                    />
                                    {/* Delete button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteImageFromGallery(img.objectId, img.projectId, img.keyName);
                                      }}
                                      className="absolute bottom-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      title="Eliminar imagen"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  {/* Interactive rating stars */}
                                  <div className="flex justify-end gap-0.5 mb-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 cursor-pointer transition-transform hover:scale-110 ${
                                          i < img.rating
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-slate-300 dark:text-slate-600"
                                        }`}
                                        onClick={() => updateImageRating(img.objectId, img.projectId, img.keyName, i + 1 === img.rating ? 0 : i + 1)}
                                      />
                                    ))}
                                  </div>
                                  
                                  {/* Clickable info section - navigates to project */}
                                  <div 
                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl transition-colors border-t border-slate-100 dark:border-slate-800"
                                    onClick={() => {
                                      setSelectedObjectId(img.objectId);
                                      setSelectedProjectId(img.projectId);
                                      setView("project");
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                  >
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                      {img.objectName}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {img.constellation && <span>{img.constellation} · </span>}{img.projectName}
                                    </p>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                  </>
                  )}
                </div>
              )}
            </div>
          )}

          {view === "projects" && obj && (
            <div className="grid gap-4" key={`view-projects-${obj.id}`}>
              <div className="flex items-center justify-between">
                <SectionTitle
                  icon={FolderOpen}
                  title={`Proyectos de ${obj.id}${obj.commonName ? " · " + obj.commonName : ""}`}
                />
                <div className="flex items-center gap-2">
                  <Btn outline onClick={() => setView("objects")}>
                    <ChevronLeft className="w-4 h-4" /> Volver
                  </Btn>
                  <Btn onClick={() => setMProj(true)}>
                    <Plus className="w-4 h-4" /> Nuevo
                  </Btn>
                </div>
              </div>

              {/* Object Image Carousel */}
              {(() => {
                // Buscar la imagen final del último proyecto
                const lastProjectFinalImage = (() => {
                  const lastProject = obj.projects[obj.projects.length - 1];
                  return (lastProject as any)?.finalImage || "";
                })();

                const objectImages: ImageItem[] = [
                  // Mostrar imagen del objeto si existe, si no mostrar imagen del último proyecto
                  obj.image || lastProjectFinalImage
                    ? {
                        src: obj.image || lastProjectFinalImage,
                        title: `${obj.id}${obj.commonName ? " · " + obj.commonName : ""}`,
                        objectId: obj.id,
                        projectId: obj.projects[0]?.id,
                      }
                    : null,
                  ...obj.projects.flatMap((proj) =>
                    Object.entries(proj.images || {})
                      .filter(([key]) => key !== "panelSchema") // Excluir imagen del esquema de paneles
                      .map(([key, src]) => ({
                        src: src as string,
                        title: `${obj.id} - ${proj.name}`,
                        type: key,
                        objectId: obj.id,
                        projectId: proj.id,
                      })),
                  ),
                ].filter((item) => item !== null && item.src) as ImageItem[];

                if (objectImages.length === 0) return null;

                return (
                  <ImageCarousel
                    images={objectImages}
                    onImageClick={(objectId, projectId) => {
                      setSelectedObjectId(objectId);
                      setSelectedProjectId(projectId);
                      setView("project");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                );
              })()}

              {/* Highlights/Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  // Calcular todas las estadísticas del objeto
                  const allSessions = obj.projects.flatMap((p: any) => p.sessions || []);
                  const totalLights = allSessions.reduce((sum: number, s: any) => sum + (s.lights || 0), 0);
                  const totalSeconds = allSessions.reduce(
                    (sum: number, s: any) => sum + (s.lights || 0) * (s.exposureSec || 0),
                    0,
                  );
                  const uniqueNights = new Set(allSessions.map((s: any) => s.date)).size;
                  const numProjects = obj.projects.length;

                  // Contar fotos por filtro
                  const filterCounts: Record<string, number> = {};
                  allSessions.forEach((s: any) => {
                    const filter = s.filter || "Sin filtro";
                    filterCounts[filter] = (filterCounts[filter] || 0) + (s.lights || 0);
                  });

                  // Contar proyectos por estado
                  const statusCounts = {
                    active: obj.projects.filter((p: any) => (p.status || "active") === "active").length,
                    paused: obj.projects.filter((p: any) => p.status === "paused").length,
                    completed: obj.projects.filter((p: any) => p.status === "completed").length,
                  };

                  const lastSession =
                    allSessions.length > 0
                      ? allSessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                      : null;

                  return (
                    <>
                      <Card className="p-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Objeto</div>
                        <div className="text-2xl font-bold mt-1">{obj.id}</div>
                        {obj.commonName && (
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{obj.commonName}</div>
                        )}
                      </Card>

                      <Card className="p-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Exposición total</div>
                        <div className="text-2xl font-bold mt-1">{hh(totalSeconds)}</div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Lights acumulados</div>
                        <div className="text-2xl font-bold mt-1">{totalLights}</div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Sesiones</div>
                        <div className="text-2xl font-bold mt-1">{uniqueNights} noche(s)</div>
                        {lastSession && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Última: {formatDateDisplay(lastSession.date, dateFormat)}
                          </div>
                        )}
                      </Card>

                      {/* Filtros utilizados */}
                      <Card className="p-4 sm:col-span-2 lg:col-span-2">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Filtros utilizados</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(filterCounts).map(([filter, count]) => (
                            <div key={filter} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                              <span className="font-semibold">{filter}:</span> {count}
                            </div>
                          ))}
                          {Object.keys(filterCounts).length === 0 && (
                            <div className="text-sm text-slate-400">Sin filtros registrados</div>
                          )}
                        </div>
                      </Card>

                      {/* Cámaras utilizadas */}
                      {(() => {
                        const cameraCounts: Record<string, number> = {};
                        allSessions.forEach((s: any) => {
                          if (s.camera) {
                            cameraCounts[s.camera] = (cameraCounts[s.camera] || 0) + (s.lights || 0);
                          }
                        });
                        const totalCameraLights = Object.values(cameraCounts).reduce((sum, count) => sum + count, 0);

                        return (
                          <Card className="p-4 sm:col-span-2 lg:col-span-2">
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Cámaras utilizadas</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(cameraCounts).map(([camera, count]) => {
                                const percentage =
                                  totalCameraLights > 0 ? ((count / totalCameraLights) * 100).toFixed(1) : 0;
                                return (
                                  <div
                                    key={camera}
                                    className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-sm"
                                  >
                                    <span className="font-semibold">{camera}:</span> {count} ({percentage}%)
                                  </div>
                                );
                              })}
                              {Object.keys(cameraCounts).length === 0 && (
                                <div className="text-sm text-slate-400">Sin cámaras registradas</div>
                              )}
                            </div>
                          </Card>
                        );
                      })()}

                      {/* Telescopios utilizados */}
                      {(() => {
                        const telescopeCounts: Record<string, number> = {};
                        allSessions.forEach((s: any) => {
                          if (s.telescope) {
                            const seconds = (s.lights || 0) * (s.exposureSec || 0);
                            telescopeCounts[s.telescope] = (telescopeCounts[s.telescope] || 0) + seconds;
                          }
                        });

                        return (
                          <Card className="p-4 sm:col-span-2 lg:col-span-2">
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                              Telescopios utilizados
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(telescopeCounts).map(([telescope, seconds]) => {
                                return (
                                  <div
                                    key={telescope}
                                    className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-sm"
                                  >
                                    <span className="font-semibold">{telescope}:</span> {hh(seconds)}
                                  </div>
                                );
                              })}
                              {Object.keys(telescopeCounts).length === 0 && (
                                <div className="text-sm text-slate-400">Sin telescopios registrados</div>
                              )}
                            </div>
                          </Card>
                        );
                      })()}

                      {/* Proyectos por estado */}
                      <Card className="p-4 sm:col-span-2 lg:col-span-2">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Proyectos: {numProjects}</div>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm">
                              Activos: <strong>{statusCounts.active}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm">
                              Pausados: <strong>{statusCounts.paused}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                            <span className="text-sm">
                              Terminados: <strong>{statusCounts.completed}</strong>
                            </span>
                          </div>
                        </div>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Evolution Comparison Block */}
              {(() => {
                // Get all projects with final images
                const projectsWithFinalImages = obj.projects.filter((proj: any) => proj.images?.finalProject);
                
                // Need at least 2 projects with final images to show evolution
                if (projectsWithFinalImages.length < 2) return null;
                
                // Helper function to get the earliest session date from a project
                const getEarliestSessionDate = (project: any): number => {
                  if (project.sessions && project.sessions.length > 0) {
                    const sessionDates = project.sessions
                      .map((s: any) => s.date ? new Date(s.date).getTime() : Infinity)
                      .filter((d: number) => d !== Infinity && !isNaN(d));
                    if (sessionDates.length > 0) {
                      return Math.min(...sessionDates);
                    }
                  }
                  // Fallback to createdAt if no valid session dates
                  return new Date(project.createdAt || 0).getTime();
                };
                
                // Sort by earliest session date (oldest first)
                const sortedProjects = [...projectsWithFinalImages].sort((a: any, b: any) => {
                  const dateA = getEarliestSessionDate(a);
                  const dateB = getEarliestSessionDate(b);
                  return dateA - dateB;
                });
                
                const firstProject = sortedProjects[0];
                const lastProject = sortedProjects[sortedProjects.length - 1];
                
                const firstFinalImage = (firstProject as any).images?.finalProject;
                const lastFinalImage = (lastProject as any).images?.finalProject;
                
                // Only show if both images exist and are different
                if (!firstFinalImage || !lastFinalImage || firstFinalImage === lastFinalImage) return null;
                
                return (
                  <Card className="p-4 md:p-6">
                    <Collapsible open={evolutionSectionExpanded} onOpenChange={setEvolutionSectionExpanded}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                        <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          {language === 'en' ? 'Your Evolution' : 'Tu Evolución'}
                        </h3>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* First Image */}
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
                              {language === 'en' ? 'First' : 'Primera'}
                            </div>
                            <div 
                              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-border"
                              onClick={() => {
                                setImageModalSrc(firstFinalImage);
                                setImageModalOpen(true);
                              }}
                            >
                              <img
                                src={firstFinalImage}
                                alt={`${obj.id} - ${firstProject.name}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </div>
                            <div className="text-xs text-muted-foreground text-center truncate">
                              {firstProject.name}
                            </div>
                          </div>
                          
                          {/* Last Image */}
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
                              {language === 'en' ? 'Latest' : 'Última'}
                            </div>
                            <div 
                              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-border"
                              onClick={() => {
                                setImageModalSrc(lastFinalImage);
                                setImageModalOpen(true);
                              }}
                            >
                              <img
                                src={lastFinalImage}
                                alt={`${obj.id} - ${lastProject.name}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </div>
                            <div className="text-xs text-muted-foreground text-center truncate">
                              {lastProject.name}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })()}

              {/* Timeline Block */}
              {(() => {
                // Get all projects with final images and their earliest session dates
                const projectsWithFinalImages = obj.projects
                  .filter((proj: any) => proj.images?.finalProject)
                  .map((proj: any) => {
                    // Get the earliest session date
                    let earliestDate: Date | null = null;
                    if (proj.sessions && proj.sessions.length > 0) {
                      const validDates = proj.sessions
                        .map((s: any) => s.date ? new Date(s.date) : null)
                        .filter((d: Date | null) => d && !isNaN(d.getTime()));
                      if (validDates.length > 0) {
                        earliestDate = validDates.reduce((min: Date, d: Date) => d < min ? d : min, validDates[0]);
                      }
                    }
                    // Fallback to createdAt
                    if (!earliestDate) {
                      earliestDate = new Date(proj.createdAt || 0);
                    }
                    return {
                      ...proj,
                      earliestDate,
                    };
                  })
                  .sort((a: any, b: any) => a.earliestDate.getTime() - b.earliestDate.getTime());
                
                // Need at least 1 project with final image
                if (projectsWithFinalImages.length === 0) return null;
                
                return (
                  <Card className="p-4 md:p-6">
                    <Collapsible open={timelineSectionExpanded} onOpenChange={setTimelineSectionExpanded}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                        <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <Clock className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          {language === 'en' ? 'Timeline' : 'Línea temporal'}
                        </h3>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
                          
                          {/* Timeline items */}
                          <div 
                            className="relative z-10 flex items-start"
                            style={{ 
                              justifyContent: projectsWithFinalImages.length === 1 
                                ? 'center' 
                                : 'space-between' 
                            }}
                          >
                            {projectsWithFinalImages.map((proj: any, idx: number) => {
                              // Calculate time difference with previous project
                              let timeDiffLabel = '';
                              if (idx > 0) {
                                const prevDate = projectsWithFinalImages[idx - 1].earliestDate;
                                const currDate = proj.earliestDate;
                                const diffMs = currDate.getTime() - prevDate.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                
                                if (diffDays >= 365) {
                                  const years = Math.floor(diffDays / 365);
                                  const remainingDays = diffDays % 365;
                                  const months = Math.floor(remainingDays / 30);
                                  const days = remainingDays % 30;
                                  
                                  if (months > 0 && days > 0) {
                                    timeDiffLabel = `${years}a ${months}m ${days}d`;
                                  } else if (months > 0) {
                                    timeDiffLabel = `${years}a ${months}m`;
                                  } else if (days > 0) {
                                    timeDiffLabel = `${years}a ${days}d`;
                                  } else {
                                    timeDiffLabel = `${years}a`;
                                  }
                                } else if (diffDays >= 30) {
                                  const months = Math.floor(diffDays / 30);
                                  const days = diffDays % 30;
                                  if (days > 0) {
                                    timeDiffLabel = `${months}m ${days}d`;
                                  } else {
                                    timeDiffLabel = `${months}m`;
                                  }
                                } else {
                                  timeDiffLabel = `${diffDays}d`;
                                }
                              }
                              
                              return (
                                <React.Fragment key={proj.id}>
                                  {/* Time difference label between projects */}
                                  {idx > 0 && (
                                    <div className="flex-1 flex items-center justify-center self-center -mx-2">
                                      <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                        {timeDiffLabel}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div 
                                    className="flex flex-col items-center flex-shrink-0"
                                    style={{ 
                                      maxWidth: projectsWithFinalImages.length === 1 ? '100%' : '120px',
                                      minWidth: '80px'
                                    }}
                                  >
                                    {/* Image */}
                                    <div 
                                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden cursor-pointer group border-2 border-primary bg-background shadow-md"
                                      onClick={() => {
                                        setImageModalSrc(proj.images.finalProject);
                                        setImageModalOpen(true);
                                      }}
                                    >
                                      <img
                                        src={proj.images.finalProject}
                                        alt={proj.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                      />
                                    </div>
                                    
                                    {/* Dot on timeline */}
                                    <div className="w-3 h-3 rounded-full bg-primary mt-2 mb-1 shadow-sm" />
                                    
                                    {/* Date */}
                                    <div className="text-xs text-muted-foreground text-center font-medium">
                                      {formatDateDisplay(proj.earliestDate.toISOString().slice(0, 10), dateFormat)}
                                    </div>
                                    
                                    {/* Project name */}
                                    <div className="text-xs text-center text-slate-600 dark:text-slate-400 truncate w-full mt-0.5">
                                      {proj.name}
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })()}

              {/* Visibility Chart Block */}
              {mainLocation?.coords && (
                <Card className="p-4 md:p-6">
                  <Collapsible open={visibilitySectionExpanded} onOpenChange={setVisibilitySectionExpanded}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        {language === 'en' ? 'Night Visibility' : 'Visibilidad Nocturna'}
                      </h3>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <VisibilityChart
                        objectCode={obj.id}
                        coordinates={mainLocation.coords}
                        date={new Date()}
                        compact={false}
                        language={language}
                        altitudeLimit={minAltitudeLimit}
                        showToggle={true}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}

              {/* Projects Header with Filters */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h2 className="text-xl md:text-2xl font-bold">Proyectos</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <button 
                        onClick={() => setSortProjects("alpha")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortProjects === "alpha" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                        title="Ordenar alfabéticamente (A-Z)"
                      >
                        A-Z
                      </button>
                      <button 
                        onClick={() => setSortProjects("recent")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortProjects === "recent" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                        title="Ordenar por más recientes"
                      >
                        1-3
                      </button>
                    </div>
                    <Btn onClick={() => setMProj(true)}>
                      <Plus className="w-4 h-4" /> <span className="hidden md:inline">Nuevo proyecto</span><span className="md:hidden">Nuevo</span>
                    </Btn>
                  </div>
                </div>

                <div className="flex gap-3 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar por nombre del proyecto..."
                      value={projectSearchText}
                      onChange={(e) => setProjectSearchText(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {projectSearchText && (
                      <button
                        onClick={() => setProjectSearchText("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Btn outline onClick={() => setShowProjectFilters(!showProjectFilters)}>
                    {showProjectFilters ? "Ocultar filtros" : "Filtros avanzados"}
                  </Btn>
                </div>

                {showProjectFilters && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <label className="grid gap-1">
                      <Label>Filtrar por estado</Label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="paused">Pausados</option>
                        <option value="completed">Terminados</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {(() => {
                  let filteredProjects = obj.projects.slice();

                  // Apply search filter
                  if (projectSearchText.trim()) {
                    const search = projectSearchText.toLowerCase();
                    filteredProjects = filteredProjects.filter((p: any) => p.name.toLowerCase().includes(search));
                  }

                  // Apply status filter
                  if (filterStatus !== "all") {
                    filteredProjects = filteredProjects.filter((p: any) => p.status === filterStatus);
                  }

                  // Apply sorting
                  if (sortProjects === "alpha") {
                    filteredProjects.sort((a: any, b: any) => a.name.localeCompare(b.name));
                  } else {
                    filteredProjects.sort(
                      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    );
                  }

                  return filteredProjects.map((p: any) => {
                    const statusColors = {
                      active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
                      paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
                      completed: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
                    };
                    const statusLabels = { active: "Activo", paused: "Pausado", completed: "Terminado" };

                    return (
                      <Card
                        key={p.id}
                        className="p-4"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setView("project");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {editingProjectName === p.id ? (
                              <input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onBlur={() => {
                                  if (newProjectName.trim()) updateProj(p.id, { name: newProjectName.trim() });
                                  setEditingProjectName(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (newProjectName.trim()) updateProj(p.id, { name: newProjectName.trim() });
                                    setEditingProjectName(null);
                                  }
                                  if (e.key === "Escape") setEditingProjectName(null);
                                }}
                                className="px-2 py-1 border rounded text-sm w-full"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold">{p.name}</h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProjectName(p.id);
                                    setNewProjectName(p.name);
                                  }}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                  title="Editar nombre"
                                >
                                  <Pencil className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                            )}
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {p.sessions.length} sesión(es)
                            </div>
                            <div className="mt-2">
                              <select
                                value={p.status || "active"}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateProj(p.id, { status: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-xs px-2 py-1 rounded-full border ${statusColors[p.status || "active"]}`}
                              >
                                <option value="active">{statusLabels.active}</option>
                                <option value="paused">{statusLabels.paused}</option>
                                <option value="completed">{statusLabels.completed}</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconBtn
                              title="Eliminar"
                              onClick={(e) => {
                                e?.stopPropagation();
                                delProj(p.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconBtn>
                          </div>
                        </div>
                      </Card>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {view === "project" && obj && proj && (
            <div className="grid gap-4 mt-2" key={`view-project-${obj.id}-${proj.id}`}>
              {/* Nueva sección de Configuración */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <SectionTitle icon={Settings} title="Configuración" />
                <div className="flex items-center gap-2">
                  <IconBtn
                    title="Descargar reporte del proyecto"
                    onClick={() => {
                      setShowReportConfig(true);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </IconBtn>
                  <IconBtn
                    title="Editar configuración del proyecto"
                    onClick={() => {
                      setProjectSettingsData({});
                      setShowProjectSettings(true);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </IconBtn>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-2 lg:grid-cols-7 gap-3 md:gap-4">
                {/* 1. Objeto */}
                <Card className="p-4">
                  <div className="text-sm text-slate-500">Objeto</div>
                  <div className="text-xl font-semibold">{obj.id}</div>
                  <div className="text-sm text-slate-500">{obj.commonName}</div>
                </Card>

                {/* 2. Sesiones */}
                <Card className="p-4">
                  <div className="text-sm text-slate-500">Sesiones</div>
                  <div className="text-xl font-semibold">
                    {new Set(proj.sessions.map((s: any) => s.date)).size} noche(s)
                  </div>
                  <div className="text-xs text-slate-500">
                    Última: {proj.sessions.length ? formatDateDisplay(proj.sessions[proj.sessions.length - 1].date, dateFormat) : "–"}
                  </div>
                </Card>

                {/* 3. Estado */}
                <Card className="p-4">
                  <div className="text-sm text-slate-500 mb-2">Estado</div>
                  {(() => {
                    const statusColors = {
                      active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40",
                      paused: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
                      completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40",
                    };
                    const statusLabels = {
                      active: "Activo",
                      paused: "Pausado",
                      completed: "Completado",
                    };
                    return (
                      <select
                        value={proj.status || "active"}
                        onChange={(e) => updateProj(proj.id, { status: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full border ${statusColors[proj.status || "active"]}`}
                      >
                        <option value="active">{statusLabels.active}</option>
                        <option value="paused">{statusLabels.paused}</option>
                        <option value="completed">{statusLabels.completed}</option>
                      </select>
                    );
                  })()}
                </Card>

                {/* 4. Tiempo Activo */}
                {(() => {
                  // Calcular tiempo activo del proyecto
                  const startDate = new Date((proj as any).startDate || proj.createdAt);

                  // Si hay endDate definido, usarlo; si no, usar completedDate si está completado; si no, fecha actual
                  let endDate: Date;
                  if ((proj as any).endDate) {
                    endDate = new Date((proj as any).endDate);
                  } else if (proj.status === "completed" && (proj as any).completedDate) {
                    endDate = new Date((proj as any).completedDate);
                  } else {
                    endDate = new Date();
                  }

                  const diffMs = endDate.getTime() - startDate.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  let displayTime = "";
                  if (diffDays < 30) {
                    displayTime = `${diffDays} día${diffDays !== 1 ? "s" : ""}`;
                  } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    const remainingDays = diffDays % 30;
                    displayTime =
                      remainingDays > 0
                        ? `${months} mes${months !== 1 ? "es" : ""}, ${remainingDays} día${remainingDays !== 1 ? "s" : ""}`
                        : `${months} mes${months !== 1 ? "es" : ""}`;
                  } else {
                    const years = Math.floor(diffDays / 365);
                    const remainingDays = diffDays % 365;
                    const months = Math.floor(remainingDays / 30);
                    displayTime =
                      months > 0
                        ? `${years} año${years !== 1 ? "s" : ""}, ${months} mes${months !== 1 ? "es" : ""}`
                        : `${years} año${years !== 1 ? "s" : ""}`;
                  }

                  return (
                    <Card className="p-4">
                      <div className="text-sm text-slate-500">Tiempo Activo</div>
                      <div className="text-xl font-semibold">{displayTime}</div>
                      <div className="text-xs text-slate-500">
                        {proj.status === "completed" || (proj as any).endDate ? "Completado" : "En curso"}
                      </div>
                    </Card>
                  );
                })()}

                {/* 5. Lights totales acumulados */}
                <Card className="p-4">
                  <div className="text-sm text-slate-500">Lights totales acumulados</div>
                  <div className="text-xl font-semibold">
                    {proj.sessions.reduce((a: number, s: any) => a + (s.lights || 0), 0)}
                  </div>
                </Card>

                {/* 6. Exposición total */}
                <Card className="p-4">
                  <div className="text-sm text-slate-500">Exposición total</div>
                  <div className="text-xl font-semibold">{hh(totalExposureSec(proj.sessions))}</div>
                </Card>

                {/* 7. Highlights de filtros (ej: "HA/OIII total") */}
                {(() => {
                  // Calcular horas totales por cada filtro en TODO el proyecto
                  const filterHours: Record<string, number> = {};
                  proj.sessions.forEach((s: any) => {
                    if (s.filter) {
                      const seconds = (s.lights || 0) * (s.exposureSec || 0);
                      filterHours[s.filter] = (filterHours[s.filter] || 0) + seconds;
                    }
                  });

                  // Ordenar filtros por horas (descendente) y mostrar todos los que tienen horas
                  const sortedFilters = Object.entries(filterHours).sort(([, a], [, b]) => b - a);

                  return sortedFilters.map(([filterName, seconds]) => (
                    <Card key={filterName} className="p-4">
                      <div className="text-sm text-slate-500">{filterName} total</div>
                      <div className="text-xl font-semibold">{hh(seconds)}</div>
                    </Card>
                  ));
                })()}

                {/* 8. Progreso/Objetivo (si no hay paneles) o Horas totales por panel (si hay paneles) */}
                {(() => {
                  // Highlight de objetivo de horas
                  const goalHours = (proj as any).goalHours;
                  if (!goalHours) return null;

                  const numPanels = Object.keys((proj as any).panels || {}).length;
                  const isMultiPanel = numPanels > 1;

                  if (isMultiPanel) {
                    // Objetivo por panel
                    const panelProgress: Record<string, { current: number; percentage: number }> = {};
                    Object.entries((proj as any).panels || {}).forEach(([panelNum, sessions]: [string, any]) => {
                      const totalSeconds = sessions.reduce(
                        (sum: number, s: any) => sum + (s.lights || 0) * (s.exposureSec || 0),
                        0,
                      );
                      const currentHours = totalSeconds / 3600;
                      const percentage = (currentHours / goalHours) * 100;
                      panelProgress[panelNum] = { current: currentHours, percentage };
                    });

                    return (
                      <Card className="p-4 col-span-2">
                        <div className="text-sm text-slate-500 mb-2">Horas totales por panel</div>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(panelProgress)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([panelNum, data]) => (
                              <div key={panelNum} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 dark:text-slate-400">Panel {panelNum}</span>
                                  <span className="font-semibold">{data.percentage.toFixed(0)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 transition-all duration-300"
                                      style={{ width: `${data.percentage}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {data.current.toFixed(1)}h / {goalHours}h
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    );
                  } else {
                    // Objetivo total del proyecto
                    const totalSeconds = totalExposureSec(proj.sessions);
                    const currentHours = totalSeconds / 3600;
                    const percentage = (currentHours / goalHours) * 100;

                    return (
                      <Card className="p-4 col-span-2">
                        <div className="text-sm text-slate-500 mb-2">Progreso/Objetivo</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-semibold">{percentage.toFixed(0)}%</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {currentHours.toFixed(1)}h / {goalHours}h
                            </span>
                          </div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  }
                })()}

                {/* 9. Paneles por filtro (solo si hay más de un panel) */}
                {(() => {
                  // Mostrar highlights de filtros por panel solo si hay más de un panel
                  const numPanels = Object.keys((proj as any).panels || {}).length;
                  if (numPanels <= 1) return null;

                  // Calcular horas por filtro y panel
                  const filterPanelHours: Record<string, Record<string, number>> = {};

                  Object.entries((proj as any).panels || {}).forEach(([panelNum, sessions]: [string, any]) => {
                    sessions.forEach((s: any) => {
                      if (s.filter) {
                        if (!filterPanelHours[s.filter]) {
                          filterPanelHours[s.filter] = {};
                        }
                        const seconds = (s.lights || 0) * (s.exposureSec || 0);
                        filterPanelHours[s.filter][panelNum] = (filterPanelHours[s.filter][panelNum] || 0) + seconds;
                      }
                    });
                  });

                  // Crear highlights para cada filtro
                  return Object.entries(filterPanelHours).map(([filterName, panelData]) => (
                    <Card key={`panel-${filterName}`} className="p-4 col-span-2">
                      <div className="text-sm text-slate-500 mb-2">Paneles {filterName}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(panelData)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([panelNum, seconds]) => (
                            <div key={panelNum} className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 dark:text-slate-400">Panel {panelNum}</span>
                              <span className="text-sm font-semibold">{hh(seconds)}</span>
                            </div>
                          ))}
                      </div>
                    </Card>
                  ));
                })()}
              </div>

              {/* Highlights de Filtro/Panel */}
              {(() => {
                const panels = Object.keys((proj as any).panels || {});
                if (panels.length <= 1) return null;

                // Calcular horas por filtro y panel
                const filterPanelHours: Record<string, Record<string, number>> = {};

                proj.sessions.forEach((s: any) => {
                  if (s.filter && s.panel) {
                    if (!filterPanelHours[s.filter]) {
                      filterPanelHours[s.filter] = {};
                    }
                    const seconds = (s.lights || 0) * (s.exposureSec || 0);
                    filterPanelHours[s.filter][s.panel] = (filterPanelHours[s.filter][s.panel] || 0) + seconds;
                  }
                });

                const filterEntries = Object.entries(filterPanelHours);
                if (filterEntries.length === 0) return null;

                return (
                  <>
                    <div className="mt-6">
                      <SectionTitle title="Filtros por Panel" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {filterEntries.map(([filterName, panelData]) => (
                        <Card key={filterName} className="p-4">
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            {filterName}
                          </div>
                          <div className="space-y-2">
                            {Object.entries(panelData)
                              .sort(([a], [b]) => parseInt(a) - parseInt(b))
                              .map(([panel, seconds]) => (
                                <div key={panel} className="flex items-center justify-between">
                                  <span className="text-sm text-slate-500">Panel {panel}</span>
                                  <span className="text-sm font-medium">{hh(seconds)}</span>
                                </div>
                              ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                );
              })()}

              <SectionTitle title="Imagen final del proyecto" />
              <ImageCard
                title="Imagen final"
                keyName="finalProject"
                proj={proj}
                upImgs={upImgs}
                rating={(proj as any)?.ratings?.finalProject || 0}
                onRatingChange={(rating) => updateRating("finalProject", rating)}
                theme={theme}
                onImageClick={(src) => {
                  setImageModalSrc(src);
                  setImageModalOpen(true);
                }}
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <SectionTitle title="Paneles" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditNumPanels(Object.keys((proj as any).panels || {}).length);
                      setShowEditPanels(true);
                    }}
                    className="p-2 rounded-xl border bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition"
                    title="Editar cantidad de paneles"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Card className="p-3 md:p-4 mb-4">
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2">
                  {Object.keys((proj as any).panels || {}).length > 1 && (
                    <button
                      onClick={() => setPanelSectionExpanded(!panelSectionExpanded)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                        panelSectionExpanded
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      Encuadre
                    </button>
                  )}
                  {Object.keys((proj as any).panels || {}).map((panelNum: string) => (
                    <button
                      key={panelNum}
                      onClick={() => setSelectedPanel(parseInt(panelNum))}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                        selectedPanel === parseInt(panelNum)
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      Panel {panelNum}
                    </button>
                  ))}
                </div>
              </Card>

              {Object.keys((proj as any).panels || {}).length > 1 && panelSectionExpanded && (
                <div className="mb-4">
                  <ImageCard
                    title="Esquema de paneles"
                    keyName="panelSchema"
                    proj={proj}
                    upImgs={upImgs}
                    rating={undefined}
                    onRatingChange={undefined}
                    theme={theme}
                    onImageClick={(src) => {
                      setImageModalSrc(src);
                      setImageModalOpen(true);
                    }}
                  />
                </div>
              )}

              <SectionTitle icon={Database} title="Sesiones" />

              <div className="flex items-center gap-1 md:gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map((t) => (
                  <div
                    key={t.id}
                    className={`px-2 md:px-3 py-1.5 md:py-2 -mb-px border-b-2 text-sm md:text-base whitespace-nowrap ${active === t.id ? "border-slate-900 dark:border-slate-100 font-medium" : "border-transparent text-slate-500"}`}
                  >
                    {editingTabId === t.id ? (
                      <input
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onBlur={() => saveTabName(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTabName(t.id);
                          if (e.key === "Escape") setEditingTabId(null);
                        }}
                        className="px-2 py-1 border rounded text-sm w-24"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActive(t.id)}
                          className="hover:text-slate-900 dark:hover:text-slate-100"
                          title={t.id === "unclassified" ? "Sesiones sin clasificar o que no coinciden con ningún filtro" : ""}
                        >
                          {t.name}
                        </button>
                        {t.id !== "unclassified" && (
                          <>
                            <button
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditTab(t);
                              }}
                              title="Editar nombre"
                            >
                              <Pencil className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                            </button>
                            <button
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                rm(t.id);
                              }}
                              title="Eliminar filtro"
                            >
                              <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <ImageCard
                  title={`Imagen inicial ${act?.name || tabLabel}`}
                  keyName={`initial${keyPrefix}`}
                  proj={proj}
                  upImgs={upImgs}
                  theme={theme}
                  onImageClick={(src) => {
                    setImageModalSrc(src);
                    setImageModalOpen(true);
                  }}
                />
                <ImageCard
                  title={`Imagen final ${act?.name || tabLabel}`}
                  keyName={`final${keyPrefix}`}
                  proj={proj}
                  upImgs={upImgs}
                  theme={theme}
                  onImageClick={(src) => {
                    setImageModalSrc(src);
                    setImageModalOpen(true);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Btn onClick={() => setMSes(true)}>
                  <Plus className="w-3 h-3 md:w-4 md:h-4" /> Nueva sesión
                </Btn>
                <Btn outline onClick={() => setMSesAuto(true)}>
                  <Plus className="w-3 h-3 md:w-4 md:h-4" /> Nueva sesión (Automatizada)
                </Btn>
              </div>

              <div className="overflow-x-auto -mx-3 md:mx-0">
                <Card className="p-2 md:p-4 min-w-fit">
                  <table className="text-xs md:text-sm w-full min-w-max">
                    <thead>
                      <tr className="text-left border-b bg-slate-50/50 dark:bg-slate-900/40">
                        <th className="p-2 md:p-3 whitespace-nowrap">#</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Fecha</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Fase lunar</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Filtro</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Cámara</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Exposición (s)</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Lights sesión</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Lights acumulados</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Tiempo sesión</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Tiempo acumulado</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">SNR (X̄)</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">SNR-R</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">SNR-G</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">SNR-B</th>
                        <th className="p-2 md:p-3 whitespace-nowrap">Incremento</th>
                        <th className="p-2 md:p-3 whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-10">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s: any, i: number, a: any[]) => {
                        const m = mean(s);
                        const pm = a[i - 1] ? mean(a[i - 1]) : null;
                        const inc = Number.isFinite(m) && Number.isFinite(pm) ? +(m - pm).toFixed(3) : 0;
                        const cumulativeLightsVal = a
                          .slice(0, i + 1)
                          .reduce((acc, sess) => acc + (sess.lights || 0), 0);
                        const sessionTime = s.lights * s.exposureSec;
                        const cumulativeTime = a
                          .slice(0, i + 1)
                          .reduce((acc, sess) => acc + (sess.lights || 0) * (sess.exposureSec || 0), 0);

                        // Calcular fase lunar si no existe
                        const moonData = s.date ? calculateMoonPhase(s.date) : null;
                        const moonDisplay = moonData
                          ? `${moonData.emoji} ${moonData.name} (${moonData.illumination}%)`
                          : "–";

                        return (
                          <tr key={s.id} className="border-b hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{i + 1}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{formatDateDisplay(s.date, dateFormat)}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{moonDisplay}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.filter ?? "–"}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.camera || "–"}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.exposureSec}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.lights}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{cumulativeLightsVal}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{hh(sessionTime)}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{hh(cumulativeTime)}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">
                              {Number.isFinite(m) ? m!.toFixed(2) : "–"}
                            </td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">
                              {Number.isFinite(s.snrR) ? s.snrR : "–"}
                            </td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">
                              {Number.isFinite(s.snrG) ? s.snrG : "–"}
                            </td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">
                              {Number.isFinite(s.snrB) ? s.snrB : "–"}
                            </td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle">{i === 0 ? 0 : inc}</td>
                            <td className="p-2 md:p-3 whitespace-nowrap align-middle sticky right-0 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700">
                              <div className="inline-flex gap-1 md:gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      className="p-1 md:p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors relative"
                                      title={s.fitsAnalysis || s.phd2Analysis ? "Detalles y análisis" : "Comentarios"}
                                    >
                                      <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                                      {(s.notes && s.notes.trim() !== "") || s.fitsAnalysis || s.phd2Analysis ? (
                                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${s.fitsAnalysis || s.phd2Analysis ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                      ) : null}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detalles de sesión</DialogTitle>
                                      <DialogDescription>
                                        Fecha: {formatDateDisplay(s.date, dateFormat)} - Filtro: {s.filter}
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    {/* Notes section */}
                                    {s.notes && s.notes.trim() !== "" && (
                                      <div className="mt-4">
                                        <h4 className="text-sm font-medium mb-2">Comentarios</h4>
                                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                                          {s.notes}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* FITS Analysis Charts */}
                                    {s.fitsAnalysis && (
                                      <div className="mt-4">
                                        <h4 className="text-sm font-medium mb-3">Análisis FITS</h4>
                                        
                                        {/* Averages summary */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                          {s.fitsAnalysis.averages.mpsas !== undefined && (
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                              <div className="text-xs text-slate-500">MPSAS</div>
                                              <div className="font-semibold">{s.fitsAnalysis.averages.mpsas.toFixed(2)}</div>
                                            </div>
                                          )}
                                          {s.fitsAnalysis.averages.ambientTemp !== undefined && (
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                              <div className="text-xs text-slate-500">Temp. Ambiente</div>
                                              <div className="font-semibold">{s.fitsAnalysis.averages.ambientTemp.toFixed(1)}°C</div>
                                            </div>
                                          )}
                                          {s.fitsAnalysis.averages.humidity !== undefined && (
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                              <div className="text-xs text-slate-500">Humedad</div>
                                              <div className="font-semibold">{s.fitsAnalysis.averages.humidity.toFixed(1)}%</div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Charts */}
                                        <FitsCharts data={s.fitsAnalysis} />
                                      </div>
                                    )}
                                    
                                    {/* PHD2 Analysis Charts */}
                                    {s.phd2Analysis && (
                                      <div className="mt-4">
                                        <h4 className="text-sm font-medium mb-3">Análisis PHD2 GuideLog</h4>
                                        
                                        {/* PHD2 Summary */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                            <div className="text-xs text-slate-500">RMS Mediana (P50)</div>
                                            <div className="font-semibold">{s.phd2Analysis.medianRms.toFixed(2)}"</div>
                                          </div>
                                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                            <div className="text-xs text-slate-500">RMS P68 (≈1σ)</div>
                                            <div className="font-semibold">{s.phd2Analysis.p68Rms.toFixed(2)}"</div>
                                          </div>
                                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                            <div className="text-xs text-slate-500">RMS Mín</div>
                                            <div className="font-semibold">{s.phd2Analysis.minRms.toFixed(2)}"</div>
                                          </div>
                                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                                            <div className="text-xs text-slate-500">RMS Máx</div>
                                            <div className="font-semibold">{s.phd2Analysis.maxRms.toFixed(2)}"</div>
                                          </div>
                                        </div>
                                        
                                        {/* PHD2 Charts */}
                                        <PHD2Charts data={s.phd2Analysis} />
                                      </div>
                                    )}
                                    
                                    {/* Empty state if no notes and no FITS and no PHD2 */}
                                    {(!s.notes || s.notes.trim() === "") && !s.fitsAnalysis && !s.phd2Analysis && (
                                      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 text-center text-slate-500">
                                        Sin comentarios ni análisis
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <IconBtn title="Editar" onClick={() => setEditSes(s)}>
                                  <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                                </IconBtn>
                                <IconBtn title="Eliminar" onClick={() => deleteSession(s.id)}>
                                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                </IconBtn>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {((proj as any)?.chartVisibility?.exposureChart !== false) && <ExposureChart sessions={filtered} dateFormat={dateFormat} />}
                {((proj as any)?.chartVisibility?.moonChart !== false) && <MoonIlluminationChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.mpsasChart !== false) && <FitsMpsasChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.temperatureChart !== false) && <FitsTemperatureChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.humidityChart !== false) && <FitsHumidityChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.windChart !== false) && <FitsWindChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.focusChart !== false) && <FitsFocusChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.phd2P50Chart !== false) && <PHD2P50Chart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.phd2P68Chart !== false) && <PHD2P68Chart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.snrChart !== false) && <SNRChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.snrRGBChart !== false) && <SNRRGBChart sessions={filtered} />}
                {((proj as any)?.chartVisibility?.acceptedRejectedChart !== false) && <AcceptedRejectedChart sessions={filtered} dateFormat={dateFormat} />}
              </div>
            </div>
          )}

          {view === "onp-snp" && (
            <div className="grid gap-4" key="view-onp-snp">
              {/* Header */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Proyectos ONP y SNP
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Todos tus proyectos organizados por tipo: One-Night Projects (ONP) y Several-Nights Projects (SNP)
                </p>
              </div>

              {(() => {
                // Collect all projects with their types
                const allProjects: Array<{
                  objectId: string;
                  objectName: string;
                  projectId: string;
                  projectName: string;
                  projectType: string;
                  status: string;
                  totalSessions: number;
                  totalHours: number;
                }> = [];
                
                objects.forEach((obj) => {
                  obj.projects.forEach((proj: any) => {
                    const projectType = proj.projectType || "ONP"; // Default to ONP
                    const totalSessions = proj.sessions.length;
                    const totalHours = proj.sessions.reduce((acc: number, s: any) => 
                      acc + (s.lights || 0) * (s.exposureSec || 0), 0) / 3600;
                    
                    allProjects.push({
                      objectId: obj.id,
                      objectName: obj.commonName || obj.id,
                      projectId: proj.id,
                      projectName: proj.name,
                      projectType,
                      status: proj.status || "active",
                      totalSessions,
                      totalHours,
                    });
                  });
                });

                // Separate ONP and SNP projects
                const onpProjects = allProjects.filter((p) => p.projectType === "ONP");
                const snpProjects = allProjects.filter((p) => p.projectType === "SNP");

                return (
                  <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-teal-500/10">
                            <Telescope className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">One-Night Projects (ONP)</div>
                            <div className="text-2xl font-bold">{onpProjects.length}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-500/10">
                            <Telescope className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Several-Nights Projects (SNP)</div>
                            <div className="text-2xl font-bold">{snpProjects.length}</div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* ONP Projects List */}
                    {onpProjects.length > 0 && (
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
                          <Telescope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          One-Night Projects (ONP)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {onpProjects.map((proj) => (
                            <Card
                              key={`${proj.objectId}-${proj.projectId}`}
                              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => {
                                setSelectedObjectId(proj.objectId);
                                setSelectedProjectId(proj.projectId);
                                setView("project");
                              }}
                            >
                              <div className="mb-2">
                                <h3 className="font-semibold text-lg">{proj.projectName}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{proj.objectName}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Badge>{proj.status === "active" ? "Activo" : proj.status === "completed" ? "Completado" : "Pausado"}</Badge>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {proj.totalSessions} {proj.totalSessions === 1 ? "sesión" : "sesiones"}
                                </span>
                                <span className="font-medium">
                                  {formatHoursToHHMM(proj.totalHours)} h
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SNP Projects List */}
                    {snpProjects.length > 0 && (
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
                          <Telescope className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          Several-Nights Projects (SNP)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {snpProjects.map((proj) => (
                            <Card
                              key={`${proj.objectId}-${proj.projectId}`}
                              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => {
                                setSelectedObjectId(proj.objectId);
                                setSelectedProjectId(proj.projectId);
                                setView("project");
                              }}
                            >
                              <div className="mb-2">
                                <h3 className="font-semibold text-lg">{proj.projectName}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{proj.objectName}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Badge>{proj.status === "active" ? "Activo" : proj.status === "completed" ? "Completado" : "Pausado"}</Badge>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {proj.totalSessions} {proj.totalSessions === 1 ? "sesión" : "sesiones"}
                                </span>
                                <span className="font-medium">
                                  {formatHoursToHHMM(proj.totalHours)} h
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {allProjects.length === 0 && (
                      <Card className="p-8 text-center">
                        <Telescope className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-slate-600 dark:text-slate-400">
                          No hay proyectos aún
                        </p>
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {view === "ratings" && (
            <div className="grid gap-4" key="view-ratings">
              {/* Header */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Galería de Valoraciones
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Todas tus fotos organizadas por valoración
                </p>
              </div>

              {(() => {
                // Collect all rated images
                const allRatedImages: Array<{
                  src: string;
                  title: string;
                  rating: number;
                  objectId: string;
                  objectName: string;
                  projectId: string;
                  projectName: string;
                  keyName: string;
                }> = [];
                
                objects.forEach((obj) => {
                  obj.projects.forEach((proj: any) => {
                    const ratings = proj.ratings || {};
                    const images = proj.images || {};
                    
                    Object.keys(ratings).forEach((keyName) => {
                      const rating = ratings[keyName];
                      const imageSrc = images[keyName];
                      
                      if (rating > 0 && imageSrc) {
                        // Generate a readable title based on keyName
                        let title = keyName;
                        if (keyName === "finalProject") {
                          title = "Imagen final del proyecto";
                        } else if (keyName.startsWith("initial")) {
                          title = `Imagen inicial ${keyName.replace("initial", "")}`;
                        } else if (keyName.startsWith("final")) {
                          title = `Imagen final ${keyName.replace("final", "")}`;
                        } else if (keyName === "panelSchema") {
                          title = "Esquema de paneles";
                        }
                        
                        allRatedImages.push({
                          src: imageSrc,
                          title,
                          rating,
                          objectId: obj.id,
                          objectName: obj.commonName || obj.id,
                          projectId: proj.id,
                          projectName: proj.name,
                          keyName,
                        });
                      }
                    });
                  });
                });

                // Count images by rating
                const rating3Count = allRatedImages.filter((img) => img.rating === 3).length;
                const rating2Count = allRatedImages.filter((img) => img.rating === 2).length;
                const rating1Count = allRatedImages.filter((img) => img.rating === 1).length;

                return (
                  <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-500/10">
                            <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total Valoradas</div>
                            <div className="text-2xl font-bold">{allRatedImages.length}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-yellow-500/10">
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map((i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">3 Estrellas</div>
                            <div className="text-2xl font-bold">{rating3Count}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-500/10">
                            <div className="flex gap-0.5">
                              {[1, 2].map((i) => (
                                <Star key={i} className="w-3 h-3 fill-blue-400 text-blue-400" />
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">2 Estrellas</div>
                            <div className="text-2xl font-bold">{rating2Count}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-slate-500/10">
                            <Star className="w-3 h-3 fill-slate-400 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">1 Estrella</div>
                            <div className="text-2xl font-bold">{rating1Count}</div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Filter */}
                    <Card className="p-5">
                      <label className="mb-3 block text-base font-semibold">Filtrar por valoración</label>
                      <RadioGroup
                        value={filterRating}
                        onValueChange={(value: any) => setFilterRating(value)}
                        className="flex flex-wrap gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="all" />
                          <label htmlFor="all" className="cursor-pointer font-normal">
                            Todas ({allRatedImages.length})
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3" id="3stars" />
                          <label htmlFor="3stars" className="cursor-pointer font-normal flex items-center gap-1">
                            3 Estrellas
                            <div className="flex gap-0.5 ml-1">
                              {[1, 2, 3].map((i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            ({rating3Count})
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="2" id="2stars" />
                          <label htmlFor="2stars" className="cursor-pointer font-normal flex items-center gap-1">
                            2 Estrellas
                            <div className="flex gap-0.5 ml-1">
                              {[1, 2].map((i) => (
                                <Star key={i} className="w-3 h-3 fill-blue-400 text-blue-400" />
                              ))}
                            </div>
                            ({rating2Count})
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="1star" />
                          <label htmlFor="1star" className="cursor-pointer font-normal flex items-center gap-1">
                            1 Estrella
                            <Star className="w-3 h-3 fill-slate-400 text-slate-400 ml-1" />
                            ({rating1Count})
                          </label>
                        </div>
                      </RadioGroup>
                    </Card>

                    {/* Gallery */}
                    {(() => {
                      const filteredImages = allRatedImages
                        .filter((img) => {
                          if (filterRating === "all") return true;
                          return img.rating === parseInt(filterRating);
                        })
                        .sort((a, b) => b.rating - a.rating);

                      if (filteredImages.length === 0) {
                        return (
                          <Card className="p-8 text-center">
                            <Star className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-slate-600 dark:text-slate-400">
                              No hay imágenes {filterRating !== "all" ? `con ${filterRating} ${filterRating === "1" ? "estrella" : "estrellas"}` : "valoradas"} aún
                            </p>
                          </Card>
                        );
                      }

                       return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredImages.map((img, idx) => (
                            <Card key={`${img.projectId}-${img.keyName}-${idx}`} className="p-4 relative">
                              <div className="mb-3 relative group">
                                <img
                                  src={img.src}
                                  alt={img.title}
                                  className="w-full h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setImageModalSrc(img.src);
                                    setImageModalOpen(true);
                                  }}
                                />
                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImageFromGallery(img.objectId, img.projectId, img.keyName);
                                  }}
                                  className="absolute bottom-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  title="Eliminar imagen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                  {img.title}
                                </h3>
                                {/* Interactive rating stars */}
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      onClick={() => updateImageRating(img.objectId, img.projectId, img.keyName, i + 1)}
                                      className={`w-4 h-4 cursor-pointer transition-all hover:scale-110 ${
                                        i < img.rating
                                          ? theme === "astro"
                                            ? "fill-blue-400 text-blue-400"
                                            : "fill-yellow-400 text-yellow-400"
                                          : "text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                <div><strong>Objeto:</strong> {img.objectName}</div>
                                <div><strong>Proyecto:</strong> {img.projectName}</div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          )}

          {view === "ephemerides" && (
            <div className="grid gap-4" key="view-ephemerides">
              {/* Header */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                  <Calendar className="w-8 h-8" />
                  Próximas Efemérides
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Calendario de eventos astronómicos 2025-2026
                </p>
              </div>

              {ephemerides.length === 0 ? (
                <Card className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No hay efemérides programadas
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {ephemerides.map((eph, index) => {
                    const getCategoryColor = (category: string) => {
                      const colors: { [key: string]: string } = {
                        'Lluvia de meteoros': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
                        'Fases lunares': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
                        'Eclipse solar': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
                        'Eclipse lunar': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
                        'Planeta en oposición': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
                        'Conjunción planetaria': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
                        'Estaciones': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
                        'Órbita Tierra': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                      };
                      return colors[category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
                    };

                    return (
                      <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Date */}
                          <div className="flex-shrink-0 text-center md:text-left">
                            <div className="inline-block bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700">
                              <Calendar className="w-5 h-5 mb-1 mx-auto md:mx-0" />
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
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
                            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{eph.eventES}</h3>
                            {eph.eventEN && (
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 italic">{eph.eventEN}</p>
                            )}
                            {eph.notes && (
                              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{eph.notes}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "constellationDetail" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-lg border border-indigo-200/20">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-3xl font-bold">{selectedConstellation}</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Todos los objetos fotografiados de esta constelación
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {objects
                  .filter(obj => obj.constellation === selectedConstellation)
                  .map((obj) => {
                    const allProjects = obj.projects || [];
                    const totalImages = allProjects.reduce((sum, proj) => {
                      return sum + (Object.keys(proj.images || {}).length || 0);
                    }, 0);
                    const totalSessions = allProjects.reduce((sum, proj) => {
                      return sum + (proj.sessions?.length || 0);
                    }, 0);
                    const totalExposureTime = allProjects.reduce((sum, proj) => {
                      return sum + (proj.sessions || []).reduce((sessionSum: number, session: any) => {
                        return sessionSum + ((session.lights || 0) * (session.exposureSec || 0));
                      }, 0);
                    }, 0);
                    
                    // Obtener imagen del objeto o del último proyecto
                    const lastProjectFinalImage = (() => {
                      const lastProject = obj.projects[obj.projects.length - 1];
                      return (lastProject as any)?.finalImage || "";
                    })();
                    const objectImage = obj.image || lastProjectFinalImage;
                    
                    return (
                      <Card key={obj.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="space-y-3">
                          {objectImage && (
                            <div className="relative h-48 w-full overflow-hidden rounded-lg -m-3 mb-3">
                              <img
                                src={objectImage}
                                alt={obj.commonName || obj.id}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                <div className="text-white font-bold text-lg">{obj.id}</div>
                                <div className="text-white/90 text-sm">{obj.commonName || "Sin nombre"}</div>
                              </div>
                            </div>
                          )}
                          {!objectImage && (
                            <div>
                              <div className="text-lg font-bold">{obj.id}</div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">{obj.commonName || "Sin nombre"}</div>
                            </div>
                          )}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Tipo:</span>
                              <span className="font-medium">{obj.type || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Proyectos:</span>
                              <span className="font-medium">{allProjects.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Sesiones:</span>
                              <span className="font-medium">{totalSessions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Imágenes:</span>
                              <span className="font-medium">{totalImages}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Exposición:</span>
                              <span className="font-medium">{(totalExposureTime / 3600).toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {objects.filter(obj => obj.constellation === selectedConstellation).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No hay objetos fotografiados de esta constelación
                </div>
              )}
            </div>
          )}
        </main>

        {(() => {
          let title = "";
          let handler: (() => void) | null = null;
          if (view === "objects") {
            title = t('newObject');
            handler = () => setMObj(true);
          } else if (view === "projects") {
            title = t('newProject');
            handler = () => setMProj(true);
          } else if (view === "project") {
            title = t('newSession');
            handler = () => setMSes(true);
          }
          return handler ? <FAB title={title} onClick={handler} /> : null;
        })()}

        <Modal open={mObj} onClose={() => setMObj(false)} title={t('newObject')}>
          <FObject onSubmit={addObj} />
        </Modal>
        <Modal open={mProj} onClose={() => { setMProj(false); setPlannedFromPlan(null); }} title={t('newProject')}>
          <FProject 
            onSubmit={(projData) => {
              addProj(projData);
              // If created from a planned project, remove it and add encuadre image
              if (plannedFromPlan) {
                pendingChangesRef.current++; // Mark as user modification
                setPlannedProjects(plannedProjects.filter((p) => p.id !== plannedFromPlan.id));
                setPlannedFromPlan(null);
              }
            }} 
            cameras={cameras} 
            telescopes={telescopes} 
            locations={locations} 
            mainLocation={mainLocation}
            guideTelescope={guideTelescope}
            guideCamera={guideCamera}
            mount={mount}
            initialData={plannedFromPlan ? {
              name: plannedFromPlan.name,
              encuadreImage: plannedFromPlan.encuadreImage,
            } : undefined}
          />
        </Modal>
        <Modal 
          open={mPlanned} 
          onClose={() => setMPlanned(false)} 
          title="Nueva planificación"
        >
          <FPlanned 
            onSubmit={async (planned) => {
              await addPlannedProject(planned);
              setMPlanned(false);
            }}
            locations={locations}
            mainLocation={mainLocation}
            existingObjects={objects}
          />
        </Modal>
        {/* Modal para editar planificación */}
        <Modal 
          open={!!editingPlannedId} 
          onClose={() => setEditingPlannedId(null)} 
          title="Editar planificación"
        >
          {editingPlannedId && (() => {
            const plannedToEdit = plannedProjects.find(p => p.id === editingPlannedId);
            if (!plannedToEdit) return null;
            return (
              <FPlannedEdit
                initial={plannedToEdit}
                onSubmit={async (updated) => {
                  await updatePlannedProject({ ...updated, id: editingPlannedId });
                  setEditingPlannedId(null);
                }}
                onCancel={() => setEditingPlannedId(null)}
              />
            );
          })()}
        </Modal>
        <Modal open={mSes} onClose={() => setMSes(false)} title="Nueva sesión" wide>
          <FSession
            onSubmit={addSes}
            availableFilters={availableFilters}
            cameras={cameras}
            telescopes={telescopes}
            projectEquipment={(proj as any)?.equipment}
          />
        </Modal>
        <Modal open={mSesAuto} onClose={() => setMSesAuto(false)} title="Nueva sesión (Automatizada)" wide>
          <FSessionAutomated
            onSubmit={addSes}
            availableFilters={availableFilters}
            cameras={cameras}
            telescopes={telescopes}
            projectEquipment={(proj as any)?.equipment}
          />
        </Modal>
        <Modal open={!!editSes} onClose={() => setEditSes(null)} title="Editar sesión" wide>
          {editSes && (
            <FSession
              initial={editSes}
              onSubmit={(val) => {
                editSession(editSes.id, val);
                setEditSes(null);
              }}
              availableFilters={availableFilters}
              cameras={cameras}
              telescopes={telescopes}
              projectEquipment={(proj as any)?.equipment}
            />
          )}
        </Modal>
        <Modal open={show} onClose={() => setShow(false)} title="Nueva pestaña">
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createTab();
            }}
          >
            <label className="grid gap-1">
              <Label>Nombre</Label>
              <input
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Luminancia, SHO..."
              />
            </label>
            <div className="flex items-center justify-between mt-2">
              <div />
              <div className="flex items-center gap-2">
                <Btn outline onClick={() => setShow(false)}>
                  Cancelar
                </Btn>
                <Btn type="submit">
                  <Plus className="w-4 h-4" /> Crear
                </Btn>
              </div>
            </div>
          </form>
        </Modal>

        <Modal open={showEditPanels} onClose={() => setShowEditPanels(false)} title="Editar cantidad de paneles">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updatePanelCount(editNumPanels);
            }}
          >
            <label className="grid gap-1">
              <Label>Número de Paneles/Teselas</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={editNumPanels}
                onChange={(e) => setEditNumPanels(parseInt(e.target.value) || 1)}
                className={INPUT_CLS}
              />
            </label>
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {editNumPanels < Object.keys((proj as any)?.panels || {}).length
                  ? "⚠️ Al reducir el número de paneles, se eliminarán las sesiones de los paneles eliminados."
                  : "ℹ️ Los nuevos paneles se crearán vacíos sin sesiones."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <Btn outline onClick={() => setShowEditPanels(false)}>
                Cancelar
              </Btn>
              <Btn type="submit">Actualizar</Btn>
            </div>
          </form>
        </Modal>

        <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Configuración General" wide>
          <div className="grid gap-6">
            {/* Idioma */}
            <div className="grid gap-3">
              <Label>{t('language')}</Label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)} 
                className={INPUT_CLS}
              >
                <option value="es">{t('spanish')}</option>
                <option value="en">{t('english')}</option>
              </select>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {t('languageDescription')}
              </div>
            </div>

            {/* Nombre de usuario */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>{t('userName')}</span>
              </div>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t('yourName')}
                className={INPUT_CLS}
              />
            </div>

            {/* Formato de fechas */}
            <div className="grid gap-3">
              <Label>{t('dateFormat')}</Label>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={INPUT_CLS}>
                <option value="DD/MM/YYYY">DD/MM/YYYY ({language === 'es' ? 'Día/Mes/Año' : 'Day/Month/Year'})</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY ({language === 'es' ? 'Mes/Día/Año' : 'Month/Day/Year'})</option>
                <option value="YYYY/MM/DD">YYYY/MM/DD ({language === 'es' ? 'Año/Mes/Día' : 'Year/Month/Day'})</option>
              </select>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {t('dateFormatDescription')}
              </div>
            </div>

            {/* Tema por defecto */}
            <div className="grid gap-3">
              <Label>{t('defaultTheme')}</Label>
              <select value={defaultTheme} onChange={(e) => setDefaultTheme(e.target.value)} className={INPUT_CLS}>
                <option value="light">{t('themeLight')}</option>
                <option value="dark">{t('themeDark')}</option>
                <option value="astro">{t('themeAstro')}</option>
              </select>
            </div>

            {/* Localización del archivo JSON */}
            <div className="grid gap-3">
              <Label>{t('jsonLocation')}</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={jsonPath}
                  onChange={(e) => setJsonPath(e.target.value)}
                  placeholder={t('selectJsonFile')}
                  className={INPUT_CLS + " flex-1"}
                  readOnly
                />
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-800 transition-colors">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('browse')}</span>
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setJsonPath(f.name);
                      const text = await f.text();
                      let json;
                      try {
                        json = JSON.parse(text);
                      } catch {
                        alert("JSON no válido: el archivo no contiene JSON válido");
                        e.target.value = "";
                        return;
                      }
                      
                      // Validar y sanitizar datos con Zod
                      const validationResult = validateJsonUpload(json);
                      if (!validationResult.success) {
                        alert(validationResult.error || "Error de validación");
                        e.target.value = "";
                        return;
                      }

                      const objectsData = validationResult.data!.objects;
                      const settingsData = validationResult.data!.settings;
                      
                      setObjects(objectsData);
                      try {
                        localStorage.setItem("astroTrackerData", JSON.stringify(objectsData));
                      } catch (err) {
                        console.warn("No se pudo guardar en localStorage:", err);
                      }
                      
                      // Restaurar settings si existen
                      if (settingsData) {
                        if (settingsData.userName) setUserName(settingsData.userName);
                        if (settingsData.cameras && Array.isArray(settingsData.cameras)) {
                          setCameras(settingsData.cameras.length > 0 ? settingsData.cameras : [""]);
                        }
                        if (settingsData.telescopes && Array.isArray(settingsData.telescopes)) {
                          setTelescopes(settingsData.telescopes.length > 0 ? settingsData.telescopes : [{ name: "", focalLength: "" }]);
                        }
                        if (settingsData.locations && Array.isArray(settingsData.locations)) {
                          setLocations(settingsData.locations.length > 0 ? settingsData.locations : [{ name: "", coords: "" }]);
                        }
                        if (settingsData.mainLocation) setMainLocation(settingsData.mainLocation);
                        if (settingsData.guideTelescope) setGuideTelescope(settingsData.guideTelescope);
                        if (settingsData.guideCamera) setGuideCamera(settingsData.guideCamera);
                        if (settingsData.mount) setMount(settingsData.mount);
                        if (settingsData.dateFormat) setDateFormat(settingsData.dateFormat);
                        
                        const settings = {
                          defaultTheme,
                          jsonPath: f.name,
                          cameras: settingsData.cameras || cameras.filter((c) => c.trim() !== ""),
                          telescopes: settingsData.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                          locations: settingsData.locations || locations.filter((l) => l.name.trim() !== ""),
                          mainLocation: settingsData.mainLocation || mainLocation,
                          guideTelescope: settingsData.guideTelescope || guideTelescope,
                          guideCamera: settingsData.guideCamera || guideCamera,
                          mount: settingsData.mount || mount,
                          dateFormat: settingsData.dateFormat || dateFormat,
                          userName: settingsData.userName || userName,
                        };
                        localStorage.setItem("astroTrackerSettings", JSON.stringify(settings));
                      }
                      
                      // Force immediate cloud sync for imported data
                      if (cloudSyncRef.current.isCloudEnabled) {
                        console.log('[Import] Triggering force cloud sync with await');
                        const settingsForSync = {
                          defaultTheme,
                          jsonPath: f.name,
                          cameras: settingsData?.cameras || cameras.filter((c) => c.trim() !== ""),
                          telescopes: settingsData?.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                          locations: settingsData?.locations || locations.filter((l) => l.name.trim() !== ""),
                          mainLocation: settingsData?.mainLocation || mainLocation,
                          guideTelescope: settingsData?.guideTelescope || guideTelescope,
                          guideCamera: settingsData?.guideCamera || guideCamera,
                          mount: settingsData?.mount || mount,
                          dateFormat: settingsData?.dateFormat || dateFormat,
                          userName: settingsData?.userName || userName,
                        };
                        const syncSuccess = await forceCloudSync(objectsData, [], settingsForSync);
                        if (syncSuccess) {
                          toast({
                            title: 'Datos sincronizados',
                            description: 'Los datos importados se han guardado en la nube',
                          });
                        }
                      }
                      
                      setShowInitialFilePrompt(false);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {t('jsonLocationDescription')}
              </div>
            </div>

            {/* Equipo astrofotográfico */}
            <div className="grid gap-3">
              <Label>{t('astrophotographyEquipment')}</Label>

              {/* Cámaras */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('cameras')}</span>
                {cameras.map((camera, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={camera}
                      onChange={(e) => {
                        const oldCamera = cameras[index];
                        const newCameras = [...cameras];
                        newCameras[index] = e.target.value;
                        setCameras(newCameras);

                        // Update camera name in all sessions
                        if (oldCamera && oldCamera.trim() !== "" && e.target.value !== oldCamera) {
                          setObjects((prevObjects) =>
                            prevObjects.map((obj) => ({
                              ...obj,
                              projects: obj.projects.map((proj: any) => ({
                                ...proj,
                                sessions:
                                  proj.sessions?.map((ses: any) =>
                                    ses.camera === oldCamera ? { ...ses, camera: e.target.value } : ses,
                                  ) || [],
                                panels: Object.fromEntries(
                                  Object.entries(proj.panels || {}).map(([key, sessions]: [string, any]) => [
                                    key,
                                    sessions.map((ses: any) =>
                                      ses.camera === oldCamera ? { ...ses, camera: e.target.value } : ses,
                                    ),
                                  ]),
                                ),
                              })),
                            })),
                          );
                        }
                      }}
                      placeholder="Ej: ZWO ASI294MC Pro"
                      className={INPUT_CLS + " flex-1"}
                    />
                    {cameras.length > 1 && (
                      <IconBtn title="Eliminar" onClick={() => setCameras(cameras.filter((_, i) => i !== index))}>
                        <Trash2 className="w-4 h-4" />
                      </IconBtn>
                    )}
                  </div>
                ))}
                <Btn outline onClick={() => setCameras([...cameras, ""])}>
                  <Plus className="w-4 h-4" /> {t('addCamera')}
                </Btn>
              </div>

              {/* Telescopios */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('telescopes')}</span>
                {telescopes.map((telescope, index) => (
                  <div key={index} className="grid gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={telescope.name}
                        onChange={(e) => {
                          const oldTelescope = telescopes[index].name;
                          const newTelescopes = [...telescopes];
                          newTelescopes[index] = { ...newTelescopes[index], name: e.target.value };
                          setTelescopes(newTelescopes);

                          // Update telescope name in all sessions
                          if (oldTelescope && oldTelescope.trim() !== "" && e.target.value !== oldTelescope) {
                            setObjects((prevObjects) =>
                              prevObjects.map((obj) => ({
                                ...obj,
                                projects: obj.projects.map((proj: any) => ({
                                  ...proj,
                                  sessions:
                                    proj.sessions?.map((ses: any) =>
                                      ses.telescope === oldTelescope ? { ...ses, telescope: e.target.value } : ses,
                                    ) || [],
                                  panels: Object.fromEntries(
                                    Object.entries(proj.panels || {}).map(([key, sessions]: [string, any]) => [
                                      key,
                                      sessions.map((ses: any) =>
                                        ses.telescope === oldTelescope ? { ...ses, telescope: e.target.value } : ses,
                                      ),
                                    ]),
                                  ),
                                })),
                              })),
                            );
                          }
                        }}
                        placeholder="Ej: Sky-Watcher 80ED"
                        className={INPUT_CLS + " flex-1"}
                      />
                      {telescopes.length > 1 && (
                        <IconBtn
                          title="Eliminar"
                          onClick={() => setTelescopes(telescopes.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </IconBtn>
                      )}
                    </div>
                    <input
                      type="number"
                      value={telescope.focalLength}
                      onChange={(e) => {
                        const newTelescopes = [...telescopes];
                        newTelescopes[index] = { ...newTelescopes[index], focalLength: e.target.value };
                        setTelescopes(newTelescopes);
                      }}
                      placeholder="Distancia focal (mm)"
                      className={INPUT_CLS + " w-48"}
                    />
                  </div>
                ))}
                <Btn outline onClick={() => setTelescopes([...telescopes, { name: "", focalLength: "" }])}>
                  <Plus className="w-4 h-4" /> {t('addTelescope')}
                </Btn>
              </div>

              {/* Telescopio guía */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('guideTelescope')}</span>
                <div className="grid gap-2">
                  <input
                    type="text"
                    value={guideTelescope.name}
                    onChange={(e) => {
                      setGuideTelescope({ ...guideTelescope, name: e.target.value });
                    }}
                    placeholder="Ej: Sky-Watcher 50mm"
                    className={INPUT_CLS}
                  />
                  <input
                    type="number"
                    value={guideTelescope.focalLength}
                    onChange={(e) => {
                      setGuideTelescope({ ...guideTelescope, focalLength: e.target.value });
                    }}
                    placeholder="Distancia focal (mm)"
                    className={INPUT_CLS + " w-48"}
                  />
                </div>
              </div>

              {/* Cámara guía */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('guideCamera')}</span>
                <input
                  type="text"
                  value={guideCamera}
                  onChange={(e) => setGuideCamera(e.target.value)}
                  placeholder="Ej: ZWO ASI120MM Mini"
                  className={INPUT_CLS}
                />
              </div>

              {/* Montura */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('mount')}</span>
                <input
                  type="text"
                  value={mount}
                  onChange={(e) => setMount(e.target.value)}
                  placeholder="Ej: Sky-Watcher EQ6-R Pro"
                  className={INPUT_CLS}
                />
              </div>

              {/* Límite mínimo de altitud */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  {language === 'en' ? 'Minimum Altitude Limit' : 'Límite mínimo de altitud'}
                </span>
                <p className="text-xs text-muted-foreground">
                  {language === 'en' 
                    ? 'Objects below this altitude may have poor visibility. Set to 0 to disable.' 
                    : 'Objetos bajo esta altitud pueden tener mala visibilidad. Pon 0 para desactivar.'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={minAltitudeLimit}
                    onChange={(e) => setMinAltitudeLimit(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
                    placeholder="30"
                    className={INPUT_CLS + " w-24"}
                  />
                  <span className="text-sm text-muted-foreground">°</span>
                </div>
              </div>

              {/* Localización principal */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('mainLocation')}</span>
                <input
                  type="text"
                  value={mainLocation.name}
                  onChange={(e) => {
                    setMainLocation({ ...mainLocation, name: e.target.value });
                  }}
                  placeholder="Ej: Observatorio de Sierra Nevada"
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  value={mainLocation.coords}
                  onChange={(e) => {
                    setMainLocation({ ...mainLocation, coords: e.target.value });
                  }}
                  placeholder="Coordenadas Google (Ej: 37.0644, -3.1706)"
                  className={INPUT_CLS}
                />
              </div>

              {/* Otras localizaciones */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t('otherLocations')}</span>
                {locations.map((location, index) => (
                  <div key={index} className="grid gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={location.name}
                        onChange={(e) => {
                          const newLocations = [...locations];
                          newLocations[index] = { ...newLocations[index], name: e.target.value };
                          setLocations(newLocations);
                        }}
                        placeholder="Ej: Observatorio Los Molinos"
                        className={INPUT_CLS + " flex-1"}
                      />
                      {locations.length > 1 && (
                        <IconBtn title="Eliminar" onClick={() => setLocations(locations.filter((_, i) => i !== index))}>
                          <Trash2 className="w-4 h-4" />
                        </IconBtn>
                      )}
                    </div>
                    <input
                      type="text"
                      value={location.coords}
                      onChange={(e) => {
                        const newLocations = [...locations];
                        newLocations[index] = { ...newLocations[index], coords: e.target.value };
                        setLocations(newLocations);
                      }}
                      placeholder="Coordenadas Google (Ej: 37.0644, -3.1706)"
                      className={INPUT_CLS + " w-full"}
                    />
                  </div>
                ))}
                <Btn outline onClick={() => setLocations([...locations, { name: "", coords: "" }])}>
                  <Plus className="w-4 h-4" /> {t('addLocation')}
                </Btn>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Cerrar sesión
              </button>
              <div className="flex items-center gap-2">
                <Btn outline onClick={() => setShowSettings(false)}>
                  {t('cancel')}
                </Btn>
                <Btn onClick={saveSettings}>{t('save')}</Btn>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de configuración del proyecto */}
        <Modal
          open={showProjectSettings}
          onClose={() => {
            setShowProjectSettings(false);
            setProjectSettingsData({});
          }}
          title="Configuración del Proyecto"
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nombre del proyecto</label>
              <input
                type="text"
                value={projectSettingsData.name !== undefined ? projectSettingsData.name : proj?.name || ""}
                onChange={(e) => setProjectSettingsData({ ...projectSettingsData, name: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Lugar</label>
              <input
                type="text"
                value={
                  projectSettingsData.location !== undefined
                    ? projectSettingsData.location
                    : (proj as any)?.location || ""
                }
                onChange={(e) => setProjectSettingsData({ ...projectSettingsData, location: e.target.value })}
                className={INPUT_CLS}
                placeholder="Ej: Observatorio de Sierra Nevada"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Coordenadas Google</label>
              <input
                type="text"
                value={
                  projectSettingsData.googleCoords !== undefined
                    ? projectSettingsData.googleCoords
                    : (proj as any)?.googleCoords || ""
                }
                onChange={(e) => setProjectSettingsData({ ...projectSettingsData, googleCoords: e.target.value })}
                className={INPUT_CLS}
                placeholder="Ej: 37.0644, -3.1706"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={
                  projectSettingsData.description !== undefined
                    ? projectSettingsData.description
                    : proj?.description || ""
                }
                onChange={(e) => setProjectSettingsData({ ...projectSettingsData, description: e.target.value })}
                className={INPUT_CLS}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Tipo de proyecto</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="projectType"
                    value="ONP"
                    checked={
                      (projectSettingsData.projectType !== undefined
                        ? projectSettingsData.projectType
                        : (proj as any)?.projectType || "ONP") === "ONP"
                    }
                    onChange={(e) => setProjectSettingsData({ ...projectSettingsData, projectType: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">ONP (One-Night Project)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="projectType"
                    value="SNP"
                    checked={
                      (projectSettingsData.projectType !== undefined
                        ? projectSettingsData.projectType
                        : (proj as any)?.projectType || "ONP") === "SNP"
                    }
                    onChange={(e) => setProjectSettingsData({ ...projectSettingsData, projectType: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">SNP (Several-Nights Project)</span>
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-medium">Equipo</label>

              <div className="grid gap-3">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Cámara</label>
                  <select
                    value={
                      projectSettingsData.camera !== undefined
                        ? projectSettingsData.camera
                        : (proj as any)?.equipment?.camera || ""
                    }
                    onChange={(e) => {
                      setProjectSettingsData({ ...projectSettingsData, camera: e.target.value });
                    }}
                    className={INPUT_CLS}
                  >
                    <option value="">Seleccionar cámara...</option>
                    {cameras
                      .filter((c) => c.trim())
                      .map((camera) => (
                        <option key={camera} value={camera}>
                          {camera}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid gap-1">
                  <label className="text-sm font-medium">Telescopio</label>
                  <select
                    value={
                      projectSettingsData.telescope !== undefined
                        ? projectSettingsData.telescope
                        : (proj as any)?.equipment?.telescope || ""
                    }
                    onChange={(e) => {
                      setProjectSettingsData({ ...projectSettingsData, telescope: e.target.value });
                    }}
                    className={INPUT_CLS}
                  >
                    <option value="">Seleccionar telescopio...</option>
                    {telescopes
                      .filter((t) => t.name.trim())
                      .map((telescope) => (
                        <option key={telescope.name} value={telescope.name}>
                          {telescope.name} {telescope.focalLength ? `(${telescope.focalLength}mm)` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Número de Paneles/Teselas</label>
              <input
                type="number"
                min={1}
                max={10}
                value={
                  projectSettingsData.numPanels !== undefined
                    ? projectSettingsData.numPanels
                    : Object.keys((proj as any)?.panels || {}).length || 1
                }
                onChange={(e) =>
                  setProjectSettingsData({ ...projectSettingsData, numPanels: parseInt(e.target.value) || 1 })
                }
                className={INPUT_CLS}
              />
              {projectSettingsData.numPanels !== undefined &&
                projectSettingsData.numPanels < Object.keys((proj as any)?.panels || {}).length && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    ⚠️ Al reducir el número de paneles, se eliminarán las sesiones de los paneles eliminados.
                  </p>
                )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {(projectSettingsData.numPanels !== undefined
                  ? projectSettingsData.numPanels
                  : Object.keys((proj as any)?.panels || {}).length || 1) > 1
                  ? "Objetivo horas (por panel)"
                  : "Objetivo horas"}
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={
                  projectSettingsData.goalHours !== undefined
                    ? projectSettingsData.goalHours
                    : (proj as any)?.goalHours || ""
                }
                onChange={(e) =>
                  setProjectSettingsData({
                    ...projectSettingsData,
                    goalHours: e.target.value === "" ? "" : parseFloat(e.target.value),
                  })
                }
                className={INPUT_CLS}
                placeholder="Ej: 10"
              />
              <p className="text-xs text-slate-500">
                {(projectSettingsData.numPanels !== undefined
                  ? projectSettingsData.numPanels
                  : Object.keys((proj as any)?.panels || {}).length || 1) > 1
                  ? "Horas objetivo por cada panel (opcional)"
                  : "Horas totales objetivo para el proyecto (opcional)"}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha de inicio del proyecto</label>
              <input
                type="date"
                value={
                  projectSettingsData.startDate
                    ? projectSettingsData.startDate.split("T")[0]
                    : proj?.startDate
                      ? new Date(proj.startDate).toISOString().split("T")[0]
                      : ""
                }
                onChange={(e) =>
                  setProjectSettingsData({
                    ...projectSettingsData,
                    startDate: e.target.value ? new Date(e.target.value).toISOString() : "",
                  })
                }
                className={INPUT_CLS}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha de fin del proyecto (opcional)</label>
              <input
                type="date"
                value={
                  projectSettingsData.endDate !== undefined
                    ? projectSettingsData.endDate
                      ? new Date(projectSettingsData.endDate).toISOString().split("T")[0]
                      : ""
                    : (proj as any)?.endDate
                      ? new Date((proj as any).endDate).toISOString().split("T")[0]
                      : ""
                }
                onChange={(e) => {
                  const newEndDate = e.target.value ? new Date(e.target.value).toISOString() : "";
                  setProjectSettingsData({ ...projectSettingsData, endDate: newEndDate });
                }}
                className={INPUT_CLS}
              />
              <p className="text-xs text-slate-500">
                Si defines una fecha de fin, el proyecto se marcará como "Terminado" y el tiempo del proyecto se
                calculará hasta esta fecha.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Estado del proyecto</label>
              <select
                value={projectSettingsData.status !== undefined ? projectSettingsData.status : proj?.status || "active"}
                onChange={(e) => setProjectSettingsData({ ...projectSettingsData, status: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Terminado</option>
              </select>
            </div>

            {/* Chart visibility settings */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Gráficas visibles
                </span>
                <ChevronDownIcon className="w-4 h-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-3 rounded-xl border bg-slate-50/30 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-3">
                  Selecciona qué gráficas mostrar en la vista del proyecto
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: "exposureChart", label: "Exposición por filtro" },
                    { key: "moonChart", label: "Iluminación lunar" },
                    { key: "mpsasChart", label: "MPSAS (calidad del cielo)" },
                    { key: "temperatureChart", label: "Temperatura ambiente" },
                    { key: "humidityChart", label: "Humedad" },
                    { key: "windChart", label: "Viento" },
                    { key: "focusChart", label: "Posición de enfoque" },
                    { key: "phd2P50Chart", label: "PHD2 RMS P50" },
                    { key: "phd2P68Chart", label: "PHD2 RMS P68" },
                    { key: "snrChart", label: "SNR (media)" },
                    { key: "snrRGBChart", label: "SNR por canal (R/G/B)" },
                    { key: "acceptedRejectedChart", label: "Lights aceptados/rechazados" },
                  ].map((chart) => {
                    const currentVisibility = projectSettingsData.chartVisibility !== undefined
                      ? projectSettingsData.chartVisibility
                      : (proj as any)?.chartVisibility || {};
                    const isVisible = currentVisibility[chart.key] !== false; // Default true
                    return (
                      <label
                        key={chart.key}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isVisible}
                          onCheckedChange={(checked) => {
                            const newVisibility = {
                              ...currentVisibility,
                              [chart.key]: checked,
                            };
                            setProjectSettingsData({
                              ...projectSettingsData,
                              chartVisibility: newVisibility,
                            });
                          }}
                        />
                        <span className="text-sm">{chart.label}</span>
                      </label>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center justify-end gap-2 mt-2">
              <Btn
                outline
                onClick={() => {
                  setShowProjectSettings(false);
                  setProjectSettingsData({});
                }}
              >
                Cancelar
              </Btn>
              <Btn
                onClick={() => {
                  if (!proj) return;

                  const updates: any = {
                    name: projectSettingsData.name !== undefined ? projectSettingsData.name : proj.name,
                    description:
                      projectSettingsData.description !== undefined
                        ? projectSettingsData.description
                        : proj.description,
                    location:
                      projectSettingsData.location !== undefined
                        ? projectSettingsData.location
                        : (proj as any).location,
                    googleCoords:
                      projectSettingsData.googleCoords !== undefined
                        ? projectSettingsData.googleCoords
                        : (proj as any).googleCoords,
                    startDate: projectSettingsData.startDate || proj.startDate,
                    status: projectSettingsData.status !== undefined ? projectSettingsData.status : proj.status,
                    projectType:
                      projectSettingsData.projectType !== undefined
                        ? projectSettingsData.projectType
                        : (proj as any).projectType,
                    goalHours:
                      projectSettingsData.goalHours !== undefined
                        ? projectSettingsData.goalHours === ""
                          ? undefined
                          : projectSettingsData.goalHours
                        : (proj as any).goalHours,
                  };

                  // Actualizar visibilidad de gráficas si se modificó
                  if (projectSettingsData.chartVisibility !== undefined) {
                    updates.chartVisibility = projectSettingsData.chartVisibility;
                  }

                  // Actualizar equipo si se modificó
                  if (projectSettingsData.camera !== undefined || projectSettingsData.telescope !== undefined) {
                    updates.equipment = {
                      camera:
                        projectSettingsData.camera !== undefined
                          ? projectSettingsData.camera
                          : (proj as any)?.equipment?.camera,
                      telescope:
                        projectSettingsData.telescope !== undefined
                          ? projectSettingsData.telescope
                          : (proj as any)?.equipment?.telescope,
                    };
                  }

                  // Actualizar número de paneles si se modificó
                  if (projectSettingsData.numPanels !== undefined) {
                    const currentPanels = (proj as any).panels || {};
                    const currentNumPanels = Object.keys(currentPanels).length;
                    const newNumPanels = projectSettingsData.numPanels;

                    if (newNumPanels !== currentNumPanels) {
                      const newPanels: any = {};
                      for (let i = 1; i <= newNumPanels; i++) {
                        newPanels[i] = currentPanels[i] || [];
                      }
                      updates.panels = newPanels;
                    }
                  }

                  // Si hay fecha de fin definida, marcar como completado y guardar la fecha
                  if (projectSettingsData.endDate !== undefined) {
                    if (projectSettingsData.endDate) {
                      updates.endDate = projectSettingsData.endDate;
                      updates.status = "completed";
                      updates.completedDate = projectSettingsData.endDate;
                    } else {
                      // Si se borra la fecha de fin, quitar también el endDate
                      updates.endDate = undefined;
                    }
                  }

                  updateProj(proj.id, updates);
                  setShowProjectSettings(false);
                  setProjectSettingsData({});
                }}
              >
                Guardar cambios
              </Btn>
            </div>
          </div>
        </Modal>

        {/* Modal editar objeto */}
        <Modal
          open={showEditObjectModal}
          onClose={() => {
            setShowEditObjectModal(false);
            setEditObjectData(null);
            setEditObjectOriginalId(null);
          }}
          title="Editar Objeto"
        >
          <div className="grid gap-4">
            <label className="grid gap-1">
              <Label>Código oficial</Label>
              <input
                value={editObjectData?.id || ""}
                onChange={(e) => setEditObjectData({ ...editObjectData, id: e.target.value })}
                className={INPUT_CLS}
                placeholder="M31"
              />
            </label>
            <label className="grid gap-1">
              <Label>Nombre común</Label>
              <input
                value={editObjectData?.commonName || ""}
                onChange={(e) => setEditObjectData({ ...editObjectData, commonName: e.target.value })}
                className={INPUT_CLS}
                placeholder="Galaxia de Andrómeda"
              />
            </label>
            <label className="grid gap-1">
              <Label>Constelación</Label>
              <input
                value={editObjectData?.constellation || ""}
                onChange={(e) => setEditObjectData({ ...editObjectData, constellation: e.target.value })}
                className={INPUT_CLS}
                placeholder="Andrómeda"
              />
            </label>
            <label className="grid gap-1">
              <Label>Tipo de objeto</Label>
              <select
                value={editObjectData?.type || ""}
                onChange={(e) => setEditObjectData({ ...editObjectData, type: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="">Seleccionar tipo</option>
                <option value="Galaxia">Galaxia</option>
                <option value="Nebulosa">Nebulosa</option>
                <option value="Cúmulo globular">Cúmulo globular</option>
                <option value="Cúmulo abierto">Cúmulo abierto</option>
                <option value="Nebulosa planetaria">Nebulosa planetaria</option>
                <option value="Remanente de supernova">Remanente de supernova</option>
                <option value="Otro">Otro</option>
              </select>
            </label>

            <div className="flex items-center justify-end gap-2 mt-2">
              <Btn
                outline
                onClick={() => {
                  setShowEditObjectModal(false);
                  setEditObjectData(null);
                  setEditObjectOriginalId(null);
                }}
              >
                Cancelar
              </Btn>
              <Btn
                onClick={() => {
                  if (!editObjectData || !editObjectOriginalId) return;

                  setObjects((prev) =>
                    prev.map((o) =>
                      o.id === editObjectOriginalId
                        ? {
                            ...o,
                            id: editObjectData.id.trim() || o.id,
                            commonName: editObjectData.commonName.trim(),
                            constellation: editObjectData.constellation.trim(),
                            type: editObjectData.type,
                          }
                        : o,
                    ),
                  );
                  setShowEditObjectModal(false);
                  setEditObjectData(null);
                  setEditObjectOriginalId(null);
                }}
              >
                Guardar cambios
              </Btn>
            </div>
          </div>
        </Modal>

        {/* Modal inicial para cargar archivo JSON */}
        <Modal
          open={showInitialFilePrompt}
          onClose={() => setShowInitialFilePrompt(false)}
          title="Bienvenido a AstroBoard"
        >
          <div className="grid gap-4">
            <p className="text-slate-600 dark:text-slate-400">
              Para comenzar, necesitas importar un archivo JSON con tus datos o crear un nuevo proyecto.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-800 transition-colors justify-center">
              <Upload className="w-5 h-5" />
              <span className="font-medium">Importar archivo JSON</span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  let json;
                  try {
                    json = JSON.parse(text);
                  } catch {
                    alert("JSON no válido: el archivo no contiene JSON válido");
                    e.target.value = "";
                    return;
                  }
                  
                  // Validar y sanitizar datos con Zod
                  const validationResult = validateJsonUpload(json);
                  if (!validationResult.success) {
                    alert(validationResult.error || "Error de validación");
                    e.target.value = "";
                    return;
                  }

                  const objectsData = validationResult.data!.objects;
                  const settingsData = validationResult.data!.settings;
                  
                  setObjects(objectsData);
                  try {
                    localStorage.setItem("astroTrackerData", JSON.stringify(objectsData));
                  } catch (err) {
                    console.warn("No se pudo guardar en localStorage:", err);
                  }
                  
                  // Restaurar settings si existen
                  if (settingsData) {
                    if (settingsData.userName) setUserName(settingsData.userName);
                    if (settingsData.cameras && Array.isArray(settingsData.cameras)) {
                      setCameras(settingsData.cameras.length > 0 ? settingsData.cameras : [""]);
                    }
                    if (settingsData.telescopes && Array.isArray(settingsData.telescopes)) {
                      setTelescopes(settingsData.telescopes.length > 0 ? settingsData.telescopes : [{ name: "", focalLength: "" }]);
                    }
                    if (settingsData.locations && Array.isArray(settingsData.locations)) {
                      setLocations(settingsData.locations.length > 0 ? settingsData.locations : [{ name: "", coords: "" }]);
                    }
                    if (settingsData.mainLocation) setMainLocation(settingsData.mainLocation);
                    if (settingsData.guideTelescope) setGuideTelescope(settingsData.guideTelescope);
                    if (settingsData.guideCamera) setGuideCamera(settingsData.guideCamera);
                    if (settingsData.mount) setMount(settingsData.mount);
                    if (settingsData.dateFormat) setDateFormat(settingsData.dateFormat);
                    if (settingsData.minAltitudeLimit !== undefined) setMinAltitudeLimit(settingsData.minAltitudeLimit);
                    if (settingsData.language && (settingsData.language === 'es' || settingsData.language === 'en')) {
                      setLanguage(settingsData.language);
                    }
                    
                    const settings = {
                      defaultTheme,
                      jsonPath: f.name,
                      cameras: settingsData.cameras || cameras.filter((c) => c.trim() !== ""),
                      telescopes: settingsData.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                      locations: settingsData.locations || locations.filter((l) => l.name.trim() !== ""),
                      mainLocation: settingsData.mainLocation || mainLocation,
                      guideTelescope: settingsData.guideTelescope || guideTelescope,
                      guideCamera: settingsData.guideCamera || guideCamera,
                      mount: settingsData.mount || mount,
                      dateFormat: settingsData.dateFormat || dateFormat,
                      userName: settingsData.userName || userName,
                      language: settingsData.language || language,
                      minAltitudeLimit: settingsData.minAltitudeLimit !== undefined ? settingsData.minAltitudeLimit : minAltitudeLimit,
                    };
                    localStorage.setItem("astroTrackerSettings", JSON.stringify(settings));
                  }
                  
                  // Force immediate cloud sync for imported data
                  if (cloudSyncRef.current.isCloudEnabled) {
                    console.log('[Import] Triggering force cloud sync with await');
                    const settingsForSync = {
                      defaultTheme,
                      jsonPath: f.name,
                      cameras: settingsData?.cameras || cameras.filter((c) => c.trim() !== ""),
                      telescopes: settingsData?.telescopes || telescopes.filter((t) => t.name.trim() !== ""),
                      locations: settingsData?.locations || locations.filter((l) => l.name.trim() !== ""),
                      mainLocation: settingsData?.mainLocation || mainLocation,
                      guideTelescope: settingsData?.guideTelescope || guideTelescope,
                      guideCamera: settingsData?.guideCamera || guideCamera,
                      mount: settingsData?.mount || mount,
                      dateFormat: settingsData?.dateFormat || dateFormat,
                      userName: settingsData?.userName || userName,
                      language: settingsData?.language || language,
                      minAltitudeLimit: settingsData?.minAltitudeLimit !== undefined ? settingsData.minAltitudeLimit : minAltitudeLimit,
                    };
                    const syncSuccess = await forceCloudSync(objectsData, [], settingsForSync);
                    if (syncSuccess) {
                      toast({
                        title: 'Datos sincronizados',
                        description: 'Los datos importados se han guardado en la nube',
                      });
                    }
                  }
                  
                  setHasImportedData(true);
                  setShowInitialFilePrompt(false);
                  setJsonPath(f.name);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-sm text-slate-500">o</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <Btn
              onClick={() => {
                setShowInitialFilePrompt(false);
                setMObj(true);
              }}
            >
              <Plus className="w-4 h-4" /> Crear primer objeto
            </Btn>
          </div>
        </Modal>

        {/* Modal para mostrar sesiones del día seleccionado */}
        {selectedDayInfo && (
          <Modal
            open={!!selectedDayInfo}
            onClose={() => setSelectedDayInfo(null)}
            title={`Sesiones del ${selectedDayInfo.day} de ${["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][selectedDayInfo.month]} ${selectedDayInfo.year}`}
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {selectedDayInfo.projects.length} proyecto{selectedDayInfo.projects.length !== 1 ? "s" : ""} con
                sesiones en este día:
              </p>
              {selectedDayInfo.projects.map((proj, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    // Navegar al proyecto
                    setSelectedObjectId(proj.objectId);
                    setSelectedProjectId(proj.projectId);
                    setView("project");
                    setSelectedDayInfo(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {proj.objectName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{proj.projectName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {proj.sessionsCount} sesión{proj.sessionsCount !== 1 ? "es" : ""}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition" />
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {/* Modal para ver imágenes ampliadas */}
        {imageModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setImageModalOpen(false)}
          >
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Cerrar"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={imageModalSrc}
              alt="Vista ampliada"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Diálogo de configuración del reporte */}
        <Dialog open={showReportConfig} onOpenChange={setShowReportConfig}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Reporte del Proyecto</DialogTitle>
              <DialogDescription>
                Selecciona qué información deseas incluir en el reporte PDF
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Tema del reporte */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Tema del reporte</h3>
                <RadioGroup 
                  value={reportConfig.theme} 
                  onValueChange={(value: 'dark' | 'light') => setReportConfig({...reportConfig, theme: value})}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <label htmlFor="theme-dark" className="text-sm cursor-pointer">Modo oscuro</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <label htmlFor="theme-light" className="text-sm cursor-pointer">Modo claro</label>
                  </div>
                </RadioGroup>
              </div>

              {/* Imágenes */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Imágenes</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-image" 
                      checked={reportConfig.includeImage}
                      onCheckedChange={(checked) => setReportConfig({...reportConfig, includeImage: !!checked})}
                    />
                    <label htmlFor="include-image" className="text-sm cursor-pointer">
                      Incluir imagen final del proyecto
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-filter-images" 
                      checked={reportConfig.includeFilterImages}
                      onCheckedChange={(checked) => setReportConfig({...reportConfig, includeFilterImages: !!checked})}
                    />
                    <label htmlFor="include-filter-images" className="text-sm cursor-pointer">
                      Incluir imágenes iniciales y finales de filtros
                    </label>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Estadísticas del proyecto</h3>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  {Object.entries({
                    status: 'Estado',
                    nights: 'Noches',
                    sessions: 'Sesiones',
                    activeTime: 'Tiempo activo',
                    totalLights: 'Lights totales',
                    totalExposure: 'Exposición total',
                    goal: 'Objetivo',
                    avgSNR: 'SNR medio',
                    telescope: 'Telescopio',
                    camera: 'Cámara',
                    location: 'Localización',
                    bortle: 'Bortle'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`stat-${key}`}
                        checked={reportConfig.includeStats[key as keyof typeof reportConfig.includeStats]}
                        onCheckedChange={(checked) => setReportConfig({
                          ...reportConfig, 
                          includeStats: {...reportConfig.includeStats, [key]: !!checked}
                        })}
                      />
                      <label htmlFor={`stat-${key}`} className="text-sm cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla de sesiones */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-table" 
                  checked={reportConfig.includeTable}
                  onCheckedChange={(checked) => setReportConfig({...reportConfig, includeTable: !!checked})}
                />
                <label htmlFor="include-table" className="text-sm font-medium cursor-pointer">
                  Incluir tabla de sesiones
                </label>
              </div>

              {/* Gráficas */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Gráficas</h3>
                <div className="grid grid-cols-1 gap-2 pl-4">
                  {Object.entries({
                    progressChart: 'Progreso acumulado',
                    filterChart: 'Exposición por filtro',
                    lightsChart: 'Iluminación por sesión',
                    snrMeanChart: 'SNR medio por sesión',
                    snrRGBChart: 'SNR RGB por sesión'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`chart-${key}`}
                        checked={reportConfig.includeCharts[key as keyof typeof reportConfig.includeCharts]}
                        onCheckedChange={(checked) => setReportConfig({
                          ...reportConfig, 
                          includeCharts: {...reportConfig.includeCharts, [key]: !!checked}
                        })}
                      />
                      <label htmlFor={`chart-${key}`} className="text-sm cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowReportConfig(false)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!obj || !proj) return;
                  setGeneratingReport(true);
                  try {
                    await generatePDFReport(obj, proj, reportConfig, dateFormat, toast);
                  } catch (error) {
                    console.error('Error generating report:', error);
                    toast({
                      title: "Error",
                      description: "Hubo un error al generar el reporte",
                      variant: "destructive"
                    });
                  } finally {
                    setGeneratingReport(false);
                    setShowReportConfig(false);
                  }
                }}
                disabled={generatingReport}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Exportar PDF
                  </>
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Bottom Navigation Bar - Only visible on mobile when in objects view */}
        {view === "objects" && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            <div className="bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
              <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
                <button
                  onClick={() => setMainSection("pronostico")}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all min-w-[56px] ${
                    mainSection === "pronostico"
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <CloudSun className={`w-6 h-6 ${mainSection === "pronostico" ? "text-primary" : "text-muted-foreground"}`} />
                </button>

                <button
                  onClick={() => setMainSection("planificacion")}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all min-w-[56px] ${
                    mainSection === "planificacion"
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <Calendar className={`w-6 h-6 ${mainSection === "planificacion" ? "text-primary" : "text-muted-foreground"}`} />
                </button>

                <button
                  onClick={() => setMainSection("objetos")}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all min-w-[56px] ${
                    mainSection === "objetos"
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <Telescope className={`w-6 h-6 ${mainSection === "objetos" ? "text-primary" : "text-muted-foreground"}`} />
                </button>

                <button
                  onClick={() => setMainSection("estadisticas")}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all min-w-[56px] ${
                    mainSection === "estadisticas"
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <BarChart3 className={`w-6 h-6 ${mainSection === "estadisticas" ? "text-primary" : "text-muted-foreground"}`} />
                </button>

                <button
                  onClick={() => setMainSection("galeria")}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all min-w-[56px] ${
                    mainSection === "galeria"
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <ImageIcon className={`w-6 h-6 ${mainSection === "galeria" ? "text-primary" : "text-muted-foreground"}`} />
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>


      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-border/50 mt-auto">
        Astroboard es creado por Álvaro Queizán © 2026
      </footer>
    </div>
  );
}
