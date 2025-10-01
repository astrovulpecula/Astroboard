import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, FolderOpen, Telescope, Star, Upload, Download, Trash2, Moon, Sun, Calendar, ChevronLeft, Database, Pencil } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import astroTrackerLogo from "@/assets/astro-tracker-logo.png";

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const INPUT_CLS = "border rounded-xl px-3 py-2 bg-white/80 dark:bg-slate-900/60";
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

const sample = [{
  id: "M31", commonName: "Galaxia de Andrómeda", constellation: "Andrómeda", type: "Galaxia", createdAt: new Date().toISOString(), image: undefined,
  projects: [{
    id: uid("proj"), name: "Proyecto Trevinca", description: "Campaña principal RGB", createdAt: new Date().toISOString(), images: {},
    sessions: [
      { id: uid("ses"), date: toISODate("22/09/25"), lights: 48, exposureSec: 180, filter: "RGB", snrR: 49.54, snrG: 50.77, snrB: 48.36, notes: "Noche estable." },
      { id: uid("ses"), date: toISODate("23/09/25"), lights: 60, exposureSec: 180, filter: "RGB", snrR: 51.91, snrG: 53.46, snrB: 50.89, notes: "Ligera bruma." }
    ]
  }]
}];

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700/60">
    {children}
  </span>
);

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`rounded-2xl border shadow-sm ${className} ${onClick ? "cursor-pointer transition hover:shadow" : ""}`} 
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
    {Icon && <Icon className="w-5 h-5" />}
    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
  </div>
);

const Btn = ({ children, onClick, outline, type = "button" }: { children: React.ReactNode; onClick?: () => void; outline?: boolean; type?: "button" | "submit" | "reset" }) => {
  const isAstro = typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'astro';
  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition ${
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

const IconBtn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <button title={title} onClick={onClick} className="p-2 rounded-xl border bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition">
    {children}
  </button>
);

const Modal = ({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"}`} onClick={(e) => e.stopPropagation()}>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">{title}</h3>
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
  
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); const x = id.trim(); if (!x) return; onSubmit({ id: x, commonName, constellation, type }); }}>
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
      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn outline onClick={() => { setId(""); setCommonName(""); setConstellation(""); setType(""); }}>Limpiar</Btn>
        <Btn type="submit"><Plus className="w-4 h-4" /> Crear objeto</Btn>
      </div>
    </form>
  );
}

function FProject({ onSubmit }: { onSubmit: (proj: any) => void }) {
  const [name, setName] = useState("Proyecto Trevinca");
  const [description, setDescription] = useState("Campaña principal");
  
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ name, description }); }}>
      <label className="grid gap-1"><Label>Nombre del proyecto</Label><input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} /></label>
      <label className="grid gap-1"><Label>Descripción</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLS} rows={3} /></label>
      <div className="flex items-center justify-end gap-2 mt-2">
        <Btn type="submit"><Plus className="w-4 h-4" /> Crear proyecto</Btn>
      </div>
    </form>
  );
}

function FSession({ onSubmit, initial, availableFilters }: { onSubmit: (session: any) => void; initial?: any; availableFilters: string[] }) {
  const init = initial || {};
  const [date, setDate] = useState(init.date || new Date().toISOString().slice(0, 10));
  const [lights, setLights] = useState(init.lights ?? 60);
  const [exposureSec, setExposureSec] = useState(init.exposureSec ?? 180);
  const [filter, setFilter] = useState(init.filter || (availableFilters[0] || "RGB"));
  const [snrR, setSnrR] = useState(init.snrR ?? "");
  const [snrG, setSnrG] = useState(init.snrG ?? "");
  const [snrB, setSnrB] = useState(init.snrB ?? "");
  const [notes, setNotes] = useState(init.notes ?? "");
  
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ date, lights: num(lights), exposureSec: num(exposureSec, 1), filter, snrR: snrR !== "" ? parseFloat(snrR) : undefined, snrG: snrG !== "" ? parseFloat(snrG) : undefined, snrB: snrB !== "" ? parseFloat(snrB) : undefined, notes }); }}>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-3 gap-3">
        <label className="grid gap-1"><Label>SNR - R</Label><input value={snrR} onChange={(e) => setSnrR(e.target.value)} className={INPUT_CLS} /></label>
        <label className="grid gap-1"><Label>SNR - G</Label><input value={snrG} onChange={(e) => setSnrG(e.target.value)} className={INPUT_CLS} /></label>
        <label className="grid gap-1"><Label>SNR - B</Label><input value={snrB} onChange={(e) => setSnrB(e.target.value)} className={INPUT_CLS} /></label>
      </div>
      <label className="grid gap-1"><Label>Notas</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={INPUT_CLS} /></label>
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-slate-600 dark:text-slate-400">Tiempo total: <b>{hh(lights * exposureSec)}</b></div>
        <Btn type="submit"><Plus className="w-4 h-4" /> Guardar</Btn>
      </div>
    </form>
  );
}

