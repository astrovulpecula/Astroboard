import { CloudSun, Calendar, Telescope, BarChart3, Image as ImageIcon, Home, Settings, type LucideIcon } from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

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
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 z-50 w-60 flex-col border-r border-border bg-surface-base/95 backdrop-blur-sm"
      aria-label="Navegación principal"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/60">
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="AstroBoard"
          className="h-9 w-9"
        />
        <div className="font-display font-semibold tracking-tight text-base">
          AstroBoard
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
          Navegación
        </div>
        <ul className="space-y-0.5">
          {items.map(({ id, icon: Icon, label }) => {
            const active = mainSection === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setMainSection(id)}
                  className={[
                    "group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ease-out relative",
                    active
                      ? "bg-primary/12 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/60",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-primary-glow"
                    />
                  )}
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
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated/60 transition-colors duration-200"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">{labels.settings}</span>
          </button>
        )}
        <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/60">
          v1 · Desktop
        </div>
      </div>
    </aside>
  );
}