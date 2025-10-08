import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, FolderOpen, Telescope, Star, Upload, Download, Trash2, Moon, Sun, Calendar, ChevronLeft, Database, Pencil, MessageCircle, Settings, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { calculateMoonPhase, formatMoonPhase, calculateMoonTimes, type MoonPhase } from "@/lib/lunar-phase";

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const INPUT_CLS = "border rounded-xl px-3 py-2 bg-white/80 dark:bg-slate-900/60 text-sm md:text-base";
const num = (v: any, d = 0) => (Number.isFinite(+v) ? +v : d);
const toISODate = (d: string) => {
  if (!/^\d{2}\/\d{2}\/\d{2,4}$/.test(d)) return d;
  const [dd, mm, yy] = d.split("/");
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};
const hh = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
const mean = (s: any) => {
  if (!s) return null;
  const a = [s.snrR, s.snrG, s.snrB].filter((v: any) => Number.isFinite(v));
  return a.length ? a.reduce((x: number, y: number) => x + y, 0) / a.length : null;
};
const totalExposureSec = (sessions: any[]) => sessions.reduce((a, s) => a + (s.lights || 0) * (s.exposureSec || 0), 0);
const cumulativeLights = (sessions: any[], i: number) => sessions.slice(0, i + 1).reduce((a, s) => a + (s.lights || 0), 0);

const sampleSessions = [
  { id: uid("ses"), date: toISODate("22/09/25"), lights: 48, exposureSec: 180, filter: "RGB", snrR: 49.54, snrG: 50.77, snrB: 48.36, notes: "Noche estable.", moonPhase: formatMoonPhase(calculateMoonPhase(toISODate("22/09/25"))) },
  { id: uid("ses"), date: toISODate("23/09/25"), lights: 60, exposureSec: 180, filter: "RGB", snrR: 51.91, snrG: 53.46, snrB: 50.89, notes: "Ligera bruma.", moonPhase: formatMoonPhase(calculateMoonPhase(toISODate("23/09/25"))) }
];

const sample = [{
  id: "M31", commonName: "Galaxia de Andrómeda", constellation: "Andrómeda", type: "Galaxia", createdAt: new Date().toISOString(), image: undefined,
  projects: [{
    id: uid("proj"), name: "Proyecto Trevinca", description: "Campaña principal RGB", createdAt: new Date().toISOString(), startDate: new Date().toISOString(), status: "active", completedDate: undefined, images: {},
    sessions: sampleSessions,
    panels: {
      1: sampleSessions
    }
  }]
}];

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700/60">
    {children}
  </span>
);

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`rounded-2xl border shadow-sm p-3 md:p-4 ${className} ${onClick ? "cursor-pointer transition hover:shadow" : ""}`} 
       data-card
       style={{
         borderColor: 'var(--card-border, rgb(226 232 240))',
         background: 'var(--card-bg, rgba(255, 255, 255, 0.7))'
       }}
       onClick={onClick}>
    {children}
  </div>
);

type ImageItem = {
  src: string;
  title: string;
  type?: string;
};