const readDataURL = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

const SNRChart = ({ sessions }: { sessions: any[] }) => {
  const s = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  const data = useMemo(() => s.map((x, i, a) => ({ lightTotal: cumulativeLights(a, i), snr: mean(x) })), [s]);
  const first = useMemo(() => { const m = mean(s[0]); return Number.isFinite(m) ? m : 0; }, [s]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Star} title="SNR (media) vs acumulado de lights" />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="lightTotal" tickMargin={8} stroke="#94a3b8" />
          <YAxis tickMargin={8} domain={[Math.max(first - 1, 0), "dataMax"]} tickFormatter={(v) => typeof v === "number" ? v.toFixed(2) : v} stroke="#94a3b8" />
          <Tooltip formatter={(v) => typeof v === "number" ? v.toFixed(2) : v} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Line type="monotone" dataKey="snr" stroke="#3b82f6" strokeWidth={3} dot />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const SNRRGBChart = ({ sessions }: { sessions: any[] }) => {
  const s = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)), [sessions]);
  const data = useMemo(() => s.map((x, i, a) => ({ lightTotal: cumulativeLights(a, i), r: Number.isFinite(x.snrR) ? x.snrR : null, g: Number.isFinite(x.snrG) ? x.snrG : null, b: Number.isFinite(x.snrB) ? x.snrB : null })), [s]);
  const firstMin = useMemo(() => { const t = s[0], v = [t?.snrR, t?.snrG, t?.snrB].filter((x) => Number.isFinite(x)); return v.length ? Math.min(...v) : 0; }, [s]);
  if (!data.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Star} title="SNR por canal (R/G/B) vs acumulado de lights" />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="lightTotal" tickMargin={8} stroke="#94a3b8" />
          <YAxis tickMargin={8} domain={[Math.max(firstMin - 1, 0), "dataMax"]} stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Legend />
          <Line type="monotone" dataKey="r" name="SNR - R" stroke="#ef4444" strokeWidth={3} dot />
          <Line type="monotone" dataKey="g" name="SNR - G" stroke="#22c55e" strokeWidth={3} dot />
          <Line type="monotone" dataKey="b" name="SNR - B" stroke="#3b82f6" strokeWidth={3} dot />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const ExposureChart = ({ sessions }: { sessions: any[] }) => {
  const d = useMemo(() => sessions.slice().sort((a, b) => a.date.localeCompare(b.date)).map((s) => ({ date: s.date, horas: (s.lights * s.exposureSec) / 3600 })), [sessions]);
  if (!d.length) return null;
  return (
    <Card className="p-4 h-80">
      <SectionTitle icon={Calendar} title="Exposición por noche (horas)" />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="date" tickMargin={8} stroke="#94a3b8" />
          <YAxis tickMargin={8} stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
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
  const [theme, setTheme] = useState("light");
  
  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "astro";
      return "light";
    });
  };

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
    const np = { id: uid("proj"), ...base, createdAt: new Date().toISOString(), sessions: [], images: {} };
    setObjects(objects.map((o) => o.id === obj.id ? { ...o, projects: [...o.projects, np] } : o));
    setSelectedProjectId(np.id);
    setMProj(false);
    setView("project");
  }, [objects, obj]);

  const addSes = useCallback((base: any) => {
    if (!obj || !proj) return;
    const s = { ...base, id: uid("ses") };
    setObjects(objects.map((o) => o.id !== obj.id ? o : { ...o, projects: o.projects.map((p) => p.id === proj.id ? { ...p, sessions: [...p.sessions, s] } : p) }));
    setMSes(false);
  }, [objects, obj, proj]);

  const editSession = useCallback((sid: string, data: any) => {
    if (!obj || !proj) return;
    setObjects(objects.map((o) => o.id !== obj.id ? o : { ...o, projects: o.projects.map((p) => p.id !== proj.id ? p : { ...p, sessions: p.sessions.map((s) => s.id === sid ? { ...s, ...data } : s) }) }));
  }, [objects, obj, proj]);

  const deleteSession = useCallback((sid: string) => {
    if (!confirm("¿Eliminar sesión?")) return;
    if (!obj || !proj) return;
    setObjects(objects.map((o) => o.id !== obj.id ? o : { ...o, projects: o.projects.map((p) => p.id !== proj.id ? p : { ...p, sessions: p.sessions.filter((s) => s.id !== sid) }) }));
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

  const ss = useMemo(() => proj?.sessions.slice().sort((a: any, b: any) => a.date.localeCompare(b.date)) || [], [proj]);
  
  const [tabs, setTabs] = useState<TabType[]>([{ id: "rgb", name: "RGB", preset: "rgb" }, { id: "haoiii", name: "Ha/OIII", preset: "haoiii" }]);
  const [active, setActive] = useState("rgb");
  const [show, setShow] = useState(false);
  const [tabName, setTabName] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  
  const createTab = () => {
    const name = tabName.trim(); 
    if (!name) return;
    const t: TabType = { id: uid("tab"), name, custom: true, filters: [] };
    setTabs((p) => [...p, t]);
    setActive(t.id);
    setShow(false);
    setTabName("");
  };
  
  const rm = (id: string) => { 
    setTabs((p) => p.filter((t) => t.id !== id)); 
    if (active === id) setActive("rgb"); 
  };
  
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
  
  const availableFilters = useMemo(() => tabs.map(t => t.name), [tabs]);
  
  const filt = useCallback((t: TabType | undefined) => {
    const up = (x: string) => (x || "").toUpperCase();
    if (t?.preset === "rgb") return ss.filter((s: any) => up(s.filter) === "RGB");
    if (t?.preset === "haoiii") return ss.filter((s: any) => { const f = up(s.filter); return f.includes("HA") || f.includes("OIII"); });
    return ss;
  }, [ss]);
  
  const act = tabs.find((t) => t.id === active) || tabs[0];
  const filtered = filt(act);
  const tabLabel = act?.preset === "rgb" ? "RGB" : "HA/OIII";
  const keyPrefix = act?.preset === "rgb" ? "RGB" : "HAOIII";

  const ImageCard = ({ title, keyName }: { title: string; keyName: string }) => (
    <Card className="p-4">
      <SectionTitle title={title} />
      {proj?.images?.[keyName] ? (
        <div className="space-y-3">
          <img src={proj.images[keyName]} alt={title} className="w-full rounded-xl border" />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
              <Upload className="w-4 h-4" /> Reemplazar
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await readDataURL(f); upImgs({ [keyName]: url }); e.target.value = ""; }} />
            </label>
            <Btn outline onClick={() => upImgs({ [keyName]: undefined })}><Trash2 className="w-4 h-4" /> Quitar</Btn>
          </div>
        </div>
      ) : (
        <label className="grid place-items-center h-52 rounded-xl border border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
          <div className="text-center text-sm text-slate-500">
            <Upload className="w-5 h-5 mx-auto mb-1" />Subir {title.toLowerCase()}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await readDataURL(f); upImgs({ [keyName]: url }); e.target.value = ""; }} />
        </label>
      )}
    </Card>
  );

  return (
    <div className={theme === "dark" ? "dark" : ""} data-theme={theme}>
      <style>{`
        [data-theme="astro"] {
          --gradient-start: #ff6b9d;
          --gradient-mid: #c44569;
          --gradient-end: #6a0dad;
          --card-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(252, 182, 159, 0.3) 100%);
          --card-border: rgba(255, 107, 157, 0.3);
        }
        [data-theme="astro"] .astro-bg {
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 25%, #ff6b9d 50%, #c44569 75%, #6a0dad 100%);
        }
        [data-theme="astro"] [data-card] {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(252, 182, 159, 0.3) 100%);
          border-color: rgba(255, 107, 157, 0.3);
        }
        [data-theme="astro"] .astro-btn {
          background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
          color: white;
          border: none;
        }
        [data-theme="astro"] .astro-btn:hover {
          background: linear-gradient(135deg, #ff5a8c 0%, #b33558 100%);
        }
        [data-theme="astro"] .astro-text {
          background: linear-gradient(135deg, #ff6b9d 0%, #6a0dad 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        [data-theme="astro"] .astro-border {
          border-color: rgba(255, 107, 157, 0.4);
        }
        [data-theme="astro"] h1, 
        [data-theme="astro"] h2, 
        [data-theme="astro"] h3, 
        [data-theme="astro"] h4 {
          background: linear-gradient(135deg, #c44569 0%, #6a0dad 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        [data-theme="light"] {
          --card-bg: rgba(255, 255, 255, 0.7);
          --card-border: rgb(226 232 240);
        }
        [data-theme="light"].dark {
          --card-bg: rgba(15, 23, 42, 0.6);
          --card-border: rgb(30 41 59);
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
                <img src={astroTrackerLogo} alt="Astro Tracker" className="w-8 h-8" />
              </button>
              <div>
                <div className="font-semibold">Astrotracker · Dashboard</div>
                <div className="text-xs text-slate-500">{view === "objects" ? "Objetos" : view === "projects" ? "Proyectos" : "Detalle"}</div>
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
                <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const text = await f.text(); try { const json = JSON.parse(text); if (Array.isArray(json)) { setObjects(json); setView("objects"); setSelectedObjectId(null); setSelectedProjectId(null); } else alert("Formato no válido"); } catch { alert("JSON no válido"); } e.target.value = ""; }} />
              </label>
              <IconBtn title={theme === "light" ? "Cambiar a oscuro" : theme === "dark" ? "Cambiar a Astro" : "Cambiar a claro"} onClick={cycleTheme}>
                {theme === "light" ? <Moon className="w-4 h-4" /> : theme === "dark" ? <Star className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </IconBtn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {view === "objects" && (
            <div className="grid gap-4">
              {/* Image Carousel */}
              {(() => {
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
                
                if (allImages.length === 0) return null;
                
                return <ImageCarousel images={allImages} />;
              })()}

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
                
                return (
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
                          <div className="text-2xl font-bold">{totalHours.toFixed(1)}h / {totalLights}</div>
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
                          {o.image ? (
                            <>
                              <img src={o.image} alt={o.id} className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                <label className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition" onClick={(e) => e.stopPropagation()}>
                                  <Upload className="w-4 h-4" />
                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { e.stopPropagation(); const f = e.target.files?.[0]; if (!f) return; const url = await readDataURL(f); upObjImg(o.id, url); e.target.value = ""; }} />
                                </label>
                                <button className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition" onClick={(e) => { e.stopPropagation(); upObjImg(o.id, null); }}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition" onClick={(e) => e.stopPropagation()}>
                              <Upload className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-xs text-slate-500">Subir</span>
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { e.stopPropagation(); const f = e.target.files?.[0]; if (!f) return; const url = await readDataURL(f); upObjImg(o.id, url); e.target.value = ""; }} />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold">{o.id} <span className="text-slate-500 dark:text-slate-400">{o.commonName ? `· ${o.commonName}` : ""}</span></h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {obj.projects.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((p: any) => (
                  <Card key={p.id} className="p-4" onClick={() => { setSelectedProjectId(p.id); setView("project"); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold">{p.name}</h4>
                        <div className="mt-1 text-xs text-slate-500">Creado: {new Date(p.createdAt).toLocaleDateString()}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.sessions.length} sesión(es)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBtn title="Eliminar" onClick={() => delProj(p.id)}><Trash2 className="w-4 h-4" /></IconBtn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {view === "project" && obj && proj && (
            <div className="grid gap-4 mt-2">
              <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Objeto:</strong> {obj.id}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Exposición:</strong> {hh(totalExposureSec(ss))}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Lights:</strong> {ss.reduce((a: number, s: any) => a + (s.lights || 0), 0)}</span>
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/80 dark:bg-slate-900/60"><strong>Sesiones:</strong> {new Set(ss.map((s: any) => s.date)).size}</span>
              </div>

              <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4"><div className="text-sm text-slate-500">Objeto</div><div className="text-xl font-semibold">{obj.id}</div><div className="text-sm text-slate-500">{obj.commonName}</div></Card>
                <Card className="p-4"><div className="text-sm text-slate-500">Exposición total</div><div className="text-xl font-semibold">{hh(totalExposureSec(ss))}</div></Card>
                <Card className="p-4"><div className="text-sm text-slate-500">Lights acumulados</div><div className="text-xl font-semibold">{ss.reduce((a: number, s: any) => a + (s.lights || 0), 0)}</div></Card>
                <Card className="p-4"><div className="text-sm text-slate-500">Sesiones</div><div className="text-xl font-semibold">{new Set(ss.map((s: any) => s.date)).size} noche(s)</div><div className="text-xs text-slate-500">Última: {ss.length ? ss[ss.length - 1].date : "–"}</div></Card>
              </div>

              <SectionTitle title="Imágenes del proyecto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageCard title={`Imagen inicial ${tabLabel}`} keyName={`initial${keyPrefix}`} />
                <ImageCard title={`Imagen final ${tabLabel.replace("/", " ")}`} keyName={`final${keyPrefix}`} />
              </div>

              <div className="flex items-center justify-between">
                <SectionTitle icon={Database} title="Sesiones" />
                <div className="flex items-center gap-2">
                  <Btn onClick={() => setMSes(true)}><Plus className="w-4 h-4" /> Nueva sesión</Btn>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
                {tabs.map((t) => (
                  <div key={t.id} className={`px-3 py-2 -mb-px border-b-2 ${active === t.id ? "border-slate-900 dark:border-slate-100 font-medium" : "border-transparent text-slate-500"}`}>
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
                        <Pencil 
                          className="w-3 h-3 opacity-0 hover:opacity-100 transition-opacity" 
                          onClick={(e) => { e.stopPropagation(); startEditTab(t); }} 
                        />
                        {t.custom && <span onClick={(e) => { e.stopPropagation(); rm(t.id); }} className="text-slate-400 hover:text-red-500">×</span>}
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setShow(true)} className="ml-auto text-sm underline">+ Personalizada</button>
              </div>

              <Card className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-slate-50/50 dark:bg-slate-900/40">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Filtro</th>
                      <th className="p-3">Tiempo</th>
                      <th className="p-3">SNR (X̄)</th>
                      <th className="p-3 hidden md:table-cell">Lights</th>
                      <th className="p-3 hidden md:table-cell">Exposición (s)</th>
                      <th className="p-3 hidden md:table-cell">SNR - R</th>
                      <th className="p-3 hidden md:table-cell">SNR - G</th>
                      <th className="p-3 hidden md:table-cell">SNR - B</th>
                      <th className="p-3 hidden md:table-cell">Incremento</th>
                      <th className="p-3 text-right hidden md:table-cell">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any, i: number, a: any[]) => {
                      const m = mean(s);
                      const pm = a[i - 1] ? mean(a[i - 1]) : null;
                      const inc = Number.isFinite(m) && Number.isFinite(pm) ? +((m) - (pm)).toFixed(3) : 0;
                      return (
                        <tr key={s.id} className="border-b hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                          <td className="p-3">{s.date}</td>
                          <td className="p-3">{s.filter ?? "–"}</td>
                          <td className="p-3">{hh(s.lights * s.exposureSec)}</td>
                          <td className="p-3">{Number.isFinite(m) ? m!.toFixed(2) : "–"}</td>
                          <td className="p-3 hidden md:table-cell">{s.lights}</td>
                          <td className="p-3 hidden md:table-cell">{s.exposureSec}</td>
                          <td className="p-3 hidden md:table-cell">{Number.isFinite(s.snrR) ? s.snrR : "–"}</td>
                          <td className="p-3 hidden md:table-cell">{Number.isFinite(s.snrG) ? s.snrG : "–"}</td>
                          <td className="p-3 hidden md:table-cell">{Number.isFinite(s.snrB) ? s.snrB : "–"}</td>
                          <td className="p-3 hidden md:table-cell">{i === 0 ? 0 : inc}</td>
                          <td className="p-3 text-right hidden md:table-cell">
                            <div className="inline-flex gap-2">
                              <IconBtn title="Editar" onClick={() => setEditSes(s)}><Pencil className="w-4 h-4" /></IconBtn>
                              <IconBtn title="Eliminar" onClick={() => deleteSession(s.id)}><Trash2 className="w-4 h-4" /></IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ExposureChart sessions={filtered} />
                <SNRChart sessions={filtered} />
                <SNRRGBChart sessions={filtered} />
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
          <FProject onSubmit={addProj} />
        </Modal>
        <Modal open={mSes} onClose={() => setMSes(false)} title="Nueva sesión" wide>
          <FSession onSubmit={addSes} availableFilters={availableFilters} />
        </Modal>
        <Modal open={!!editSes} onClose={() => setEditSes(null)} title="Editar sesión" wide>
          {editSes && <FSession initial={editSes} onSubmit={(val) => { editSession(editSes.id, val); setEditSes(null); }} availableFilters={availableFilters} />}
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
      </div>
    </div>
  );
}