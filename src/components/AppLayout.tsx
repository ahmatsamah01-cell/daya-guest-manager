import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import {
  BarChart3,
  BedDouble,
  Bell,
  CalendarCheck,
  ChevronRight,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  DollarSign,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Settings,
  Star,
  Sun,
  TrendingDown,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════════
// COULEURS DE LA SIDEBAR - DESIGN "THE DAYA" (blanc/crème)
// ═══════════════════════════════════════════════════════════
const SIDEBAR_BG = "bg-white/95 backdrop-blur-3xl dark:bg-slate-800/95 dark:backdrop-blur-3xl";
const SIDEBAR_TEXT = "text-slate-800 dark:text-slate-200";
const SIDEBAR_BORDER = "border-slate-200/60 dark:border-slate-700/50";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/chambres", label: "Chambres", icon: BedDouble },
  { to: "/reservations", label: "Réservations", icon: CalendarCheck },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/caisse", label: "Caisse", icon: Wallet },
  { to: "/factures", label: "Facturation", icon: ReceiptText },
  { to: "/pcs", label: "Pièces de caisse", icon: FileSpreadsheet },
  { to: "/depenses", label: "Dépenses", icon: TrendingDown },
  { to: "/taxe-sejour", label: "Taxe de séjour", icon: Landmark },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

// ═══════════════════════════════════════════════════════════
// MÉTÉO - COMPACTE POUR MOBILE
// ═══════════════════════════════════════════════════════════
function iconMeteo(code: number) {
  if (code === 0) return { Icon: Sun, label: "Ensoleillé" };
  if ([1, 2, 3].includes(code)) return { Icon: Cloud, label: "Nuageux" };
  if ([45, 48].includes(code)) return { Icon: CloudFog, label: "Brumeux" };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return { Icon: CloudRain, label: "Pluvieux" };
  if ([95, 96, 99].includes(code))
    return { Icon: CloudLightning, label: "Orageux" };
  return { Icon: Cloud, label: "Nuageux" };
}

function MeteoWidget({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["meteo-port-gentil"],
    queryFn: async () => {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-0.72&longitude=8.78&current_weather=true",
      );
      if (!response.ok) throw new Error("Erreur météo");
      return response.json();
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || !data?.current_weather) return null;

  const courant = data.current_weather;
  const { Icon, label } = iconMeteo(courant.weathercode);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
        <Icon className="size-4 text-amber-500" />
        <span className="font-medium">{Math.round(courant.temperature)}°C</span>
      </div>
    );
  }

  return (
    <Link
      to="/meteo"
      title="Ouvrir la météo détaillée"
      aria-label="Ouvrir la météo détaillée"
      className="group hidden items-center gap-1.5 rounded-full border bg-card/60 dark:bg-slate-800/60 backdrop-blur-sm px-3 py-1 text-xs transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-sm sm:flex"
    >
      <Icon className="size-4 text-amber-500 transition-transform group-hover:scale-110" />
      <span className="font-medium">{Math.round(courant.temperature)}°C</span>
      <span className="hidden text-muted-foreground md:inline">
        — {label}, Port-Gentil
      </span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTENU DE LA SIDEBAR - STYLE "THE DAYA"
// ═══════════════════════════════════════════════════════════
function SidebarContent({
  onNavigate,
  onClose,
  favoris,
  toggleFavori,
  mobile = false,
  animate = false,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
  favoris: string[];
  toggleFavori: (to: string) => void;
  mobile?: boolean;
  animate?: boolean;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const navigate = useNavigate();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col",
        SIDEBAR_BG,
        SIDEBAR_TEXT,
        mobile ? "rounded-r-[32px]" : "rounded-none",
      )}
    >
      {/* Ligne de reflet supérieure subtile */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none" />

      {/* ═══════════════════════════════════════ */}
      {/* EN-TÊTE "THE DAYA" AVEC LOGO OFFICIEL */}
      {/* ═══════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-4 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="h-10 w-10 rounded-2xl bg-white shadow-lg shadow-slate-200/50 dark:shadow-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
          <BrandLogo className="h-full w-full object-contain" />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Le DAYA Guest House </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-[0.1em] uppercase">Votre satisfaction notre priorité</span>
        </div>

        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BARRE MÉTÉO + PROFIL - MOBILE */}
      {/* ═══════════════════════════════════════ */}
      {mobile && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500/10 to-rose-600/10 text-red-500 dark:from-red-500/20 dark:to-rose-600/20 dark:text-red-400 font-semibold text-sm">
              {(role?.email?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Administrateur</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                Gestionnaire
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </p>
            </div>
          </div>
          <MeteoWidget compact />
        </div>
      )}

      {/* Slogan - version desktop */}
      {!mobile && (
        <p className="px-5 py-2 text-[11px] italic text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-slate-700/50">
          {SLOGAN} · {etab?.nom ?? "…"}
        </p>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* MENU DE NAVIGATION - AVEC SCROLL INDÉPENDANT */}
      {/* ═══════════════════════════════════════ */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 sidebar-scroll">
        <div className="space-y-1">
          {/* FAVORIS */}
          {favoris.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Favoris
              </p>

              {favoris.map((to) => {
                const item = NAV.find((navItem) => navItem.to === to);
                if (!item) return null;

                const Icon = item.icon;
                const active = pathname === item.to;

                return (
                  <div key={item.to} className="group flex items-center gap-1">
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-300",
                        active
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white hover:shadow-sm",
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>

                    <button
                      type="button"
                      className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => toggleFavori(item.to)}
                    >
                      <Star className="mx-auto size-3 fill-yellow-400 text-yellow-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* LISTE PRINCIPALE */}
          {NAV.map((item, index) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            const estFavori = favoris.includes(item.to);

            return (
              <div
                key={item.to}
                className={cn(
                  "group flex items-center gap-1",
                  animate && "opacity-0 animate-daya-item-in",
                )}
                style={
                  animate
                    ? { animationDelay: `${80 + index * 35}ms` }
                    : undefined
                }
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-300",
                        active
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white hover:shadow-sm",
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </TooltipTrigger>

                  <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  className={cn(
                    "size-6 shrink-0 transition-opacity",
                    estFavori ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={() => toggleFavori(item.to)}
                >
                  <Star
                    className={cn(
                      "mx-auto size-3",
                      estFavori ? "fill-yellow-400 text-yellow-400" : "text-slate-300 dark:text-slate-600",
                    )}
                  />
                </button>
              </div>
            );
          })}

          {/* SECTION "AUTRES" */}
          <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Autres
          </p>

          <Link
            to="/notifications"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-300",
              pathname === "/notifications"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white hover:shadow-sm",
            )}
          >
            <Bell className="size-[18px] shrink-0" />
            <span>Notifications</span>
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════ */}
      {/* PIED DE PAGE - PROFIL + DÉCONNEXION (FIXÉ EN BAS) */}
      {/* ═══════════════════════════════════════ */}
      <div className={cn(
        "border-t border-slate-200/60 dark:border-slate-700/50 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md flex-shrink-0",
        mobile && "rounded-b-r-[32px]"
      )}>
        {/* Profil - version desktop */}
        {!mobile && (
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500/10 to-rose-600/10 text-red-500 dark:from-red-500/20 dark:to-rose-600/20 dark:text-red-400 font-semibold text-sm">
              {(role?.email?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Administrateur</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                Gestionnaire
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </p>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          <span className="text-xs font-semibold">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RECHERCHE GLOBALE
// ═══════════════════════════════════════════════════════════
function RechercheGlobale({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const resultats = useMemo(() => {
    const terme = query.trim().toLowerCase();
    if (!terme) return NAV;
    return NAV.filter((item) => item.label.toLowerCase().includes(terme));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-20"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/50 p-4">
          <Search className="size-5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un module..."
            className="border-0 bg-transparent text-lg focus-visible:ring-0 dark:text-white"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="dark:hover:bg-slate-700/50">
            <X className="size-5" />
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {resultats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun résultat trouvé.
            </p>
          ) : (
            resultats.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent dark:hover:bg-slate-700/50"
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </Link>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-200/60 dark:border-slate-700/50 p-3 text-xs text-muted-foreground">
          Appuyez sur <kbd className="rounded bg-muted px-2 py-1">Échap</kbd> pour fermer.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [rechercheOpen, setRechercheOpen] = useState(false);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);

  const { data: role } = useMonRole();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotel-favoris");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavoris(parsed);
      }
    } catch {
      localStorage.removeItem("hotel-favoris");
    }
  }, []);

  const toggleFavori = useCallback((to: string) => {
    setFavoris((previous) => {
      const next = previous.includes(to)
        ? previous.filter((item) => item !== to)
        : [...previous, to];
      localStorage.setItem("hotel-favoris", JSON.stringify(next));
      return next;
    });
  }, []);

  const chargerNotifications = useCallback(async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("lue", false);
    if (!error) setNotificationsNonLues(count ?? 0);
  }, []);

  useEffect(() => {
    void chargerNotifications();
    const interval = window.setInterval(() => void chargerNotifications(), 30_000);
    return () => window.clearInterval(interval);
  }, [chargerNotifications]);

  // Bloque le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const touche = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && touche === "k") {
        event.preventDefault();
        setRechercheOpen(true);
      }
      if (event.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <TooltipProvider>
      <style>{`
        @keyframes daya-item-in {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-daya-item-in {
          animation: daya-item-in 0.35s ease-out forwards;
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 lg:flex">
        {/* SIDEBAR DESKTOP */}
        <aside className="no-print hidden w-[280px] shrink-0 shadow-[10px_0_30px_-15px_rgba(15,23,42,0.08)] lg:sticky lg:top-0 lg:block lg:h-screen">
          <SidebarContent favoris={favoris} toggleFavori={toggleFavori} />
        </aside>

        {/* SIDEBAR MOBILE - OVERLAY */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300 lg:hidden",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* SIDEBAR MOBILE */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent
            mobile
            animate={mobileOpen}
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
            favoris={favoris}
            toggleFavori={toggleFavori}
          />
        </div>

        {/* CONTENU PRINCIPAL */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col bg-background dark:bg-slate-900",
            mobileOpen ? "overflow-hidden" : "overflow-y-auto",
            "h-screen",
          )}
        >
          {/* HEADER */}
          <header className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/50 bg-card/80 dark:bg-slate-800/80 px-4 py-2 shadow-sm backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Menu className="size-5" />
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <div className="rounded-lg bg-white dark:bg-slate-700 p-1.5 shadow-md">
                <BrandLogo className="max-h-8" />
              </div>
              <span className="truncate text-sm font-semibold dark:text-white">
                Hotel Manager
              </span>
            </div>

            <span className="hidden text-sm text-muted-foreground sm:block">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            <MeteoWidget />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="relative rounded-xl dark:hover:bg-slate-700/50" asChild>
                  <Link to="/notifications">
                    <Bell className="size-5" />
                    {notificationsNonLues > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
                      >
                        {notificationsNonLues > 9 ? "9+" : notificationsNonLues}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {notificationsNonLues} notification
                {notificationsNonLues > 1 ? "s" : ""} non lue
                {notificationsNonLues > 1 ? "s" : ""}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRechercheOpen(true)}
                  className="hidden gap-2 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 sm:flex"
                >
                  <Search className="size-4" />
                  <span className="hidden lg:inline">Rechercher</span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl+K</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Recherche globale</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="hidden items-center gap-2 rounded-lg px-2 py-1 sm:flex dark:hover:bg-slate-700/50"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-sm font-semibold text-white shadow-md shadow-red-500/20">
                    {(role?.email?.[0] ?? "U").toUpperCase()}
                  </div>
                  <div className="hidden text-left lg:block">
                    <p className="text-sm font-medium dark:text-white">{role?.email ?? "Utilisateur"}</p>
                    <p className="text-xs text-muted-foreground">
                      {role?.roles?.join(", ") || "—"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200/60 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-xl">
                <DropdownMenuLabel className="dark:text-white">Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="dark:hover:bg-slate-700/50">
                  <Link to="/mon-compte">Mon profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="dark:hover:bg-slate-700/50">
                  <Link to="/parametres">Paramètres</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="text-destructive dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="mr-2 size-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 dark:bg-slate-900">
            {children}
          </main>
        </div>

        <RechercheGlobale open={rechercheOpen} onClose={() => setRechercheOpen(false)} />
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE HEADER
// ═══════════════════════════════════════════════════════════
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}