const ImageCarousel = ({ images }: { images: ImageItem[] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);
  
  return (
    <Card className="p-4 mb-4">
      <div className="relative h-48 overflow-hidden rounded-xl">
        <img 
          src={images[currentImageIndex].src} 
          alt={images[currentImageIndex].title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="text-white text-sm font-medium">{images[currentImageIndex].title}</div>
          {images[currentImageIndex].type && (
            <div className="text-white/80 text-xs">{images[currentImageIndex].type}</div>
          )}
        </div>
        <div className="absolute bottom-4 right-4 flex gap-1">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentImageIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
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

const Btn = ({ children, onClick, outline, type = "button" }: { children: React.ReactNode; onClick?: () => void; outline?: boolean; type?: "button" | "submit" | "reset" }) => {
  const isAstro = typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'astro';
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
      }`}>
      {children}
    </button>
  );
};

const IconBtn = ({ title, onClick, children }: { title: string; onClick: (e?: any) => void; children: React.ReactNode }) => (
  <button title={title} onClick={onClick} className="p-2 rounded-xl border bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition">
    {children}
  </button>
);

const Modal = ({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-2 md:p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-semibold">{title}</h3>
            <IconBtn title="Cerrar" onClick={onClose}>
              <Trash2 className="w-4 h-4 rotate-45" />
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
  <button aria-label={title} title={title} onClick={onClick} className="fixed md:hidden bottom-5 right-5 rounded-full p-4 shadow-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
    <Plus className="w-6 h-6" />
  </button>
);

function FObject({ onSubmit }: { onSubmit: (obj: any) => void }) {
  const [id, setId] = useState("");
  const [commonName, setCommonName] = useState("");
  const [constellation, setConstellation] = useState("");
  const [type, setType] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const x = id.trim();
    if (!x) return;
    
    let imageData = undefined;
    if (imageFile) {
      try {
        imageData = await compressImage(imageFile);
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
      }
    }
    
    onSubmit({ id: x, commonName, constellation, type, image: imageData });
  };
  
  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label className="grid gap-1"><Label>Código oficial</Label><input value={id} onChange={(e) => setId(e.target.value)} className={INPUT_CLS} placeholder="M31" /></label>
      <label className="grid gap-1"><Label>Nombre común</Label><input value={commonName} onChange={(e) => setCommonName(e.target.value)} className={INPUT_CLS} placeholder="Galaxia de Andrómeda" /></label>
      <label className="grid gap-1"><Label>Constelación</Label><input value={constellation} onChange={(e) => setConstellation(e.target.value)} className={INPUT_CLS} placeholder="Andrómeda" /></label>
      <label className="grid gap-1">
        <Label>Tipo de objeto</Label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_CLS}>
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
      
      <div className="grid gap-1">
        <Label>Imagen del objeto (opcional)</Label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {imageFile ? imageFile.name : 'Arrastra una imagen aquí o haz clic para seleccionar'}
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="object-image-upload"
          />
          <label htmlFor="object-image-upload" className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Seleccionar archivo
          </label>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-2">
        <Btn outline onClick={() => { setId(""); setCommonName(""); setConstellation(""); setType(""); setImageFile(null); }}>Limpiar</Btn>
        <Btn type="submit"><Plus className="w-3 h-3 md:w-4 md:h-4" /> Crear objeto</Btn>
      </div>
    </form>
  );
}

function FProject({ onSubmit, cameras = [], telescopes = [] }: { onSubmit: (proj: any) => void; cameras?: string[]; telescopes?: { name: string; focalLength: string }[] }) {
  const [name, setName] = useState("Proyecto Trevinca");
  const [description, setDescription] = useState("Campaña principal");
  const [projectType, setProjectType] = useState("ONP");
  const [filters, setFilters] = useState<string[]>(["UV/IR", "HA/OIII", "No Filter"]);
  const [newFilter, setNewFilter] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedTelescope, setSelectedTelescope] = useState("");
  const [customCamera, setCustomCamera] = useState("");
  const [customTelescope, setCustomTelescope] = useState("");
  const [showCustomCamera, setShowCustomCamera] = useState(false);
  const [showCustomTelescope, setShowCustomTelescope] = useState(false);
  const [numPanels, setNumPanels] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const handleAddFilter = () => {
    if (newFilter.trim() && !filters.includes(newFilter.trim())) {
      setFilters([...filters, newFilter.trim()]);
      setNewFilter("");
    }
  };
  
  const handleRemoveFilter = (filter: string) => {
    setFilters(filters.filter(f => f !== filter));
  };
  
  const handleSubmit = () => {
    const finalCamera = selectedCamera === "Otro" ? customCamera.trim() : selectedCamera;
    const finalTelescope = selectedTelescope === "Otro" ? customTelescope.trim() : selectedTelescope;
    onSubmit({ 
      name, 
      description, 
      projectType,
      filters,
      equipment: {
        camera: finalCamera,
        telescope: finalTelescope
      },
      numPanels,
      startDate: new Date(startDate).toISOString()
    });
  };
  
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <label className="grid gap-1">
        <Label>Nombre del proyecto</Label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} placeholder="Proyecto Trevinca" />
      </label>
      
      <label className="grid gap-1">
        <Label>Descripción</Label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLS} rows={2} placeholder="Campaña principal" />
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
          {filters.map(filter => (
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFilter(); } }}
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
              {cameras.filter(c => c.trim()).map(camera => (
                <option key={camera} value={camera}>{camera}</option>
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
              {telescopes.filter(t => t.name.trim()).map(telescope => (
                <option key={telescope.name} value={telescope.name}>{telescope.name} {telescope.focalLength ? `(${telescope.focalLength}mm)` : ''}</option>
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
        <Label>Fecha de inicio del proyecto</Label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          className={INPUT_CLS}
        />
      </label>
      
      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn type="submit"><Plus className="w-3 h-3 md:w-4 md:h-4" /> Crear proyecto</Btn>
      </div>
    </form>
  );
}

function FSession({ onSubmit, initial, availableFilters, cameras, projectEquipment, telescopes }: { onSubmit: (session: any) => void; initial?: any; availableFilters: string[]; cameras: string[]; projectEquipment?: any; telescopes?: { name: string; focalLength: string }[] }) {
  const init = initial || {};
  const [date, setDate] = useState(init.date || new Date().toISOString().slice(0, 10));
  const [lights, setLights] = useState(init.lights ?? 60);
  const [exposureSec, setExposureSec] = useState(init.exposureSec ?? 180);
  const [filter, setFilter] = useState(init.filter || (availableFilters[0] || "RGB"));
  const [camera, setCamera] = useState(init.camera || projectEquipment?.camera || "");
  const [telescope, setTelescope] = useState(init.telescope || "");
  const [customTelescope, setCustomTelescope] = useState("");
  const [showCustomTelescope, setShowCustomTelescope] = useState(false);
  
  // Si no hay valor inicial, preseleccionar el telescopio del proyecto
  useEffect(() => {
    if (!init.telescope && projectEquipment?.telescope) {
      setTelescope(projectEquipment.telescope);
    }
  }, []);
  const [snrR, setSnrR] = useState(init.snrR ?? "");
  const [snrG, setSnrG] = useState(init.snrG ?? "");
  const [snrB, setSnrB] = useState(init.snrB ?? "");
  const [notes, setNotes] = useState(init.notes ?? "");
  
  // Calcular fase lunar basado en la fecha seleccionada
  const moonPhase = useMemo(() => {
    if (!date) return null;
    return calculateMoonPhase(date);
  }, [date]);
  
  return (
    <form className="grid gap-3" onSubmit={(e) => { 
      e.preventDefault(); 
      onSubmit({ 
        date, 
        lights: num(lights), 
        exposureSec: num(exposureSec, 1), 
        filter,
        camera,
        telescope,
        snrR: snrR !== "" ? parseFloat(snrR) : undefined, 
        snrG: snrG !== "" ? parseFloat(snrG) : undefined, 
        snrB: snrB !== "" ? parseFloat(snrB) : undefined, 
        notes,
        moonPhase: moonPhase ? formatMoonPhase(moonPhase) : undefined
      });
    }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1"><Label>Fecha</Label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLS} /></label>
        <label className="grid gap-1">
          <Label>Filtro</Label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={INPUT_CLS}>
            {availableFilters.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><Label>Lights</Label><input type="number" value={lights} min={0} onChange={(e) => setLights(parseInt(e.target.value || "0", 10))} className={INPUT_CLS} /></label>
        <label className="grid gap-1"><Label>Exposición por light (s)</Label><input type="number" value={exposureSec} min={1} onChange={(e) => setExposureSec(parseInt(e.target.value || "0", 10))} className={INPUT_CLS} /></label>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <Label>Cámara</Label>
          <select value={camera} onChange={(e) => setCamera(e.target.value)} className={INPUT_CLS}>
            <option value="">Seleccionar cámara</option>
            {cameras.filter(c => c.trim() !== "").map(c => <option key={c} value={c}>{c}</option>)}
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
            {telescopes?.filter(t => t.name.trim()).map(t => (
              <option key={t.name} value={t.name}>{t.name} {t.focalLength ? `(${t.focalLength}mm)` : ''}</option>
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
        <label className="grid gap-1"><Label>SNR - R</Label><input value={snrR} onChange={(e) => setSnrR(e.target.value)} className={INPUT_CLS} /></label>
        <label className="grid gap-1"><Label>SNR - G</Label><input value={snrG} onChange={(e) => setSnrG(e.target.value)} className={INPUT_CLS} /></label>
        <label className="grid gap-1"><Label>SNR - B</Label><input value={snrB} onChange={(e) => setSnrB(e.target.value)} className={INPUT_CLS} /></label>
      </div>
      <label className="grid gap-1"><Label>Notas</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={INPUT_CLS} /></label>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2">
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Tiempo total: <b>{hh(lights * exposureSec)}</b></div>
        <Btn type="submit"><Plus className="w-3 h-3 md:w-4 md:h-4" /> Guardar</Btn>
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
        const canvas = document.createElement('canvas');
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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Dibujar la imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Comprimir a WebP (o JPEG si WebP no está disponible)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            const blobReader = new FileReader();
            blobReader.onloadend = () => resolve(String(blobReader.result));
            blobReader.onerror = reject;
            blobReader.readAsDataURL(blob);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SNRChart = ({ sessions }: { sessions: any[] }) => {
  const s = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  const data = useMemo(() => s.map((x, i, a) => ({ 
    lightTotal: cumulativeLights(a, i),
    snr: mean(x) 
  })), [s]);
  const first = useMemo(() => { const m = mean(s[0]); return Number.isFinite(m) ? m : 0; }, [s]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Star} title="SNR (media) vs acumulado de lights" />
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="lightTotal" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} domain={[Math.max(first - 1, 0), "dataMax"]} tickFormatter={(v) => typeof v === "number" ? v.toFixed(2) : v} stroke="#ffffff" />
          <Tooltip formatter={(v) => typeof v === "number" ? v.toFixed(2) : v} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Line type="monotone" dataKey="snr" stroke="#3b82f6" strokeWidth={3} dot />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const SNRRGBChart = ({ sessions }: { sessions: any[] }) => {
  const s = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  const data = useMemo(() => s.map((x, i, a) => ({ 
    lightTotal: cumulativeLights(a, i),
    r: Number.isFinite(x.snrR) ? x.snrR : null, 
    g: Number.isFinite(x.snrG) ? x.snrG : null, 
    b: Number.isFinite(x.snrB) ? x.snrB : null 
  })), [s]);
  const firstMin = useMemo(() => { const t = s[0], v = [t?.snrR, t?.snrG, t?.snrB].filter((x) => Number.isFinite(x)); return v.length ? Math.min(...v) : 0; }, [s]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Star} title="SNR por canal (R/G/B) vs acumulado de lights" />
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="lightTotal" tickMargin={8} stroke="#ffffff" />
          <YAxis tickMargin={8} domain={[Math.max(firstMin - 1, 0), "dataMax"]} tickFormatter={(v) => typeof v === "number" ? v.toFixed(2) : v} stroke="#ffffff" />
          <Tooltip formatter={(v) => typeof v === "number" ? v.toFixed(2) : v} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
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
  const data = useMemo(() => s.map((x, index) => {
    const moonData = calculateMoonPhase(x.date);
    return { 
      session: index + 1, 
      illumination: moonData.illumination 
    };
  }), [s]);
  
  const avgIllumination = useMemo(() => {
    const validValues = data.map(d => d.illumination);
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
  }, [data]);
  
  const yDomain = useMemo(() => {
    if (!data.length) return [0, 100];
    const illuminations = data.map(d => d.illumination);
    const min = Math.floor(Math.min(...illuminations));
    const max = Math.ceil(Math.max(...illuminations));
    return [min, max];
  }, [data]);
  
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Moon} title="Iluminación lunar por sesión" />
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        % medio de iluminación: <span className="font-semibold text-slate-900 dark:text-slate-100">{avgIllumination.toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="session" 
            tickMargin={8} 
            stroke="#ffffff"
          />
          <YAxis 
            tickMargin={8} 
            domain={yDomain} 
            stroke="#ffffff" 
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="illumination" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', r: 4 }} name="Iluminación lunar" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const ExposureChart = ({ sessions }: { sessions: any[] }) => {
  const d = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => ({ sesion: i + 1, date: s.date, horas: (s.lights * s.exposureSec) / 3600 })), [sessions]);
  if (!d.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Calendar} title="Exposición por noche (horas)" />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="sesion" tickMargin={8} stroke="#ffffff" label={{ value: 'Número de sesión', position: 'insideBottom', offset: -10, fill: '#ffffff' }} />
          <YAxis tickMargin={8} stroke="#ffffff" />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} labelFormatter={(value) => `Sesión ${value}`} formatter={(value, name, props) => [value, `${props.payload.date}`]} />
          <Bar dataKey="horas" fill="#3b82f6" />
        </BarChart>
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

export default function AstroTracker() {
  const [objects, setObjects] = useState(sample);
  const [view, setView] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [mObj, setMObj] = useState(false);
  const [mProj, setMProj] = useState(false);
  const [mSes, setMSes] = useState(false);
  const [editSes, setEditSes] = useState<any>(null);
  const [sortObjects, setSortObjects] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [filterConstellation, setFilterConstellation] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [theme, setTheme] = useState("astro");
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [defaultTheme, setDefaultTheme] = useState("astro");
  const [jsonPath, setJsonPath] = useState("");
  const [cameras, setCameras] = useState<string[]>([""]);
  const [telescopes, setTelescopes] = useState<{ name: string; focalLength: string }[]>([{ name: "", focalLength: "" }]);
  const [showInitialFilePrompt, setShowInitialFilePrompt] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(1);
  const [showEditPanels, setShowEditPanels] = useState(false);
  const [editNumPanels, setEditNumPanels] = useState(1);
  const [userName, setUserName] = useState<string>("");
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [newObjectId, setNewObjectId] = useState("");
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [projectSettingsData, setProjectSettingsData] = useState<any>({});
  
  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "astro";
      return "light";
    });
  };

  // Load settings and data from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('astroTrackerSettings');
    const savedData = localStorage.getItem('astroTrackerData');
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.defaultTheme) {
          setDefaultTheme(settings.defaultTheme);
          setTheme(settings.defaultTheme);
        }
        if (settings.jsonPath) setJsonPath(settings.jsonPath);
        if (settings.cameras) setCameras(settings.cameras);
        if (settings.telescopes) setTelescopes(settings.telescopes);
        if (settings.userName) setUserName(settings.userName);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
    
    // Load data from localStorage if exists
    if (savedData && savedData !== '[]') {
      try {
        const data = JSON.parse(savedData);
        if (Array.isArray(data) && data.length > 0) {
          setObjects(data);
        } else {
          setShowInitialFilePrompt(true);
        }
      } catch (e) {
        console.error('Error loading data:', e);
        setShowInitialFilePrompt(true);
      }
    } else {
      setShowInitialFilePrompt(true);
    }
  }, []);

  // Auto-save objects to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('astroTrackerData', JSON.stringify(objects));
    } catch (err) {
      console.warn('No se pudo guardar en localStorage:', err);
    }
  }, [objects]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    const settings = {
      defaultTheme,
      jsonPath,
      cameras: cameras.filter(c => c.trim() !== ""),
      telescopes: telescopes.filter(t => t.name.trim() !== ""),
      userName
    };
    localStorage.setItem('astroTrackerSettings', JSON.stringify(settings));
    setShowSettings(false);
  }, [defaultTheme, jsonPath, cameras, telescopes, userName]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const filteredObjects = useMemo(() => {
    let filtered = objects;
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(o => o.id.toLowerCase().includes(search) || (o.commonName || "").toLowerCase().includes(search) || (o.constellation || "").toLowerCase().includes(search) || (o.type || "").toLowerCase().includes(search));
    }
    if (filterConstellation !== "all") filtered = filtered.filter(o => o.constellation === filterConstellation);
    if (filterType !== "all") filtered = filtered.filter(o => o.type === filterType);
    return filtered;
  }, [objects, searchText, filterConstellation, filterType]);

  const constellations = useMemo(() => {
    const cons = new Set(objects.map(o => o.constellation).filter(Boolean));
    return Array.from(cons).sort();
  }, [objects]);

  const types = useMemo(() => {
    const ts = new Set(objects.map(o => o.type).filter(Boolean));
    return Array.from(ts).sort();
  }, [objects]);

  const obj = useMemo(() => objects.find((o) => o.id === selectedObjectId) || null, [objects, selectedObjectId]);
  const proj = useMemo(() => obj?.projects.find((p) => p.id === selectedProjectId) || null, [obj, selectedProjectId]);
  
  // Memoize random image selection for dashboard carousel
  const dashboardCarouselImages = useMemo(() => {
    const allImages: ImageItem[] = objects.flatMap(obj => [
      obj.image ? { src: obj.image, title: `${obj.id}${obj.commonName ? " · " + obj.commonName : ""}` } : null,
      ...obj.projects.flatMap(proj => 
        Object.entries(proj.images || {}).map(([key, src]) => ({
          src: src as string,
          title: `${obj.id} - ${proj.name}`,
          type: key
        }))
      )
    ]).filter((item): item is ImageItem => item !== null);
    
    if (allImages.length === 0) return [];
    if (allImages.length <= 6) return allImages;
    
    // Select 6 random images
    const shuffled = [...allImages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [objects.length, objects.reduce((acc, obj) => acc + (obj.image ? 1 : 0) + obj.projects.reduce((pAcc, p) => pAcc + Object.keys(p.images || {}).length, 0), 0)]);
  
  const addObj = useCallback((base: any) => {
    if (!base.id || objects.some((o) => o.id.toLowerCase() === base.id.toLowerCase())) { alert("Ya existe un objeto con ese código."); return; }
    const no = { ...base, id: base.id.trim(), createdAt: new Date().toISOString(), projects: [], image: undefined };
    setObjects([...objects, no]);
    setSelectedObjectId(no.id);
    setMObj(false);
    setView("projects");
  }, [objects]);

  const delObj = useCallback((id: string) => {
    if (!confirm("¿Eliminar este objeto?")) return;
    setObjects(objects.filter((o) => o.id !== id));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
      setSelectedProjectId(null);
      setView("objects");
    }
  }, [objects, selectedObjectId]);

  const addProj = useCallback((base: any) => {
    if (!obj) return;
    // Crear estructura de paneles con sesiones
    const panels: any = {};
    for (let i = 1; i <= (base.numPanels || 1); i++) {
      panels[i] = [];
    }
    const np = { id: uid("proj"), ...base, createdAt: new Date().toISOString(), startDate: base.startDate || new Date().toISOString(), status: "active", completedDate: undefined, sessions: [], panels, images: {} };
    setObjects(objects.map((o) => o.id === obj.id ? { ...o, projects: [...o.projects, np] } : o));
    setSelectedProjectId(np.id);
    setMProj(false);
    setView("project");
  }, [objects, obj]);

  const updateProj = useCallback((pid: string, updates: any) => {
    if (!obj) return;
    setObjects(objects.map((o) => o.id !== obj.id ? o : { 
      ...o, 
      projects: o.projects.map((p) => {
        if (p.id !== pid) return p;
        // Si se cambia el status a completed y no tiene completedDate, asignar la fecha actual
        const newUpdates = { ...updates };
        if (updates.status === 'completed' && !p.completedDate && p.status !== 'completed') {
          newUpdates.completedDate = new Date().toISOString();
        }
        return { ...p, ...newUpdates };
      }) 
    }));
  }, [objects, obj]);

  const updatePanelCount = useCallback((newCount: number) => {
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
  }, [objects, obj, proj, selectedPanel, updateProj]);

  const addSes = useCallback((base: any) => {
    if (!obj || !proj) return;
    const s = { ...base, id: uid("ses") };
    setObjects(objects.map((o: any) => o.id !== obj.id ? o : { 
      ...o, 
      projects: o.projects.map((p: any) => p.id === proj.id ? { 
        ...p, 
        sessions: [...p.sessions, s],
        panels: {
          ...(p.panels || {}),
          [selectedPanel]: [...(p.panels?.[selectedPanel] || []), s]
        }
      } : p) 
    }));
    setMSes(false);
  }, [objects, obj, proj, selectedPanel]);

  const editSession = useCallback((sid: string, data: any) => {
    if (!obj || !proj) return;
    setObjects(objects.map((o: any) => o.id !== obj.id ? o : { 
      ...o, 
      projects: o.projects.map((p: any) => p.id !== proj.id ? p : { 
        ...p, 
        sessions: p.sessions.map((s: any) => s.id === sid ? { ...s, ...data } : s),
        panels: Object.fromEntries(
          Object.entries(p.panels || {}).map(([panelNum, sessions]: [string, any]) => [
            panelNum,
            sessions.map((s: any) => s.id === sid ? { ...s, ...data } : s)
          ])
        )
      }) 
    }));
  }, [objects, obj, proj]);

  const deleteSession = useCallback((sid: string) => {
    if (!confirm("¿Eliminar sesión?")) return;
    if (!obj || !proj) return;
    setObjects(objects.map((o: any) => o.id !== obj.id ? o : { 
      ...o, 
      projects: o.projects.map((p: any) => p.id !== proj.id ? p : { 
        ...p, 
        sessions: p.sessions.filter((s: any) => s.id !== sid),
        panels: Object.fromEntries(
          Object.entries(p.panels || {}).map(([panelNum, sessions]: [string, any]) => [
            panelNum,
            sessions.filter((s: any) => s.id !== sid)
          ])
        )
      }) 
    }));
  }, [objects, obj, proj]);

  const delProj = useCallback((pid: string) => {
    if (!obj || !confirm("¿Eliminar proyecto?")) return;
    setObjects(objects.map((o) => o.id !== obj.id ? o : { ...o, projects: o.projects.filter((p) => p.id !== pid) }));
    if (selectedProjectId === pid) {
      setSelectedProjectId(null);
      setView("projects");
    }
  }, [objects, obj, selectedProjectId]);

  const upObjImg = useCallback((oid: string, img: string | null) => {
    setObjects(objects.map((o) => o.id !== oid ? o : { ...o, image: img }));
  }, [objects]);

  const upImgs = useCallback((patch: any) => {
    if (!obj || !proj) return;
    setObjects(objects.map((o) => o.id !== obj.id ? o : { ...o, projects: o.projects.map((p) => p.id !== proj.id ? p : { ...p, images: { ...(p.images || {}), ...patch } }) }));
  }, [objects, obj, proj]);

  const ss = useMemo(() => {
    if (!proj) return [];
    const p: any = proj;
    // Obtener sesiones del panel seleccionado
    return (p.panels?.[selectedPanel] || []).slice().sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [proj, selectedPanel]);
  
  const [tabs, setTabs] = useState<TabType[]>([]);
  const [active, setActive] = useState("");
  
  // Inicializar tabs basándose en los filtros del proyecto
  useEffect(() => {
    if (!proj) {
      setTabs([]);
      setActive("");
      return;
    }
    
    const projectFilters = (proj as any).filters || [];
    console.log('🔍 Proyecto cargado:', proj.name);
    console.log('🔍 Filtros del proyecto:', projectFilters);
    
    // Convertir filtros a string para comparación estable
    const filterString = JSON.stringify([...projectFilters].sort());
    
    setTabs((currentTabs) => {
      console.log('🔍 Tabs actuales:', currentTabs.map(t => `${t.name} (${t.custom ? 'custom' : 'auto'})`));
      
      // Obtener nombres de tabs automáticas actuales
      const currentAutoTabNames = currentTabs.filter(t => !t.custom).map(t => t.name).sort();
      const projectFilterNames = [...projectFilters].sort();
      
      // Comparar arrays
      const tabsMatchFilters = JSON.stringify(currentAutoTabNames) === JSON.stringify(projectFilterNames);
      
      console.log('🔍 ¿Tabs coinciden con filtros?', tabsMatchFilters);
      
      if (tabsMatchFilters && currentTabs.length > 0) {
        console.log('✅ Manteniendo tabs existentes');
        return currentTabs;
      }
      
      if (projectFilters.length > 0) {
        console.log('🔄 Recreando tabs desde filtros del proyecto');
        // Crear tabs automáticamente basadas en los filtros del proyecto
        const newTabs: TabType[] = projectFilters.map((filter: string) => ({
          id: `filter-${filter.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: filter,
          custom: false
        }));
        
        console.log('📋 Nuevas tabs creadas:', newTabs.map(t => t.name));
        
        // Preservar tabs personalizadas
        const customTabs = currentTabs.filter(t => t.custom);
        const allTabs = [...newTabs, ...customTabs];
        
        // Actualizar tab activa solo si la actual ya no existe
        if (!allTabs.find(t => t.id === active)) {
          setActive(allTabs[0]?.id || "");
          console.log('🎯 Tab activa cambiada a:', allTabs[0]?.name);
        }
        
        return allTabs;
      } else {
        console.log('⚠️ Proyecto sin filtros, solo tabs personalizadas');
        // Si el proyecto no tiene filtros definidos, solo mantener tabs personalizadas
        const customTabs = currentTabs.filter(t => t.custom);
        if (customTabs.length > 0 && !customTabs.find(t => t.id === active)) {
          setActive(customTabs[0]?.id || "");
        }
        return customTabs;
      }
    });
  }, [proj?.id, JSON.stringify((proj as any)?.filters || [])]);
  const [show, setShow] = useState(false);
  const [tabName, setTabName] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  
  const createTab = useCallback(() => {
    const name = tabName.trim(); 
    if (!name) return;
    
    setShow(false);
    setTabName("");
    
    // Solo actualizar proj.filters - el useEffect creará la tab automáticamente
    if (obj && proj) {
      setObjects((prevObjects) => prevObjects.map((o) => o.id !== obj.id ? o : { 
        ...o, 
        projects: o.projects.map((p) => p.id !== proj.id ? p : { 
          ...p, 
          filters: [...((p as any).filters || []), name].filter((v, i, a) => a.indexOf(v) === i)
        }) 
      }));
      
      // Activar la nueva tab después de que se cree
      setTimeout(() => {
        const newTabId = `filter-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        setActive(newTabId);
      }, 0);
    }
  }, [tabName, obj, proj, setShow, setTabName, setObjects, setActive]);
  
  const rm = useCallback((id: string) => {
    if (!confirm("¿Eliminar esta pestaña de filtro?")) return;
    
    const tabToRemove = tabs.find(t => t.id === id);
    if (!tabToRemove) return;
    
    // Remover del array de tabs
    setTabs((p) => p.filter((t) => t.id !== id));
    
    // Remover del proyecto (de proj.filters)
    if (obj && proj && tabToRemove.name) {
      setObjects((prevObjects) => prevObjects.map((o) => o.id !== obj.id ? o : { 
        ...o, 
        projects: o.projects.map((p) => p.id !== proj.id ? p : { 
          ...p, 
          filters: ((p as any).filters || []).filter((f: string) => f !== tabToRemove.name)
        }) 
      }));
    }
    
    // Si la tab eliminada era la activa, cambiar a la primera disponible
    if (active === id) {
      const remainingTabs = tabs.filter(t => t.id !== id);
      setActive(remainingTabs[0]?.id || "");
    }
  }, [tabs, active, obj, proj, setTabs, setActive, setObjects]);
  
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
    setTabs((p) => p.map(t => t.id === id ? { ...t, name } : t));
    setEditingTabId(null);
  };
  
  // Obtener filtros del proyecto, no solo de las tabs activas
  const availableFilters = useMemo(() => {
    if (!proj) return [];
    const projectFilters = (proj as any).filters || [];
    return projectFilters.length > 0 ? projectFilters : tabs.map(t => t.name);
  }, [proj, tabs]);
  
  const filt = useCallback((t: TabType | undefined) => {
    const up = (x: string) => (x || "").toUpperCase().trim();
    if (t?.preset === "rgb") return ss.filter((s: any) => up(s.filter) === "RGB");
    if (t?.preset === "haoiii") return ss.filter((s: any) => { const f = up(s.filter); return f.includes("HA") || f.includes("OIII"); });
    // Para tabs basadas en filtros del proyecto o custom, filtrar por nombre exacto (sin distinguir mayúsculas y sin espacios extra)
    if (t) {
      const tabName = up(t.name);
      return ss.filter((s: any) => {
        const sessionFilter = up(s.filter);
        return sessionFilter === tabName;
      });
    }
    return ss;
  }, [ss]);
  
  const act = tabs.find((t) => t.id === active) || tabs[0] || { id: "", name: "Sin filtro", custom: false };
  const filtered = filt(act);
  const tabLabel = act?.preset === "rgb" ? "RGB" : act?.preset === "haoiii" ? "HA/OIII" : act?.name || "Sin filtro";
  const keyPrefix = act?.preset === "rgb" ? "RGB" : act?.preset === "haoiii" ? "HAOIII" : (act?.name?.replace(/[^a-zA-Z0-9]/g, "") || "default");

  const ImageCard = ({ title, keyName }: { title: string; keyName: string }) => {
    const [isDragging, setIsDragging] = useState(false);

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
      if (file && file.type.startsWith('image/')) {
        const url = await compressImage(file);
        upImgs({ [keyName]: url });
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const url = await compressImage(f);
      upImgs({ [keyName]: url });
      e.target.value = "";
    };

    return (
      <Card className="p-4">
        <SectionTitle title={title} />
        {proj?.images?.[keyName] ? (
          <div className="space-y-3">
            <img src={proj.images[keyName]} alt={title} className="w-full rounded-xl border" />
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                <Upload className="w-4 h-4" /> Reemplazar
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <Btn outline onClick={() => upImgs({ [keyName]: undefined })}><Trash2 className="w-4 h-4" /> Quitar</Btn>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`grid place-items-center h-52 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              id={`image-upload-${keyName}`}
            />
            <label htmlFor={`image-upload-${keyName}`} className="text-center text-sm text-slate-500 cursor-pointer w-full h-full flex flex-col items-center justify-center">
              <Upload className="w-5 h-5 mx-auto mb-1" />
              <p className="mb-1">{isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen aquí o haz clic'}</p>
              <p className="text-xs text-slate-400">para subir {title.toLowerCase()}</p>
            </label>
          </div>
        )}
      </Card>
    );
  };

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
          border-color: rgba(255, 160, 122, 0.3);
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
      <div className={`min-h-screen ${theme === "astro" ? "astro-bg" : "bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950"} text-slate-900 dark:text-slate-100`}>
        <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800/70">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setView("objects");
                  setSelectedObjectId(null);
                  setSelectedProjectId(null);
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <img 
                  src={theme === 'dark' ? logoDark : logoLight} 
                  alt="StarBoard" 
                  className="h-14 w-14" 
                />
              </button>
              <div>
                <div className="font-semibold">StarBoard</div>
                <div className="text-xs text-slate-500">{view === "objects" ? "Dashboard" : view === "projects" ? "Proyectos" : "Sesiones"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view !== "objects" && (
                <Btn outline onClick={() => setView(view === "project" ? "projects" : "objects")}>
                  <ChevronLeft className="w-4 h-4" /> Volver
                </Btn>
              )}
              <Btn outline onClick={() => { const data = JSON.stringify(objects, null, 2), blob = new Blob([data], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "astrotracker.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }}>
                <Download className="w-4 h-4" /> Exportar
              </Btn>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                <Upload className="w-4 h-4" /> Importar
                <input type="file" accept="application/json" className="hidden" onChange={async (e) => { 
                  const f = e.target.files?.[0]; 
                  if (!f) return; 
                  const text = await f.text(); 
                  let json; 
                  try { json = JSON.parse(text); } catch { alert("JSON no válido"); e.target.value = ""; return; } 
                  if (Array.isArray(json)) { 
                    // Procesar cada objeto para asegurar que los filtros del proyecto incluyan todos los filtros de las sesiones
                    const processedObjects = json.map(obj => {
                      if (obj.projects && Array.isArray(obj.projects)) {
                        const processedProjects = obj.projects.map((proj: any) => {
                          // Recopilar todos los filtros únicos de las sesiones
                          const allFiltersFromSessions = new Set<string>();
                          
                          console.log('📦 Procesando proyecto:', proj.name);
                          console.log('📦 Sesiones en proyecto:', proj.sessions);
                          
                          // Buscar filtros directamente en proj.sessions
                          if (proj.sessions && Array.isArray(proj.sessions)) {
                            proj.sessions.forEach((session: any) => {
                              if (session.filter) {
                                console.log('✅ Filtro encontrado:', session.filter);
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
                                    console.log('✅ Filtro encontrado en panel:', session.filter);
                                    allFiltersFromSessions.add(session.filter);
                                  }
                                });
                              }
                            });
                          }
                          
                          // Combinar filtros existentes del proyecto con los encontrados en las sesiones
                          const existingFilters = proj.filters || [];
                          const combinedFilters = [...new Set([...existingFilters, ...Array.from(allFiltersFromSessions)])];
                          
                          console.log('🎯 Filtros finales para proyecto:', proj.name, combinedFilters);
                          
                          return {
                            ...proj,
                            filters: combinedFilters
                          };
                        });
                        
                        return {
                          ...obj,
                          projects: processedProjects
                        };
                      }
                      return obj;
                    });
                    
                    setObjects(processedObjects); 
                    setView("objects"); 
                    setSelectedObjectId(null); 
                    setSelectedProjectId(null); 
                  } else { 
                    alert("Formato no válido"); 
                  } 
                  e.target.value = ""; 
                }} />
              </label>
              <IconBtn title={theme === "light" ? "Cambiar a oscuro" : theme === "dark" ? "Cambiar a Astro" : "Cambiar a claro"} onClick={cycleTheme}>
                {theme === "light" ? <Moon className="w-4 h-4" /> : theme === "dark" ? <Star className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </IconBtn>
              <IconBtn title="Configuración" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {view === "objects" && (
            <div className="grid gap-4">
              {/* Saludo personalizado con fase lunar */}
              {(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                let greeting = "Buenos días";
                // Buenos días: 07:01 - 12:00
                // Buenas tardes: 12:01 - 20:00  
                // Buenas noches: 20:01 - 07:00
                if ((hour === 12 && minute >= 1) || (hour > 12 && hour < 20)) {
                  greeting = "Buenas tardes";
                } else if (hour >= 20 || hour < 7 || (hour === 7 && minute === 0)) {
                  greeting = "Buenas noches";
                }
                
                const moonPhase = calculateMoonPhase(now);
                const moonTimes = calculateMoonTimes(now);
                const displayName = userName || "Astrónomo";
                
                const formatTime = (date: Date) => {
                  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                };
                
                return (
                  <div className="mb-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                      {greeting}, {displayName}
                    </h2>
                    <div className="space-y-1">
                      <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl">
                        Hoy la luna estará en fase {formatMoonPhase(moonPhase)} • {moonPhase.illumination}% iluminada
                      </p>
                      <p className="text-slate-500 dark:text-slate-500 text-base md:text-lg">
                        Sale a las {formatTime(moonTimes.moonrise)} • Se pone a las {formatTime(moonTimes.moonset)} • {moonTimes.darkHours.toFixed(1)}h de oscuridad total
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Image Carousel */}
              {dashboardCarouselImages.length > 0 && (
                <ImageCarousel images={dashboardCarouselImages} />
              )}

              {/* Global Metrics */}
              {(() => {
                // Calculate global metrics
                const totalObjects = objects.length;
                const totalProjects = objects.reduce((acc, obj) => acc + obj.projects.length, 0);
                
                // Calculate total hours and lights
                let totalHours = 0;
                let totalLights = 0;
                const uniqueDates = new Set<string>();
                let totalSessions = 0;
                
                objects.forEach(obj => {
                  obj.projects.forEach(proj => {
                    proj.sessions.forEach((session: any) => {
                      totalHours += (session.lights || 0) * (session.exposureSec || 0) / 3600;
                      totalLights += session.lights || 0;
                      uniqueDates.add(session.date);
                      totalSessions++;
                    });
                  });
                });
                
                const totalNights = uniqueDates.size;
                
                // Calculate camera usage
                const cameraCounts: Record<string, number> = {};
                objects.forEach(obj => {
                  obj.projects.forEach(proj => {
                    proj.sessions.forEach((session: any) => {
                      if (session.camera) {
                        cameraCounts[session.camera] = (cameraCounts[session.camera] || 0) + (session.lights || 0);
                      }
                    });
                  });
                });
                const totalCameraLights = Object.values(cameraCounts).reduce((sum, count) => sum + count, 0);
                
                // Calculate telescope usage
                const telescopeCounts: Record<string, number> = {};
                objects.forEach(obj => {
                  obj.projects.forEach(proj => {
                    proj.sessions.forEach((session: any) => {
                      if (session.telescope) {
                        const seconds = (session.lights || 0) * (session.exposureSec || 0);
                        telescopeCounts[session.telescope] = (telescopeCounts[session.telescope] || 0) + seconds;
                      }
                    });
                  });
                });
                
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-500/10">
                            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total Objetos y Proyectos</div>
                            <div className="text-2xl font-bold">{totalObjects} / {totalProjects}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-purple-500/10">
                            <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Horas y Lights Totales</div>
                            <div className="text-2xl font-bold">{hh(totalHours * 3600)} / {totalLights}</div>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-green-500/10">
                            <Moon className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Noches y Sesiones</div>
                            <div className="text-2xl font-bold">{totalNights} / {totalSessions}</div>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    {/* Camera Usage Statistics */}
                    {Object.keys(cameraCounts).length > 0 && (
                      <Card className="p-5 mb-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">Uso de cámaras (% de lights)</div>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(cameraCounts).sort(([,a], [,b]) => b - a).map(([camera, count]) => {
                            const percentage = totalCameraLights > 0 ? ((count / totalCameraLights) * 100).toFixed(1) : 0;
                            return (
                              <div key={camera} className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                                <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">{camera}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">{count} lights ({percentage}%)</div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                    
                    {/* Telescope Usage Statistics */}
                    {Object.keys(telescopeCounts).length > 0 && (
                      <Card className="p-5 mb-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">Uso de telescopios (horas totales)</div>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(telescopeCounts).sort(([,a], [,b]) => b - a).map(([telescope, seconds]) => {
                            return (
                              <div key={telescope} className="px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                                <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">{telescope}</div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">{hh(seconds)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </>
                );
              })()}

              {/* Calendario mensual y estadísticas de sesiones */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                
                // Obtener todas las sesiones de todos los proyectos
                const allSessions = objects.flatMap(o => 
                  o.projects.flatMap(p => p.sessions || [])
                );
                
                // Filtrar sesiones del mes actual
                const currentMonthSessions = allSessions.filter(s => {
                  const sessionDate = new Date(s.date);
                  return sessionDate.getFullYear() === year && sessionDate.getMonth() === month;
                });
                
                // Obtener días únicos con sesiones en el mes actual
                const daysWithSessions = new Set(
                  currentMonthSessions.map(s => new Date(s.date).getDate())
                );
                
                // Obtener primer y último día del mes
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const daysInMonth = lastDay.getDate();
                const startingDayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = lunes, etc
                
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Highlight de días con sesiones */}
                    <Card className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-500/10 flex-shrink-0">
                          <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Días con sesiones</div>
                          <div className="text-2xl font-bold">{daysWithSessions.size}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            en {monthNames[month]}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Calendario desplegable */}
                    <Card className="p-5 md:col-span-2">
                      <details className="group">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-blue-500/10">
                                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">Calendario</div>
                                <div className="text-2xl font-bold">{monthNames[month]} {year}</div>
                              </div>
                            </div>
                            <ChevronLeft className="w-5 h-5 transition-transform group-open:rotate-[-90deg] text-slate-400" />
                          </div>
                        </summary>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                          <div className="grid grid-cols-7 gap-2">
                            {/* Cabecera días de la semana */}
                            {["D", "L", "M", "X", "J", "V", "S"].map((day, i) => (
                              <div key={i} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
                                {day}
                              </div>
                            ))}
                            
                            {/* Espacios vacíos antes del primer día */}
                            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            
                            {/* Días del mes */}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                              const hasSession = daysWithSessions.has(day);
                              const isToday = day === now.getDate();
                              
                              return (
                                <div
                                  key={day}
                                  className={`
                                    aspect-square flex items-center justify-center rounded-lg text-sm
                                    ${hasSession 
                                      ? 'bg-green-500/20 text-green-700 dark:text-green-300 font-semibold border-2 border-green-500/40' 
                                      : 'text-slate-600 dark:text-slate-400'
                                    }
                                    ${isToday && !hasSession ? 'border-2 border-blue-500/40' : ''}
                                    ${isToday && hasSession ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                  `}
                                >
                                  {day}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    </Card>
                  </div>
                );
              })()}

              
              <div className="flex items-center justify-between">
                <SectionTitle icon={Telescope} title="Objetos astronómicos" />
                <div className="flex items-center gap-2">
                  <IconBtn title="Ordenar alfabéticamente (A-Z)" onClick={() => setSortObjects("alpha")}><span className="text-sm font-semibold">A-Z</span></IconBtn>
                  <IconBtn title="Ordenar por más recientes" onClick={() => setSortObjects("recent")}><span className="text-sm font-semibold">1-3</span></IconBtn>
                  <Btn onClick={() => setMObj(true)}><Plus className="w-4 h-4" /> Nuevo objeto</Btn>
                </div>
              </div>
              
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por código, nombre, constelación o tipo..." className={`${INPUT_CLS} w-full pl-10`} />
                    <Telescope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    {searchText && <button onClick={() => setSearchText("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                  <Btn outline onClick={() => setShowFilters(!showFilters)}>{showFilters ? "Ocultar filtros" : "Filtros avanzados"}</Btn>
                </div>
                
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <label className="grid gap-1">
                      <Label>Filtrar por constelación</Label>
                      <select value={filterConstellation} onChange={(e) => setFilterConstellation(e.target.value)} className={INPUT_CLS}>
                        <option value="all">Todas las constelaciones</option>
                        {constellations.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <Label>Filtrar por tipo</Label>
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={INPUT_CLS}>
                        <option value="all">Todos los tipos</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    {(filterConstellation !== "all" || filterType !== "all") && (
                      <div className="md:col-span-2">
                        <Btn outline onClick={() => { setFilterConstellation("all"); setFilterType("all"); }}>Limpiar filtros</Btn>
                      </div>
                    )}
                  </div>
                )}
                
                {(searchText || filterConstellation !== "all" || filterType !== "all") && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">{filteredObjects.length} objeto(s) encontrado(s)</div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredObjects.slice().sort((a, b) => {
                  if (sortObjects === "alpha") return a.id.localeCompare(b.id);
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((o) => {
                  const all = o.projects.flatMap((p: any) => p.sessions);
                  const seconds = totalExposureSec(all);
                  const nights = new Set(all.map((s: any) => s.date)).size;
                  return (
                    <Card key={o.id} className="p-4" onClick={() => { setSelectedObjectId(o.id); setView("projects"); }}>
                      <div className="flex items-start gap-3">
                         <div className="relative group flex-shrink-0">
                          {(() => {
                            // Usar imagen del objeto, si no existe usar la final del último proyecto
                            const lastProject = o.projects[o.projects.length - 1];
                            const displayImage = o.image || (lastProject as any)?.finalImage;
                            const [isDragging, setIsDragging] = useState(false);

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
                              if (file && file.type.startsWith('image/')) {
                                const url = await compressImage(file);
                                upObjImg(o.id, url);
                              }
                            };
                            
                            return displayImage ? (
                              <>
                                <img src={displayImage} alt={o.id} className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                  <label className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition" onClick={(e) => e.stopPropagation()}>
                                    <Upload className="w-4 h-4" />
                                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { e.stopPropagation(); const f = e.target.files?.[0]; if (!f) return; const url = await compressImage(f); upObjImg(o.id, url); e.target.value = ""; }} />
                                  </label>
                                  <button className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition" onClick={(e) => { e.stopPropagation(); upObjImg(o.id, null); }}>
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
                                  isDragging
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                                }`}
                              >
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={async (e) => { e.stopPropagation(); const f = e.target.files?.[0]; if (!f) return; const url = await compressImage(f); upObjImg(o.id, url); e.target.value = ""; }}
                                  id={`object-image-${o.id}`}
                                />
                                <label htmlFor={`object-image-${o.id}`} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                  <span className="text-xs text-slate-500">{isDragging ? 'Soltar' : 'Subir'}</span>
                                </label>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingObjectId === o.id ? (
                            <input 
                              value={newObjectId} 
                              onChange={(e) => setNewObjectId(e.target.value)}
                              onBlur={() => {
                                if (newObjectId.trim() && newObjectId !== o.id) {
                                  setObjects(prev => prev.map(obj => obj.id === o.id ? { ...obj, id: newObjectId.trim() } : obj));
                                }
                                setEditingObjectId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (newObjectId.trim() && newObjectId !== o.id) {
                                    setObjects(prev => prev.map(obj => obj.id === o.id ? { ...obj, id: newObjectId.trim() } : obj));
                                  }
                                  setEditingObjectId(null);
                                }
                                if (e.key === 'Escape') setEditingObjectId(null);
                              }}
                              className="px-2 py-1 border rounded text-sm w-full"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold">{o.id} <span className="text-slate-500 dark:text-slate-400">{o.commonName ? `· ${o.commonName}` : ""}</span></h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingObjectId(o.id);
                                  setNewObjectId(o.id);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                title="Editar código"
                              >
                                <Pencil className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2 text-sm">
                            {o.type && <Badge>{o.type}</Badge>}
                            {o.constellation && <Badge>{o.constellation}</Badge>}
                            <Badge>{o.projects.length} proyecto(s)</Badge>
                            <Badge>{nights} noche(s)</Badge>
                            <Badge>{hh(seconds)} totales</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <IconBtn title="Eliminar" onClick={() => delObj(o.id)}><Trash2 className="w-4 h-4" /></IconBtn>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {view === "projects" && obj && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={FolderOpen} title={`Proyectos de ${obj.id}${obj.commonName ? " · " + obj.commonName : ""}`} />
                <div className="flex items-center gap-2">
                  <Btn outline onClick={() => setView("objects")}><ChevronLeft className="w-4 h-4" /> Volver</Btn>
                  <Btn onClick={() => setMProj(true)}><Plus className="w-4 h-4" /> Nuevo</Btn>
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
                  obj.image || lastProjectFinalImage ? { 
                    src: obj.image || lastProjectFinalImage, 
                    title: `${obj.id}${obj.commonName ? " · " + obj.commonName : ""}` 
                  } : null,
                  ...obj.projects.flatMap(proj => 
                    Object.entries(proj.images || {}).map(([key, src]) => ({
                      src: src as string,
                      title: `${obj.id} - ${proj.name}`,
                      type: key
                    }))
                  )
                ].filter((item): item is ImageItem => item !== null);
                
                if (objectImages.length === 0) return null;
                
                return <ImageCarousel images={objectImages} />;
              })()}

              {/* Highlights/Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  // Calcular todas las estadísticas del objeto
                  const allSessions = obj.projects.flatMap((p: any) => p.sessions || []);
                  const totalLights = allSessions.reduce((sum: number, s: any) => sum + (s.lights || 0), 0);
                  const totalSeconds = allSessions.reduce((sum: number, s: any) => sum + (s.lights || 0) * (s.exposureSec || 0), 0);
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
                    completed: obj.projects.filter((p: any) => p.status === "completed").length
                  };

                  const lastSession = allSessions.length > 0 
                    ? allSessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                    : null;

                  return (
                    <>
                      <Card className="p-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Objeto</div>
                        <div className="text-2xl font-bold mt-1">{obj.id}</div>
                        {obj.commonName && <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{obj.commonName}</div>}
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
                        {lastSession && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Última: {lastSession.date}</div>}
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
                                const percentage = totalCameraLights > 0 ? ((count / totalCameraLights) * 100).toFixed(1) : 0;
                                return (
                                  <div key={camera} className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-sm">
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
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Telescopios utilizados</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(telescopeCounts).map(([telescope, seconds]) => {
                                return (
                                  <div key={telescope} className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-sm">
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
                            <span className="text-sm">Activos: <strong>{statusCounts.active}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm">Pausados: <strong>{statusCounts.paused}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                            <span className="text-sm">Terminados: <strong>{statusCounts.completed}</strong></span>
                          </div>
                        </div>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Projects Header with Filters */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Proyectos</h2>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                      A-Z
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                      1-3
                    </button>
                    <Btn onClick={() => setMProj(true)}>
                      <Plus className="w-4 h-4" /> Nuevo proyecto
                    </Btn>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre, constelación o tipo..."
                    className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button className="px-6 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                    Filtros avanzados
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {obj.projects.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((p: any) => {
                  const statusColors = {
                    active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
                    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
                    completed: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
                  };
                  const statusLabels = { active: "Activo", paused: "Pausado", completed: "Terminado" };

                  return (
                    <Card key={p.id} className="p-4" onClick={() => { setSelectedProjectId(p.id); setView("project"); }}>
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
                                if (e.key === 'Enter') {
                                  if (newProjectName.trim()) updateProj(p.id, { name: newProjectName.trim() });
                                  setEditingProjectName(null);
                                }
                                if (e.key === 'Escape') setEditingProjectName(null);
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
                          <div className="mt-1 text-xs text-slate-500">Creado: {new Date(p.createdAt).toLocaleDateString()}</div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.sessions.length} sesión(es)</div>
                          <div className="mt-2">
                            <select 
                              value={p.status || "active"} 
                              onChange={(e) => { e.stopPropagation(); updateProj(p.id, { status: e.target.value }); }}
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
                          <IconBtn title="Eliminar" onClick={(e) => { e?.stopPropagation(); delProj(p.id); }}><Trash2 className="w-4 h-4" /></IconBtn>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {view === "project" && obj && proj && (
            <div className="grid gap-4 mt-2">
              <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Objeto:</strong> {obj.id}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Lights:</strong> {ss.reduce((a: number, s: any) => a + (s.lights || 0), 0)}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Exposición:</strong> {hh(totalExposureSec(ss))}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Sesiones:</strong> {new Set(ss.map((s: any) => s.date)).size}</span>
              </div>

              <div className="hidden md:grid grid-cols-2 lg:grid-cols-7 gap-3 md:gap-4">
                <Card className="p-4"><div className="text-sm text-slate-500">Objeto</div><div className="text-xl font-semibold">{obj.id}</div><div className="text-sm text-slate-500">{obj.commonName}</div></Card>
                <Card className="p-4"><div className="text-sm text-slate-500">Lights acumulados</div><div className="text-xl font-semibold">{ss.reduce((a: number, s: any) => a + (s.lights || 0), 0)}</div></Card>
                <Card className="p-4"><div className="text-sm text-slate-500">Exposición total</div><div className="text-xl font-semibold">{hh(totalExposureSec(ss))}</div></Card>
                {(() => {
                  // Calcular horas totales por cada filtro
                  const filterHours: Record<string, number> = {};
                  tabs.forEach(tab => {
                    const tabSessions = filt(tab);
                    const totalSeconds = tabSessions.reduce((acc: number, s: any) => acc + (s.lights || 0) * (s.exposureSec || 0), 0);
                    if (totalSeconds > 0) {
                      filterHours[tab.name] = totalSeconds;
                    }
                  });
                  
                  // Ordenar filtros por horas (descendente) y mostrar todos los que tienen horas
                  const sortedFilters = Object.entries(filterHours)
                    .sort(([, a], [, b]) => b - a);
                  
                  return sortedFilters.map(([filterName, seconds]) => (
                    <Card key={filterName} className="p-4">
                      <div className="text-sm text-slate-500">{filterName}</div>
                      <div className="text-xl font-semibold">{hh(seconds)}</div>
                    </Card>
                  ));
                })()}
                <Card className="p-4"><div className="text-sm text-slate-500">Sesiones</div><div className="text-xl font-semibold">{new Set(ss.map((s: any) => s.date)).size} noche(s)</div><div className="text-xs text-slate-500">Última: {ss.length ? ss[ss.length - 1].date : "–"}</div></Card>
                {(() => {
                  // Calcular tiempo activo del proyecto
                  const startDate = new Date((proj as any).startDate || proj.createdAt);
                  
                  // Si hay endDate definido, usarlo; si no, usar completedDate si está completado; si no, fecha actual
                  let endDate: Date;
                  if ((proj as any).endDate) {
                    endDate = new Date((proj as any).endDate);
                  } else if (proj.status === 'completed' && (proj as any).completedDate) {
                    endDate = new Date((proj as any).completedDate);
                  } else {
                    endDate = new Date();
                  }
                  
                  const diffMs = endDate.getTime() - startDate.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  
                  let displayTime = "";
                  if (diffDays < 30) {
                    displayTime = `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
                  } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    const remainingDays = diffDays % 30;
                    displayTime = remainingDays > 0 
                      ? `${months} mes${months !== 1 ? 'es' : ''}, ${remainingDays} día${remainingDays !== 1 ? 's' : ''}`
                      : `${months} mes${months !== 1 ? 'es' : ''}`;
                  } else {
                    const years = Math.floor(diffDays / 365);
                    const remainingDays = diffDays % 365;
                    const months = Math.floor(remainingDays / 30);
                    displayTime = months > 0
                      ? `${years} año${years !== 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`
                      : `${years} año${years !== 1 ? 's' : ''}`;
                  }
                  
                  return (
                    <Card className="p-4">
                      <div className="text-sm text-slate-500">Tiempo {proj.status === 'completed' || (proj as any).endDate ? 'total' : 'activo'}</div>
                      <div className="text-xl font-semibold">{displayTime}</div>
                      <div className="text-xs text-slate-500">
                        {proj.status === 'completed' || (proj as any).endDate ? 'Completado' : 'En curso'}
                      </div>
                    </Card>
                  );
                })()}
                {(() => {
                  // Telescopios utilizados
                  const telescopeCounts: Record<string, number> = {};
                  ss.forEach((s: any) => {
                    if (s.telescope) {
                      const seconds = (s.lights || 0) * (s.exposureSec || 0);
                      telescopeCounts[s.telescope] = (telescopeCounts[s.telescope] || 0) + seconds;
                    }
                  });
                  
                  const sortedTelescopes = Object.entries(telescopeCounts)
                    .sort(([, a], [, b]) => b - a);
                  
                  if (sortedTelescopes.length === 0) return null;
                  
                  return (
                    <Card className="p-4">
                      <div className="text-sm text-slate-500 mb-1">Telescopio usado</div>
                      <div className="space-y-1">
                        {sortedTelescopes.map(([telescope, seconds]) => (
                          <div key={telescope}>
                            <div className="text-sm font-semibold">{telescope}</div>
                            <div className="text-xs text-slate-500">{hh(seconds)}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}
                <Card className="p-4">
                  <div className="text-sm text-slate-500 mb-2">Estado</div>
                  {(() => {
                    const statusColors = {
                      active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40",
                      paused: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
                      completed: "bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/40"
                    };
                    const statusLabels = { active: "Activo", paused: "Pausado", completed: "Terminado" };
                    const status = proj.status || "active";
                    return (
                      <div className={`text-sm font-semibold px-3 py-2 rounded-lg border ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </div>
                    );
                  })()}
                </Card>
              </div>

              <SectionTitle title="Imagen final del proyecto" />
              <ImageCard title="Imagen final" keyName="finalProject" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <SectionTitle title="Paneles" />
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
              <Card className="p-3 md:p-4 mb-4">
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2">
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <SectionTitle icon={Database} title="Sesiones" />
                <div className="flex items-center gap-2">
                  <Btn onClick={() => setMSes(true)}><Plus className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Nueva sesión</span><span className="sm:hidden">Nueva</span></Btn>
                  <IconBtn title="Configuración del proyecto" onClick={() => setShowProjectSettings(true)}>
                    <Settings className="w-4 h-4" />
                  </IconBtn>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                {tabs.map((t) => (
                  <div key={t.id} className={`px-2 md:px-3 py-1.5 md:py-2 -mb-px border-b-2 text-sm md:text-base whitespace-nowrap ${active === t.id ? "border-slate-900 dark:border-slate-100 font-medium" : "border-transparent text-slate-500"}`}>
                    {editingTabId === t.id ? (
                      <input 
                        value={editingTabName} 
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onBlur={() => saveTabName(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTabName(t.id);
                          if (e.key === 'Escape') setEditingTabId(null);
                        }}
                        className="px-2 py-1 border rounded text-sm w-24"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button onClick={() => setActive(t.id)} className="flex items-center gap-2">
                        <span>{t.name}</span>
                        <button 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" 
                          onClick={(e) => { e.stopPropagation(); startEditTab(t); }}
                          title="Editar nombre"
                        >
                          <Pencil className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                        </button>
                        <button 
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" 
                          onClick={(e) => { e.stopPropagation(); rm(t.id); }} 
                          title="Eliminar filtro"
                        >
                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                        </button>
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setShow(true)} className="ml-auto text-sm underline">+ Personalizada</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <ImageCard title={`Imagen inicial ${act?.name || tabLabel}`} keyName={`initial${keyPrefix}`} />
                <ImageCard title={`Imagen final ${act?.name || tabLabel}`} keyName={`final${keyPrefix}`} />
              </div>

              <div className="overflow-x-auto -mx-3 md:mx-0">
                <Card className="p-2 md:p-4">
                  <table className="text-xs md:text-sm w-full">
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
                        <th className="p-2 md:p-3 whitespace-nowrap sticky right-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                    {filtered.map((s: any, i: number, a: any[]) => {
                      const m = mean(s);
                      const pm = a[i - 1] ? mean(a[i - 1]) : null;
                      const inc = Number.isFinite(m) && Number.isFinite(pm) ? +((m) - (pm)).toFixed(3) : 0;
                      const cumulativeLightsVal = a.slice(0, i + 1).reduce((acc, sess) => acc + (sess.lights || 0), 0);
                      const sessionTime = s.lights * s.exposureSec;
                      const cumulativeTime = a.slice(0, i + 1).reduce((acc, sess) => acc + (sess.lights || 0) * (sess.exposureSec || 0), 0);
                      
                      // Calcular fase lunar si no existe
                      const moonData = s.date ? calculateMoonPhase(s.date) : null;
                      const moonDisplay = moonData ? `${moonData.emoji} ${moonData.name} (${moonData.illumination}%)` : "–";
                      
                      return (
                        <tr key={s.id} className="border-b hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{i + 1}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.date}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{moonDisplay}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.filter ?? "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.camera || "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.exposureSec}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{s.lights}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{cumulativeLightsVal}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{hh(sessionTime)}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{hh(cumulativeTime)}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{Number.isFinite(m) ? m!.toFixed(2) : "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{Number.isFinite(s.snrR) ? s.snrR : "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{Number.isFinite(s.snrG) ? s.snrG : "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{Number.isFinite(s.snrB) ? s.snrB : "–"}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle">{i === 0 ? 0 : inc}</td>
                          <td className="p-2 md:p-3 whitespace-nowrap align-middle sticky right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                            <div className="inline-flex gap-1 md:gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="p-1 md:p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors relative" title="Comentarios">
                                    <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    {s.notes && s.notes.trim() !== "" && (
                                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                                    )}
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Comentarios de sesión</DialogTitle>
                                    <DialogDescription>
                                      Fecha: {s.date} - Filtro: {s.filter}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 min-h-[100px]">
                                    {s.notes || ""}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <IconBtn title="Editar" onClick={() => setEditSes(s)}><Pencil className="w-3 h-3 md:w-4 md:h-4" /></IconBtn>
                              <IconBtn title="Eliminar" onClick={() => deleteSession(s.id)}><Trash2 className="w-3 h-3 md:w-4 md:h-4" /></IconBtn>
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
                <ExposureChart sessions={filtered} />
                <SNRChart sessions={filtered} />
                <SNRRGBChart sessions={filtered} />
                <MoonIlluminationChart sessions={filtered} />
              </div>
            </div>
          )}
        </main>

        {(() => {
          let title = ""; let handler: (() => void) | null = null;
          if (view === "objects") { title = "Nuevo objeto"; handler = () => setMObj(true); }
          else if (view === "projects") { title = "Nuevo proyecto"; handler = () => setMProj(true); }
          else if (view === "project") { title = "Nueva sesión"; handler = () => setMSes(true); }
          return handler ? <FAB title={title} onClick={handler} /> : null;
        })()}

        <Modal open={mObj} onClose={() => setMObj(false)} title="Nuevo objeto">
          <FObject onSubmit={addObj} />
        </Modal>
        <Modal open={mProj} onClose={() => setMProj(false)} title="Nuevo proyecto">
          <FProject onSubmit={addProj} cameras={cameras} telescopes={telescopes} />
        </Modal>
        <Modal open={mSes} onClose={() => setMSes(false)} title="Nueva sesión" wide>
          <FSession onSubmit={addSes} availableFilters={availableFilters} cameras={cameras} telescopes={telescopes} projectEquipment={(proj as any)?.equipment} />
        </Modal>
        <Modal open={!!editSes} onClose={() => setEditSes(null)} title="Editar sesión" wide>
          {editSes && <FSession initial={editSes} onSubmit={(val) => { editSession(editSes.id, val); setEditSes(null); }} availableFilters={availableFilters} cameras={cameras} telescopes={telescopes} projectEquipment={(proj as any)?.equipment} />}
        </Modal>
        <Modal open={show} onClose={() => setShow(false)} title="Nueva pestaña">
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); createTab(); }}>
            <label className="grid gap-1">
              <Label>Nombre</Label>
              <input value={tabName} onChange={(e) => setTabName(e.target.value)} className={INPUT_CLS} placeholder="Luminancia, SHO..." />
            </label>
            <div className="flex items-center justify-between mt-2">
              <div />
              <div className="flex items-center gap-2">
                <Btn outline onClick={() => setShow(false)}>Cancelar</Btn>
                <Btn type="submit"><Plus className="w-4 h-4" /> Crear</Btn>
              </div>
            </div>
          </form>
        </Modal>
        
        <Modal open={showEditPanels} onClose={() => setShowEditPanels(false)} title="Editar cantidad de paneles">
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); updatePanelCount(editNumPanels); }}>
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
              <Btn outline onClick={() => setShowEditPanels(false)}>Cancelar</Btn>
              <Btn type="submit">Actualizar</Btn>
            </div>
          </form>
        </Modal>

        <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Configuración" wide>
          <div className="grid gap-6">
            {/* Nombre de usuario */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>Nombre de usuario</span>
              </div>
              <input 
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tu nombre"
                className={INPUT_CLS}
              />
            </div>

            {/* Tema por defecto */}
            <div className="grid gap-3">
              <Label>Tema de página by default</Label>
              <select 
                value={defaultTheme} 
                onChange={(e) => setDefaultTheme(e.target.value)} 
                className={INPUT_CLS}
              >
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
                <option value="astro">Astro</option>
              </select>
            </div>

            {/* Localización del archivo JSON */}
            <div className="grid gap-3">
              <Label>Localización del archivo JSON</Label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={jsonPath}
                  onChange={(e) => setJsonPath(e.target.value)}
                  placeholder="Selecciona un archivo JSON"
                  className={INPUT_CLS + " flex-1"}
                  readOnly
                />
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-800 transition-colors">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Buscar</span>
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
                        alert("JSON no válido"); 
                        e.target.value = ""; 
                        return;
                      } 
                      if (Array.isArray(json)) { 
                        setObjects(json);
                        try {
                          localStorage.setItem('astroTrackerData', JSON.stringify(json));
                        } catch (err) {
                          console.warn('No se pudo guardar en localStorage:', err);
                        }
                        setShowInitialFilePrompt(false);
                      } else { 
                        alert("Formato no válido"); 
                      }
                      e.target.value = ""; 
                    }}
                  />
                </label>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Selecciona el archivo JSON con tus datos. La aplicación lo cargará automáticamente al iniciar.
              </div>
            </div>

            {/* Equipo astronofotográfico */}
            <div className="grid gap-3">
              <Label>Equipo astronofotográfico</Label>
              
              {/* Cámaras */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">Cámaras</span>
                {cameras.map((camera, index) => (
                  <div key={index} className="flex gap-2">
                    <input 
                      type="text"
                      value={camera}
                      onChange={(e) => {
                        const newCameras = [...cameras];
                        newCameras[index] = e.target.value;
                        setCameras(newCameras);
                      }}
                      placeholder="Ej: ZWO ASI294MC Pro"
                      className={INPUT_CLS + " flex-1"}
                    />
                    {cameras.length > 1 && (
                      <IconBtn 
                        title="Eliminar" 
                        onClick={() => setCameras(cameras.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconBtn>
                    )}
                  </div>
                ))}
                <Btn outline onClick={() => setCameras([...cameras, ""])}>
                  <Plus className="w-4 h-4" /> Añadir cámara
                </Btn>
              </div>

              {/* Telescopios */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">Telescopios</span>
                {telescopes.map((telescope, index) => (
                  <div key={index} className="grid gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={telescope.name}
                        onChange={(e) => {
                          const newTelescopes = [...telescopes];
                          newTelescopes[index] = { ...newTelescopes[index], name: e.target.value };
                          setTelescopes(newTelescopes);
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
                  <Plus className="w-4 h-4" /> Añadir telescopio
                </Btn>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-2 mt-2">
              <Btn outline onClick={() => setShowSettings(false)}>Cancelar</Btn>
              <Btn onClick={saveSettings}>Guardar configuración</Btn>
            </div>
          </div>
        </Modal>
        
        {/* Modal de configuración del proyecto */}
        <Modal open={showProjectSettings} onClose={() => setShowProjectSettings(false)} title="Configuración del Proyecto">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nombre del proyecto</label>
              <input 
                type="text" 
                value={projectSettingsData.name || proj?.name || ""} 
                onChange={(e) => setProjectSettingsData({...projectSettingsData, name: e.target.value})}
                className={INPUT_CLS}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea 
                value={projectSettingsData.description || proj?.description || ""} 
                onChange={(e) => setProjectSettingsData({...projectSettingsData, description: e.target.value})}
                className={INPUT_CLS}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha de inicio</label>
              <input 
                type="date" 
                value={projectSettingsData.startDate ? projectSettingsData.startDate.split('T')[0] : (proj?.startDate ? new Date(proj.startDate).toISOString().split('T')[0] : "")} 
                onChange={(e) => setProjectSettingsData({...projectSettingsData, startDate: e.target.value ? new Date(e.target.value).toISOString() : ""})}
                className={INPUT_CLS}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha de fin del proyecto (opcional)</label>
              <input 
                type="date" 
                value={projectSettingsData.endDate !== undefined 
                  ? (projectSettingsData.endDate ? new Date(projectSettingsData.endDate).toISOString().split('T')[0] : "") 
                  : ((proj as any)?.endDate ? new Date((proj as any).endDate).toISOString().split('T')[0] : "")} 
                onChange={(e) => {
                  const newEndDate = e.target.value ? new Date(e.target.value).toISOString() : "";
                  setProjectSettingsData({...projectSettingsData, endDate: newEndDate});
                }}
                className={INPUT_CLS}
              />
              <p className="text-xs text-slate-500">Si defines una fecha de fin, el proyecto se marcará como "Terminado" y el tiempo del proyecto se calculará hasta esta fecha.</p>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Estado del proyecto</label>
              <select 
                value={projectSettingsData.status || proj?.status || "active"} 
                onChange={(e) => setProjectSettingsData({...projectSettingsData, status: e.target.value})}
                className={INPUT_CLS}
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Terminado</option>
              </select>
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-2">
              <Btn outline onClick={() => {
                setShowProjectSettings(false);
                setProjectSettingsData({});
              }}>Cancelar</Btn>
              <Btn onClick={() => {
                if (!proj) return;
                
                const updates: any = {
                  name: projectSettingsData.name || proj.name,
                  description: projectSettingsData.description !== undefined ? projectSettingsData.description : proj.description,
                  startDate: projectSettingsData.startDate || proj.startDate,
                  status: projectSettingsData.status || proj.status
                };
                
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
              }}>Guardar cambios</Btn>
            </div>
          </div>
        </Modal>
        
        {/* Modal inicial para cargar archivo JSON */}
        <Modal open={showInitialFilePrompt} onClose={() => setShowInitialFilePrompt(false)} title="Bienvenido a StarBoard">
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
                    alert("JSON no válido"); 
                    e.target.value = ""; 
                    return;
                  } 
                  if (Array.isArray(json)) { 
                    setObjects(json);
                    try {
                      localStorage.setItem('astroTrackerData', JSON.stringify(json));
                    } catch (err) {
                      console.warn('No se pudo guardar en localStorage:', err);
                    }
                    setShowInitialFilePrompt(false);
                    setJsonPath(f.name);
                  } else { 
                    alert("Formato no válido"); 
                  }
                  e.target.value = ""; 
                }}
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-sm text-slate-500">o</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <Btn onClick={() => { setShowInitialFilePrompt(false); setMObj(true); }}>
              <Plus className="w-4 h-4" /> Crear primer objeto
            </Btn>
          </div>
        </Modal>
      </div>
    </div>
  );
}