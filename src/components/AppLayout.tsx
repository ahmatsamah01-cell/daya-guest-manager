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
  AlertCircle,
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
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  PieChart,
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";
import {
  useSettings,
  type ModeType,
} from "@/context/ThemeContext";

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

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  couleur: string;
  section: "principal" | "finance" | "rapports" | "systeme";
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    couleur: "text-blue-500",
    section: "principal",
  },
  {
    to: "/chambres",
    label: "Chambres",
    icon: BedDouble,
    couleur: "text-purple-500",
    section: "principal",
  },
  {
    to: "/clients",
    label: "Clients",
    icon: Users,
    couleur: "text-green-500",
    section: "principal",
  },
  {
    to: "/reservations",
    label: "Réservations",
    icon: CalendarCheck,
    couleur: "text-orange-500",
    section: "principal",
  },
  {
    to: "/caisse",
    label: "Caisse",
    icon: Wallet,
    couleur: "text-amber-500",
    section: "finance",
  },
  {
    to: "/factures",
    label: "Facturation",
    icon: ReceiptText,
    couleur: "text-red-500",
    section: "finance",
  },
  {
    to: "/pcs",
    label: "Pièces de caisse",
    icon: FileSpreadsheet,
    couleur: "text-pink-500",
    section: "finance",
  },
  {
    to: "/depenses",
    label: "Dépenses",
    icon: TrendingDown,
    couleur: "text-rose-500",
    section: "finance",
  },
  {
    to: "/taxe-sejour",
    label: "Taxe de séjour",
    icon: Landmark,
    couleur: "text-indigo-500",
    section: "finance",
  },
  {
    to: "/rapports",
    label: "Rapports",
    icon: BarChart3,
    couleur: "text-cyan-500",
    section: "rapports",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    couleur: "text-violet-500",
    section: "rapports",
  },
  {
    to: "/parametres",
    label: "Paramètres",
    icon: Settings,
    couleur: "text-gray-500",
    section: "systeme",
  },
];

const SECTIONS = [
  { id: "principal", label: "Principal", icon: Home },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "rapports", label: "Rapports", icon: PieChart },
  { id: "systeme", label: "Système", icon: Settings },
] as const;

