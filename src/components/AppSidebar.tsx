import { CloudSun, Calendar, Telescope, BarChart3, Image as ImageIcon, Home, Settings, type LucideIcon } from "lucide-react";

export type MainSection = "dashboard" | "pronostico" | "planificacion" | "objetos" | "estadisticas" | "galeria" | "configuracion";

interface AppSidebarProps {
  mainSection: MainSection;
  setMainSection: (s: MainSection) => void;
  theme: string;
  onOpenSettings?: () => void;
  labels: {
    dashboard: string;
    forecast: string;
    planning: string;
    objects: string;
    metrics: string;
    gallery: string;
    settings: string;
  };
}

type Item = { id: MainSection; icon: LucideIcon; label: string };

export function AppSidebar({ mainSection, setMainSection, theme, labels, onOpenSettings }: AppSidebarProps) {
  const items: Item[] = [
    { id: "dashboard", icon: Home, label: labels.dashboard },
    { id: "pronostico", icon: CloudSun, label: labels.forecast },
    { id: "planificacion", icon: Calendar, label: labels.planning },
    { id: "objetos", icon: Telescope, label: labels.objects },
    { id: "estadisticas", icon: BarChart3, label: labels.metrics },
    { id: "galeria", icon: ImageIcon, label: labels.gallery },
  ];

  return (
    <nav
      className="w-full pt-4 md:pt-5 pb-2"
      aria-label="Navegación principal"
    >
      <div className="max-w-7xl mx-auto px-3 md:px-4">
        <ul className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-border/60 bg-surface-card/60 backdrop-blur-md shadow-sm px-1.5 py-1">
          {items.map(({ id, icon: Icon, label }) => {
            const active = mainSection === id;
            return (
              <li key={id} className="shrink-0">
                <button
                  onClick={() => setMainSection(id)}
                  className={[
                    "group relative flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm transition-all duration-200 ease-out",
                    active
                      ? "bg-primary/15 text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "w-4 h-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    ].join(" ")}
                  />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
          {onOpenSettings && (
            <li className="ml-auto shrink-0">
              <button
                onClick={onOpenSettings}
                className={[
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm transition-colors",
                  mainSection === "configuracion"
                    ? "bg-primary/15 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="truncate hidden sm:inline">{labels.settings}</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}