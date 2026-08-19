import { useState, type ReactNode, useEffect, useCallback } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarCheck,
  Wallet,
  ReceiptText,
  FileSpreadsheet,
  TrendingDown,
  Landmark,
  BarChart3,
  Settings,
  Bell, 
  Menu,
  LogOut,
  Sun, 
  Moon,
  Cloud, 
  CloudRain,
  CloudLightning,
  CloudFog,
  Search,
  Star,
  History,
  Maximize2,
  Minimize2,
  Command,
  X,
  ChevronRight,
  Home,
  FileText,
  Calculator,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  CreditCard,
  FolderOpen,
  MoreVertical,
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Save,
  Download,
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  MoonStar,
  Sunrise,
  Palette,
  Sparkles,
  Zap,
  Heart,
  Bookmark,
  Tag,
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Info,
  HelpCircle,
  MessageSquare,
  Video,
  Mic,
  Camera,
  Image,
  Music,
  Film,
  Tv,
  Radio,
  Newspaper,
  Book,
  BookOpen,
  GraduationCap,
  School,
  University,
  Library,
  Archive,
  Folder,
  File,
  FileText as FileTextIcon,
  FileSpreadsheet as FileSpreadsheetIcon,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileQuestion,
  FileCheck,
  FileX,
  FileMinus,
  FilePlus,
  FileEdit,
  FileSearch,
  FileLock,
  FileUnlock,
  FileWarning,
  FileAlert,
  FileAlertTriangle,
  FileAlertCircle,
  FileAlertOctagon,
  FileAlertHexagon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { cn } from "@/lib/utils";
import { useSettings, type ModeType } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Navigation avec icônes et couleurs
const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, couleur: "text-blue-500", section: "principal" },
  { to: "/chambres", label: "Chambres", icon: BedDouble, couleur: "text-purple-500", section: "principal" },
  { to: "/clients", label: "Clients", icon: Users, couleur: "text-green-500", section: "principal" },
  { to: "/reservations", label: "Réservations", icon: CalendarCheck, couleur: "text-orange-500", section: "principal" },
  { to: "/caisse", label: "Caisse", icon: Wallet, couleur: "text-amber-500", section: "finance" },
  { to: "/factures", label: "Facturation", icon: ReceiptText, couleur: "text-red-500", section: "finance" },
  { to: "/pcs", label: "Pièces de caisse", icon: FileSpreadsheet, couleur: "text-pink-500", section: "finance" },
  { to: "/depenses", label: "Dépenses", icon: TrendingDown, couleur: "text-rose-500", section: "finance" },
  { to: "/taxe-sejour", label: "Taxe de séjour", icon: Landmark, couleur: "text-indigo-500", section: "finance" },
  { to: "/rapports", label: "Rapports", icon: BarChart3, couleur: "text-cyan-500", section: "rapports" },
  { to: "/notifications", label: "Notifications", icon: Bell, couleur: "text-violet-500", section: "rapports" },
  { to: "/parametres", label: "Paramètres", icon: Settings, couleur: "text-gray-500", section: "systeme" },
] as const;

// Sections de navigation
const SECTIONS = [
  { id: "principal", label: "Principal", icon: Home },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "rapports", label: "Rapports", icon: PieChart },
  { id: "systeme", label: "Système", icon: Settings },
];

// Raccourcis clavier
const RACCOURCIS = [
  { touche: "Ctrl+K", action: "Recherche" },
  { touche: "Ctrl+B", action: "Toggle sidebar" },
  { touche: "Ctrl+H", action: "Accueil" },
  { touche: "Ctrl+N", action: "Notifications" },
  { touche: "Ctrl+P", action: "Paramètres" },
];