function NavContent({
  onNavigate,
  favoris,
  toggleFavori,
}: {
  onNavigate?: () => void;
  favoris: string[];
  toggleFavori: (to: string) => void;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const navigate = useNavigate();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();

  const navParSection = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        items: NAV.filter((item) => item.section === section.id),
      })),
    [],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground">
      <div className="border-b border-sidebar-border/50 px-5 py-4">
        <div className="rounded-xl bg-gradient-to-br from-white to-gray-50 p-3 shadow-lg">
          <BrandLogo className="mx-auto max-h-12" />
        </div>

        <p className="mt-2 text-center text-[10px] uppercase tracking-widest opacity-70">
          Hotel Manager
        </p>

        <p className="mt-1 truncate text-center text-[11px] italic opacity-60">
          {SLOGAN}
        </p>

        <p className="mt-1 truncate text-center text-xs opacity-60">
          {etab?.nom ?? "…"} — {etab?.ville ?? ""}
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {favoris.length > 0 && (
          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider opacity-60">
              Favoris
            </p>

            <div className="space-y-1">
              {favoris.map((to) => {
                const item = NAV.find((navItem) => navItem.to === to);
                if (!item) return null;

                const Icon = item.icon;
                const active = pathname === item.to;

                return (
                  <div key={item.to} className="group flex items-center gap-2">
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        active
                          ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-md"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", item.couleur)} />
                      <span className="truncate">{item.label}</span>
                    </Link>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => toggleFavori(item.to)}
                    >
                      <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {navParSection.map((section) => {
          const SectionIcon = section.icon;

          return (
            <div key={section.id}>
              <div className="mb-2 flex items-center gap-2 px-2">
                <SectionIcon className="size-3 opacity-60" />
                <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                  {section.label}
                </p>
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.to;
                  const estFavori = favoris.includes(item.to);

                  return (
                    <div
                      key={item.to}
                      className="group flex items-center gap-2"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to}
                            onClick={onNavigate}
                            className={cn(
                              "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                              active
                                ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-md"
                                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 shrink-0",
                                item.couleur,
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </TooltipTrigger>

                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-6 transition-opacity",
                          estFavori
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={() => toggleFavori(item.to)}
                      >
                        <Star
                          className={cn(
                            "size-3",
                            estFavori
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400",
                          )}
                        />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/50 p-3">
        <div className="px-2 pb-2 text-xs opacity-70">
          <p className="truncate">{role?.email ?? ""}</p>
          <p className="uppercase">{role?.roles?.join(", ") || "—"}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

function iconMeteo(code: number) {
  if (code === 0) {
    return { Icon: Sun, label: "Ensoleillé" };
  }

  if ([1, 2, 3].includes(code)) {
    return { Icon: Cloud, label: "Nuageux" };
  }

  if ([45, 48].includes(code)) {
    return { Icon: CloudFog, label: "Brumeux" };
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { Icon: CloudRain, label: "Pluvieux" };
  }

  if ([95, 96, 99].includes(code)) {
    return { Icon: CloudLightning, label: "Orageux" };
  }

  return { Icon: Cloud, label: "Nuageux" };
}

function MeteoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["meteo-port-gentil"],
    queryFn: async () => {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-0.72&longitude=8.78&current_weather=true",
      );

      if (!response.ok) {
        throw new Error("Erreur météo");
      }

      return response.json();
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || !data?.current_weather) {
    return null;
  }

  const courant = data.current_weather;
  const { Icon, label } = iconMeteo(courant.weathercode);

  return (
    <Link
      to="/meteo"
      title="Ouvrir la météo détaillée"
      aria-label="Ouvrir la météo détaillée"
      className="group hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-sm sm:flex"
    >
      <Icon className="size-4 text-amber-500 transition-transform group-hover:scale-110" />
      <span className="font-medium">
        {Math.round(courant.temperature)}°C
      </span>
      <span className="hidden text-muted-foreground md:inline">
        — {label}, Port-Gentil
      </span>
    </Link>
  );
}

function RechercheGlobale({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const resultats = useMemo(() => {
    const terme = query.trim().toLowerCase();

    if (!terme) {
      return NAV;
    }

    return NAV.filter((item) =>
      item.label.toLowerCase().includes(terme),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="size-5 text-muted-foreground" />

          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un module..."
            className="border-0 bg-transparent text-lg focus-visible:ring-0"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Icon className={cn("size-4", item.couleur)} />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </Link>
              );
            })
          )}
        </div>

        <div className="border-t p-3 text-xs text-muted-foreground">
          Appuyez sur <kbd className="rounded bg-muted px-2 py-1">Échap</kbd>{" "}
          pour fermer.
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rechercheOpen, setRechercheOpen] = useState(false);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [notificationsNonLues, setNotificationsNonLues] = useState(0);

  const { data: role } = useMonRole();
  const { mode, setMode } = useSettings();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotel-favoris");

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setFavoris(parsed);
        }
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

    if (!error) {
      setNotificationsNonLues(count ?? 0);
    }
  }, []);

  useEffect(() => {
    void chargerNotifications();

    const interval = window.setInterval(() => {
      void chargerNotifications();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [chargerNotifications]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const touche = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && touche === "k") {
        event.preventDefault();
        setRechercheOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && touche === "b") {
        event.preventDefault();
        setSidebarOpen((previous) => !previous);
      }

      if ((event.ctrlKey || event.metaKey) && touche === "h") {
        event.preventDefault();
        navigate({ to: "/dashboard" });
      }

      if ((event.ctrlKey || event.metaKey) && touche === "n") {
        event.preventDefault();
        navigate({ to: "/notifications" });
      }

      if ((event.ctrlKey || event.metaKey) && touche === "p") {
        event.preventDefault();
        navigate({ to: "/parametres" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 lg:flex">
        {sidebarOpen && (
          <aside className="no-print hidden w-64 shrink-0 shadow-xl lg:sticky lg:top-0 lg:block lg:h-screen">
            <NavContent
              favoris={favoris}
              toggleFavori={toggleFavori}
            />
          </aside>
        )}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="w-72 border-0 p-0 shadow-2xl"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>

            <NavContent
              onNavigate={() => setOpen(false)}
              favoris={favoris}
              toggleFavori={toggleFavori}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b bg-card/80 px-4 py-2 shadow-sm backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setOpen(true)}
              className="lg:hidden"
            >
              <Menu className="size-5" />
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <div className="rounded-lg bg-white p-1.5 shadow-md">
                <BrandLogo className="max-h-8" />
              </div>

              <span className="truncate text-sm font-semibold">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleDark}
                >
                  {isDark ? (
                    <Sun className="size-5" />
                  ) : (
                    <Moon className="size-5" />
                  )}
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                Changer le mode d’affichage
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative"
                  asChild
                >
                  <Link to="/notifications">
                    <Bell className="size-5" />

                    {notificationsNonLues > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
                      >
                        {notificationsNonLues > 9
                          ? "9+"
                          : notificationsNonLues}
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
                  className="hidden gap-2 sm:flex"
                >
                  <Search className="size-4" />
                  <span className="hidden lg:inline">Rechercher</span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    Ctrl+K
                  </kbd>
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                Recherche globale
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen((previous) => !previous)}
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
                {sidebarOpen ? "Masquer" : "Afficher"} la navigation
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="hidden items-center gap-2 rounded-lg px-2 py-1 sm:flex"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {(role?.email?.[0] ?? "U").toUpperCase()}
                  </div>

                  <div className="hidden text-left lg:block">
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
                  <Link to="/mon-compte">Mon profil</Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/parametres">Paramètres</Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <RechercheGlobale
          open={rechercheOpen}
          onClose={() => setRechercheOpen(false)}
        />
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
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>

        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}