function NavContent({ onNavigate, favoris, toggleFavori }: { onNavigate?: () => void; favoris: string[]; toggleFavori: (to: string) => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const navigate = useNavigate();

  // Grouper par section
  const navParSection = SECTIONS.map((section) => ({
    ...section,
    items: NAV.filter((item) => item.section === section.id),
  }));

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground">
      {/* En-tête avec logo */}
      <div className="border-b border-sidebar-border/50 px-5 py-4 backdrop-blur-sm">
        <div className="rounded-xl bg-gradient-to-br from-white to-gray-50 p-3 shadow-lg">
          <BrandLogo className="mx-auto max-h-12" />
        </div>
        <p className="mt-2 text-center text-[10px] tracking-widest uppercase opacity-70">
          Hotel Manager
        </p>
        <p className="mt-1 truncate text-center text-[11px] opacity-60 italic">{SLOGAN}</p>
        <p className="mt-1 truncate text-center text-xs opacity-60">
          {etab?.nom ?? "…"} — {etab?.ville ?? ""}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Favoris */}
        {favoris.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider opacity-60">
              Favoris
            </p>
            <div className="space-y-1">
              {favoris.map((to) => {
                const item = NAV.find((n) => n.to === to);
                if (!item) return null;
                const active = pathname === item.to;
                const Icone = item.icon;
                return (
                  <div key={item.to} className="group flex items-center gap-2">
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        active
                          ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 font-medium text-sidebar-primary-foreground shadow-md"
                          : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icone className={`size-4 shrink-0 ${item.couleur}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100"
                      onClick={() => toggleFavori(item.to)}
                    >
                      <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="my-2 border-t border-sidebar-border/50" />
          </div>
        )}

        {/* Sections */}
        {navParSection.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="mb-4">
              <div className="mb-2 flex items-center gap-2 px-2">
                <SectionIcon className="size-3 opacity-60" />
                <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                  {section.label}
                </p>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  const estFavori = favoris.includes(item.to);
                  const Icone = item.icon;
                  return (
                    <div key={item.to} className="group flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.to}
                              onClick={onNavigate}
                              className={cn(
                                "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                active
                                  ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 font-medium text-sidebar-primary-foreground shadow-md"
                                  : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                              )}
                            >
                              <Icone className={`size-4 shrink-0 ${item.couleur}`} />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-6 transition-opacity",
                          estFavori ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={() => toggleFavori(item.to)}
                      >
                        <Star className={cn("size-3", estFavori ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Pied de page avec profil */}
      <div className="border-t border-sidebar-border/50 p-3 backdrop-blur-sm">
        <div className="px-2 pb-2 text-xs opacity-70">
          <p className="truncate">{role?.email ?? ""}</p>
          <p className="uppercase">{role?.roles?.join(", ") || "—"}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" /> Se déconnecter
        </Button>
      </div>
    </div>
  );
}

function iconMeteo(code: number) {
  if (code === 0) return { Icon: Sun, label: "Ensoleillé" };
  if ([1, 2, 3].includes(code)) return { Icon: Cloud, label: "Nuageux" };
  if ([45, 48].includes(code)) return { Icon: CloudFog, label: "Brumeux" };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return { Icon: CloudRain, label: "Pluvieux" };
  if ([95, 96, 99].includes(code)) return { Icon: CloudLightning, label: "Orageux" };
  return { Icon: Cloud, label: "Nuageux" };
}

function MeteoWidget() {
  const { data } = useQuery({
    queryKey: ["meteo-port-gentil"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-0.72&longitude=8.78&current_weather=true",
      );
      if (!res.ok) throw new Error("Erreur météo");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const courant = data?.current_weather;
  if (!courant) return null;

  const { Icon, label } = iconMeteo(courant.weathercode);

  return (
    <Link
      to="/meteo"
      title="Ouvrir la météo détaillée"
      aria-label="Ouvrir la météo détaillée"
      className="group hidden cursor-pointer items-center gap-1.5 rounded-full border bg-gradient-to-br from-card to-card/50 px-3 py-1 text-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:from-accent hover:to-accent/50 hover:text-accent-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex"
    >
      <Icon className="size-4 text-amber-500 transition-transform group-hover:scale-110" />
      <span className="font-medium">{Math.round(courant.temperature)}°C</span>
      <span className="hidden text-muted-foreground transition-colors group-hover:text-accent-foreground/80 md:inline">
        — {label}, Port-Gentil
      </span>
    </Link>
  );
}

// Recherche globale
function RechercheGlobale({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const resultats = useMemo(() => {
    if (!query) return [];
    return NAV.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="size-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module..."
            className="border-0 bg-transparent text-lg focus-visible:ring-0"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {resultats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun résultat trouvé
            </p>
          ) : (
            resultats.map((item) => {
              const Icone = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Icone className={`size-4 ${item.couleur}`} />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </Link>
              );
            })
          )}
        </div>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p>
            <kbd className="rounded bg-muted px-2 py-1">Ctrl+K</kbd> pour rechercher
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rechercheOpen, setRechercheOpen] = useState(false);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);
  const { data: role } = useMonRole();
  const { mode, setMode } = useSettings();

  // Charger les favoris depuis le localStorage
  useEffect(() => {
    const stored = localStorage.getItem("favoris");
    if (stored) setFavoris(JSON.parse(stored));
  }, []);

  // Sauvegarder les favoris
  const toggleFavori = useCallback((to: string) => {
    setFavoris((prev) => {
      const nouveaux = prev.includes(to)
        ? prev.filter((f) => f !== to)
        : [...prev, to];
      localStorage.setItem("favoris", JSON.stringify(nouveaux));
      return nouveaux;
    });
  }, []);

  // Charger les notifications non lues
  useEffect(() => {
    const chargerNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("lue", false);
      setNotificationsNonLues(data?.length ?? 0);
    };
    chargerNotifications();
    const interval = setInterval(chargerNotifications, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setRechercheOpen(true);
      }
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        navigate({ to: "/dashboard" });
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        navigate({ to: "/notifications" });
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        navigate({ to: "/parametres" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const toggleDark = () => {
    const modeMap: Record<ModeType, ModeType> = {
      light: "dark",
      dark: "light",
      auto: "dark",
    };
    setMode(modeMap[mode]);
  };

  const isDark =
    mode === "dark" ||
    (mode === "auto" && new Date().getHours() >= 18);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 lg:flex">
        {/* Sidebar desktop */}
        {sidebarOpen && (
          <aside className="no-print hidden w-64 shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen lg:shadow-xl">
            <NavContent onNavigate={() => {}} favoris={favoris} toggleFavori={toggleFavori} />
          </aside>
        )}

        {/* Sidebar mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 border-0 p-0 shadow-2xl">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <NavContent onNavigate={() => setOpen(false)} favoris={favoris} toggleFavori={toggleFavori} />
          </SheetContent>
        </Sheet>

        {/* Contenu principal */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 px-4 py-2 backdrop-blur-md shadow-sm">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpen(true)}
              className="lg:hidden"
            >
              <Menu className="size-5" />
            </Button>

            {/* Logo */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-white to-gray-50 p-1.5 shadow-md">
                <BrandLogo className="max-h-8" />
              </div>
              <span className="font-display truncate text-sm font-semibold">
                Hotel Manager
              </span>
            </div>

            {/* Date */}
            <span className="hidden text-sm text-muted-foreground sm:block">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            {/* Météo */}
            <MeteoWidget />

            {/* Toggle dark mode */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleDark}>
                  {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle dark mode</p>
              </TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link to="/notifications">
                    <Bell className="size-5" />
                    {notificationsNonLues > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 size-5 rounded-full p-0 text-xs"
                      >
                        {notificationsNonLues > 9 ? "9+" : notificationsNonLues}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{notificationsNonLues} notification{notificationsNonLues > 1 ? "s" : ""} non lue{notificationsNonLues > 1 ? "s" : ""}</p>
              </TooltipContent>
            </Tooltip>

            {/* Recherche */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRechercheOpen(true)}
                  className="hidden gap-2 sm:flex"
                >
                  <Search className="size-4" />
                  <span className="hidden lg:inline">Rechercher</span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl+K</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recherche globale (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>

            {/* Toggle sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:flex"
                >
                  {sidebarOpen ? (
                    <Minimize2 className="size-5" />
                  ) : (
                    <Maximize2 className="size-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sidebarOpen ? "Masquer" : "Afficher"} la sidebar</p>
              </TooltipContent>
            </Tooltip>

            {/* Profil utilisateur */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="hidden items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent sm:flex"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-semibold text-primary-foreground shadow-md">
                    {(role?.email?.[0] ?? "U").toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium">
                      {role?.email ?? "Utilisateur"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {role?.roles?.join(", ") || "—"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/mon-compte" className="flex items-center gap-2">
                    <Users className="size-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/parametres" className="flex items-center gap-2">
                    <Settings className="size-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/auth"
                    className="flex items-center gap-2 text-destructive"
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                  >
                    <LogOut className="size-4" />
                    Se déconnecter
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Contenu de la page */}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        {/* Recherche globale */}
        <RechercheGlobale open={rechercheOpen} onClose={() => setRechercheOpen(false)} />
      </div>
    </TooltipProvider>
  );
}

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
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}