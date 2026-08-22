import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { useButtonTheme } from "@/context/ButtonThemeContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { formatFCFA } from "@/lib/format";
import { useEtablissement, useParametres, useMonRole } from "@/hooks/use-hotel";
import { useSettings, ThemeType, RadiusType, WallpaperType, ModeType } from "../../context/ThemeContext";
import {
  Palette,
  Monitor,
  Layers,
  Sliders,
  Building2,
  Sparkles,
  Search,
  Users,
  Settings,
  Database,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Globe,
  Clock,
  Save,
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  TrendingUp,
  Home,
  Calendar,
  DollarSign,
  FileText,
  PieChart,
  BarChart3,
  Wifi,
  Coffee,
  Car,
  Dumbbell,
  Utensils,
  Key,
  Zap,
  HardDrive,
  Cloud,
  Moon,
  Sun,
  Monitor as MonitorIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Configuration de LE DAYA Guest House : coordonnées, montant de la taxe de séjour, rôles et personnalisation visuelle.",
      },
      { property: "og:title", content: "Paramètres — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Réglages administrateur et interface de l'établissement." },
    ],
  }),
  component: ParametresPage,
});

const ROLES = [
  { value: "admin", label: "Administrateur" },
  { value: "reception", label: "Réception" },
  { value: "comptable", label: "Comptable" },
];

const THEMES = [
  { id: "cyber-gold", name: "Cyber Gold", desc: "Luxe & Or", couleurs: ["#FFD700", "#1a1a1a", "#FFA500"] },
  { id: "neo-obsidian", name: "Neo Obsidian", desc: "Cyberpunk Néon", couleurs: ["#00FFFF", "#1a1a2e", "#FF00FF"] },
  { id: "emerald-luxury", name: "Emerald Luxury", desc: "Vert & Champagne", couleurs: ["#50C878", "#F7E7CE", "#2E8B57"] },
  { id: "arctic-minimalist", name: "Arctic Minimalist", desc: "Blanc & Argent", couleurs: ["#FFFFFF", "#C0C0C0", "#E8F4F8"] },
];

const WALLPAPERS: WallpaperType[] = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "solid",
];

function ParametresPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const { data: monRole } = useMonRole();
  const estAdmin = monRole?.estAdmin ?? false;

  const {
    theme,
    setTheme,
    mode,
    setMode,
    radius,
    setRadius,
    wallpaper,
    setWallpaper,
    customWallpaperUrl,
    setCustomWallpaperUrl,
    blurIntensity,
    setBlurIntensity,
    glowEnabled,
    setGlowEnabled,
    hotelInfo,
  } = useSettings();

  const { buttonTheme, setButtonTheme } = useButtonTheme();

  const radiusClasses: Record<RadiusType, string> = {
    sm: "rounded-sm",
    lg: "rounded-lg",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full",
  };

  const [etabForm, setEtabForm] = useState({
    nom: "",
    ville: "",
    telephone: "",
    email: "",
  });
  const [taxe, setTaxe] = useState("");
  const [prefixe, setPrefixe] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState<string>("tous");
  const [tabActif, setTabActif] = useState<string>("interface");

  const [paramsApp, setParamsApp] = useState({
    langue: "fr",
    devise: "FCFA",
    formatDate: "DD/MM/YYYY",
    formatHeure: "24h",
    fuseauHoraire: "Africa/Libreville",
    notificationsEmail: true,
    notificationsSMS: false,
    notificationsPush: true,
    sauvegardeAuto: true,
    frequenceSauvegarde: "quotidienne",
    cacheEnabled: true,
  });

  const [paramsEtab, setParamsEtab] = useState({
    heureCheckIn: "14:00",
    heureCheckOut: "11:00",
    heureOuvertureReception: "08:00",
    heureFermetureReception: "22:00",
    tvaTaux: "18",
    taxeSejourTaux: "1000",
    serviceEtageTaux: "10",
    wifi: true,
    parking: true,
    restaurant: true,
    spa: false,
    piscine: false,
    salleSport: false,
  });

  const [paramsPaiement, setParamsPaiement] = useState({
    mobileMoney: true,
    carteBancaire: true,
    virement: true,
    especes: true,
    acomptePourcentage: "30",
    delaiPaiementJours: "30",
  });

  const [paramsEmail, setParamsEmail] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    emailExpediteur: "",
    signatureEmail: "Cordialement,\nL'équipe LE DAYA Guest House",
  });

  useEffect(() => {
    if (etab) {
      setEtabForm({
        nom: etab.nom ?? "",
        ville: etab.ville ?? "",
        telephone: etab.telephone ?? "",
        email: etab.email ?? "",
      });
    }
  }, [etab]);

  useEffect(() => {
    if (params) {
      setTaxe(params["taxe_sejour_montant"] ?? "1000");
      setPrefixe(params["prefixe_facture"] ?? "FAC");
    }
  }, [params]);

  const { data: utilisateurs } = useQuery({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const [profils, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("nom_complet"),
        supabase.from("user_roles").select("*"),
      ]);
      if (profils.error) throw profils.error;
      if (roles.error) throw roles.error;
      return (profils.data ?? []).map((p) => ({
        ...p,
        role: roles.data?.find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const utilisateursFiltres = useMemo(() => {
    return (utilisateurs ?? []).filter((u) => {
      if (recherche) {
        const terme = recherche.toLowerCase();
        const nom = u.nom_complet?.toLowerCase() ?? "";
        const telephone = u.telephone?.toLowerCase() ?? "";
        if (!nom.includes(terme) && !telephone.includes(terme)) return false;
      }
      if (filtreRole !== "tous" && u.role !== filtreRole) return false;
      return true;
    });
  }, [utilisateurs, recherche, filtreRole]);

  const statsRoles = useMemo(() => {
    const roles = (utilisateurs ?? []).reduce((acc, u) => {
      const role = u.role ?? "aucun";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return roles;
  }, [utilisateurs]);

  const enregistrerEtab = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("etablissements")
        .update({
          nom: etabForm.nom,
          ville: etabForm.ville || null,
          telephone: etabForm.telephone || null,
          email: etabForm.email || null,
        })
        .eq("id", etab!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etablissement"] });
      toast.success("Établissement mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enregistrerParams = useMutation({
    mutationFn: async () => {
      const entries = [
        { cle: "taxe_sejour_montant", valeur: taxe },
        { cle: "prefixe_facture", valeur: prefixe },
      ];
      for (const e of entries) {
        const { error } = await supabase
          .from("parametres")
          .upsert(
            { etablissement_id: etab!.id, cle: e.cle, valeur: e.valeur },
            { onConflict: "etablissement_id,cle" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Paramètres enregistrés.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changerRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error: eDel } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (eDel) throw eDel;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as "admin" | "reception" | "comptable" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast.success("Rôle mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exporterParametres = () => {
    const data = {
      etablissement: etabForm,
      params: { taxe, prefixe },
      app: paramsApp,
      etab: paramsEtab,
      paiement: paramsPaiement,
      email: paramsEmail,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `parametres_${etab?.nom?.replace(/\\s+/g, "_") ?? "export"}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Paramètres exportés.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration de l'application"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exporterParametres}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Download className="size-4 mr-1.5" />
              Exporter
            </Button>
          </div>
        }
      />

      <Tabs value={tabActif} onValueChange={setTabActif} className="w-full">
        <TabsList className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-200/50 dark:border-slate-700/50 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="interface"
            className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5"
          >
            <Palette className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Interface</span>
            <span className="xs:hidden">UI</span>
          </TabsTrigger>
          <TabsTrigger
            value="etablissement"
            className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5"
          >
            <Building2 className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Établissement</span>
            <span className="xs:hidden">🏨</span>
          </TabsTrigger>
          <TabsTrigger
            value="technique"
            className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5"
          >
            <Settings className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Technique</span>
            <span className="xs:hidden">⚙️</span>
          </TabsTrigger>
          <TabsTrigger
            value="utilisateurs"
            className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5"
          >
            <Users className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Utilisateurs</span>
            <span className="xs:hidden">👤</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            ONGLET 1 : INTERFACE
        ============================================================ */}
        <TabsContent value="interface" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Thèmes */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <Palette className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Thème & Ambiance
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Sélectionnez l'identité visuelle globale
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as ThemeType)}
                      className={`p-4 text-left border-2 rounded-2xl transition-all ${
                        theme === t.id
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg scale-[1.02]"
                          : "border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 bg-white/50 dark:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        {t.couleurs.map((c, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {t.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Style des boutons */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Settings className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Style des boutons
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Apparence globale des boutons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "default", label: "Classique" },
                    { id: "glow", label: "Glow ✨" },
                    { id: "glass", label: "Verre 🪟" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setButtonTheme(t.id as "default" | "glow" | "glass")}
                      className={`py-3 px-2 text-center font-medium border-2 rounded-xl transition-all text-sm ${
                        buttonTheme === t.id
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-lg"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-200 dark:hover:border-red-800 bg-white/50 dark:bg-slate-800/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Aperçu
                  </p>
                  <div className="flex items-center gap-3">
                    <Button className="rounded-xl">Bouton exemple</Button>
                    <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-600/50">
                      Contour
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Le bouton “Bouton exemple” suit le style global. “Contour” reste fixe.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mode d'affichage */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Monitor className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Mode d'affichage
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Clair, Sombre ou Automatique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", label: "Clair ☀️", icon: Sun },
                    { id: "dark", label: "Sombre 🌙", icon: Moon },
                    { id: "auto", label: "Auto ⚡", icon: MonitorIcon },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as ModeType)}
                        className={`py-3 px-2 text-center font-medium border-2 rounded-xl transition-all text-sm ${
                          mode === m.id
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-lg"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-200 dark:hover:border-red-800 bg-white/50 dark:bg-slate-800/50"
                        }`}
                      >
                        <Icon className="size-4 mx-auto mb-1" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Le mode <span className="font-medium">Auto</span> bascule en mode sombre à partir de 18h00.
                </p>
              </CardContent>
            </Card>

            {/* Géométrie & Arrondis */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Layers className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Géométrie & Arrondis
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Rondeur des composants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "sm", label: "Subtil" },
                    { id: "lg", label: "Standard" },
                    { id: "2xl", label: "Moderne" },
                    { id: "3xl", label: "Futuriste" },
                    { id: "full", label: "Capsule" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRadius(r.id as RadiusType)}
                      className={`py-2 px-4 text-sm font-medium border-2 transition-all ${radiusClasses[r.id as RadiusType]} ${
                        radius === r.id
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-lg"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-200 dark:hover:border-red-800 bg-white/50 dark:bg-slate-800/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Effets visuels */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Sliders className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Effets visuels
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Flou et lueurs dynamiques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex justify-between mb-1">
                    <span>Flou d'arrière-plan</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{blurIntensity}px</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={blurIntensity}
                    onChange={(e) => setBlurIntensity(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Effets de lueur (Glow)</span>
                  <button
                    onClick={() => setGlowEnabled(!glowEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      glowEnabled ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <div
                      className={`bg-white dark:bg-slate-200 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        glowEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Arrière-plan / Wallpaper */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                    <Sparkles className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Arrière-plan
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Wallpaper et fond personnalisé
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {WALLPAPERS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWallpaper(w)}
                      className={`h-16 border-2 rounded-2xl transition-all ${
                        wallpaper === w
                          ? "border-red-500 ring-2 ring-red-500/20 shadow-lg"
                          : "border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 bg-white/50 dark:bg-slate-800/50"
                      }`}
                      style={{
                        background:
                          w === "solid"
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : `linear-gradient(135deg, ${
                                w === "gradient-1"
                                  ? "#667eea, #764ba2"
                                  : w === "gradient-2"
                                  ? "#f093fb, #f5576c"
                                  : w === "gradient-3"
                                  ? "#4facfe, #00f2fe"
                                  : w === "gradient-4"
                                  ? "#43e97b, #38f9d7"
                                  : "#fa709a, #fee140"
                              })`,
                      }}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-700 dark:text-slate-300">URL personnalisée</Label>
                  <Input
                    value={customWallpaperUrl}
                    onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================
            ONGLET 2 : ÉTABLISSEMENT
        ============================================================ */}
        <TabsContent value="etablissement" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Informations établissement */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Building2 className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Informations
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Coordonnées de l'établissement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 bg-white/50 dark:bg-slate-700/50 p-4">
                  <BrandLogo className="max-h-20" />
                  <div className="min-w-0 text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium text-slate-900 dark:text-white">Logo officiel</p>
                    <p className="italic">{SLOGAN}</p>
                  </div>
                </div>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enregistrerEtab.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Nom</Label>
                    <Input
                      value={etabForm.nom}
                      disabled={!estAdmin}
                      onChange={(e) => setEtabForm({ ...etabForm, nom: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Ville</Label>
                      <Input
                        value={etabForm.ville}
                        disabled={!estAdmin}
                        onChange={(e) => setEtabForm({ ...etabForm, ville: e.target.value })}
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Téléphone</Label>
                      <Input
                        value={etabForm.telephone}
                        disabled={!estAdmin}
                        onChange={(e) => setEtabForm({ ...etabForm, telephone: e.target.value })}
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                    <Input
                      type="email"
                      value={etabForm.email}
                      disabled={!estAdmin}
                      onChange={(e) => setEtabForm({ ...etabForm, email: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!estAdmin || enregistrerEtab.isPending}
                    className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
                  >
                    <Save className="size-4 mr-1.5" />
                    Enregistrer
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Horaires & Services */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Clock className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Horaires & Services
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Configuration des horaires et équipements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Check-in</Label>
                    <Input
                      type="time"
                      value={paramsEtab.heureCheckIn}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, heureCheckIn: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Check-out</Label>
                    <Input
                      type="time"
                      value={paramsEtab.heureCheckOut}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, heureCheckOut: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Ouverture réception</Label>
                    <Input
                      type="time"
                      value={paramsEtab.heureOuvertureReception}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, heureOuvertureReception: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Fermeture réception</Label>
                    <Input
                      type="time"
                      value={paramsEtab.heureFermetureReception}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, heureFermetureReception: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <Label className="mb-3 block text-slate-700 dark:text-slate-300">Équipements</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "wifi", label: "WiFi", icon: Wifi },
                      { key: "parking", label: "Parking", icon: Car },
                      { key: "restaurant", label: "Restaurant", icon: Utensils },
                      { key: "spa", label: "Spa", icon: Dumbbell },
                      { key: "piscine", label: "Piscine", icon: Coffee },
                      { key: "salleSport", label: "Salle de sport", icon: Dumbbell },
                    ].map((item) => {
                      const Icon = item.icon;
                      const key = item.key as keyof typeof paramsEtab;
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-3 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={paramsEtab[key] as boolean}
                            onChange={(e) =>
                              setParamsEtab({ ...paramsEtab, [key]: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                          />
                          <Icon className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarifs & Taxes */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <DollarSign className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Tarifs & Taxes
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Configuration des prix et taxes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Taux TVA (%)</Label>
                  <Input
                    type="number"
                    value={paramsEtab.tvaTaux}
                    onChange={(e) => setParamsEtab({ ...paramsEtab, tvaTaux: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Taxe de séjour (FCFA / nuitée)</Label>
                  <Input
                    type="number"
                    value={taxe}
                    disabled={!estAdmin}
                    onChange={(e) => setTaxe(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Service d'étage (%)</Label>
                  <Input
                    type="number"
                    value={paramsEtab.serviceEtageTaux}
                    onChange={(e) => setParamsEtab({ ...paramsEtab, serviceEtageTaux: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Préfixe facture</Label>
                  <Input
                    value={prefixe}
                    disabled={!estAdmin}
                    onChange={(e) => setPrefixe(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <Button
                  onClick={() => enregistrerParams.mutate()}
                  disabled={!estAdmin || enregistrerParams.isPending}
                  className="w-full bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl"
                >
                  <Save className="size-4 mr-1.5" />
                  Enregistrer les tarifs
                </Button>
              </CardContent>
            </Card>

            {/* Moyens de paiement */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <CreditCard className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Moyens de paiement
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Configuration des paiements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "mobileMoney", label: "Mobile Money" },
                    { key: "carteBancaire", label: "Carte bancaire" },
                    { key: "virement", label: "Virement" },
                    { key: "especes", label: "Espèces" },
                  ].map((item) => {
                    const key = item.key as keyof typeof paramsPaiement;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-3 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={paramsPaiement[key] as boolean}
                          onChange={(e) =>
                            setParamsPaiement({ ...paramsPaiement, [key]: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Acompte (%)</Label>
                  <Input
                    type="number"
                    value={paramsPaiement.acomptePourcentage}
                    onChange={(e) =>
                      setParamsPaiement({ ...paramsPaiement, acomptePourcentage: e.target.value })
                    }
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Délai de paiement (jours)</Label>
                  <Input
                    type="number"
                    value={paramsPaiement.delaiPaiementJours}
                    onChange={(e) =>
                      setParamsPaiement({ ...paramsPaiement, delaiPaiementJours: e.target.value })
                    }
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================
            ONGLET 3 : TECHNIQUE
        ============================================================ */}
        <TabsContent value="technique" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Application */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                    <Settings className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Application
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Paramètres généraux
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Langue</Label>
                    <Select
                      value={paramsApp.langue}
                      onValueChange={(v) => setParamsApp({ ...paramsApp, langue: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Devise</Label>
                    <Select
                      value={paramsApp.devise}
                      onValueChange={(v) => setParamsApp({ ...paramsApp, devise: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Format de date</Label>
                    <Select
                      value={paramsApp.formatDate}
                      onValueChange={(v) => setParamsApp({ ...paramsApp, formatDate: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Format de date</Label>
                    <Select
                      value={paramsApp.formatDate}
                      onValueChange={(v) => setParamsApp({ ...paramsApp, formatDate: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Format d'heure</Label>
                    <Select
                      value={paramsApp.formatHeure}
                      onValueChange={(v) => setParamsApp({ ...paramsApp, formatHeure: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24h</SelectItem>
                        <SelectItem value="12h">12h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Fuseau horaire</Label>
                  <Select
                    value={paramsApp.fuseauHoraire}
                    onValueChange={(v) => setParamsApp({ ...paramsApp, fuseauHoraire: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Libreville">Africa/Libreville</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <Bell className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Notifications
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Alertes et notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "notificationsEmail", label: "Email", icon: Mail },
                  { key: "notificationsSMS", label: "SMS", icon: Bell },
                  { key: "notificationsPush", label: "Push", icon: Bell },
                ].map((item) => {
                  const Icon = item.icon;
                  const key = item.key as keyof typeof paramsApp;
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.label}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={paramsApp[key] as boolean}
                        onChange={(e) => setParamsApp({ ...paramsApp, [key]: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                      />
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            {/* Sauvegarde & Performance */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Cloud className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Sauvegarde & Performance
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Backup et optimisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between p-3 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Sauvegarde automatique
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paramsApp.sauvegardeAuto}
                    onChange={(e) => setParamsApp({ ...paramsApp, sauvegardeAuto: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                  />
                </label>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Fréquence de sauvegarde</Label>
                  <Select
                    value={paramsApp.frequenceSauvegarde}
                    onValueChange={(v) => setParamsApp({ ...paramsApp, frequenceSauvegarde: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quotidienne">Quotidienne</SelectItem>
                      <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                      <SelectItem value="mensuelle">Mensuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center justify-between p-3 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Cache activé
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paramsApp.cacheEnabled}
                    onChange={(e) => setParamsApp({ ...paramsApp, cacheEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                  />
                </label>
              </CardContent>
            </Card>

            {/* Configuration Email */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                    <Mail className="size-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                    Configuration Email
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  SMTP et expéditeur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Host SMTP</Label>
                    <Input
                      value={paramsEmail.smtpHost}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, smtpHost: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Port SMTP</Label>
                    <Input
                      value={paramsEmail.smtpPort}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, smtpPort: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Utilisateur SMTP</Label>
                  <Input
                    value={paramsEmail.smtpUser}
                    onChange={(e) => setParamsEmail({ ...paramsEmail, smtpUser: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Mot de passe SMTP</Label>
                  <Input
                    type="password"
                    value={paramsEmail.smtpPassword}
                    onChange={(e) => setParamsEmail({ ...paramsEmail, smtpPassword: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Email d'expédition</Label>
                  <Input
                    type="email"
                    value={paramsEmail.emailExpediteur}
                    onChange={(e) => setParamsEmail({ ...paramsEmail, emailExpediteur: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Signature</Label>
                  <Input
                    value={paramsEmail.signatureEmail}
                    onChange={(e) => setParamsEmail({ ...paramsEmail, signatureEmail: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================
            ONGLET 4 : UTILISATEURS
        ============================================================ */}
        <TabsContent value="utilisateurs" className="space-y-6">
          {/* Statistiques */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <Users className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {utilisateurs?.length ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                  <Shield className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Admins
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsRoles.admin ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                  <Home className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Réception
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsRoles.reception ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                  <FileText className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Comptables
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsRoles.comptable ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recherche et filtres */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
                {recherche && (
                  <button
                    onClick={() => setRecherche("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "tous", label: "Tous" },
                  { value: "admin", label: "Admins" },
                  { value: "reception", label: "Réception" },
                  { value: "comptable", label: "Comptables" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFiltreRole(f.value)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      filtreRole === f.value
                        ? "bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent shadow-lg shadow-red-500/25"
                        : "bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:border-red-200 dark:hover:border-red-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tableau des utilisateurs */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="size-4 text-red-500" />
                Liste des utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                    <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                      Nom
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                      Téléphone
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                      Rôle
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilisateursFiltres.map((u) => (
                    <TableRow
                      key={u.id}
                      className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold shadow-md">
                            {u.nom_complet?.[0]?.toUpperCase() ?? "U"}
                          </div>
                          {u.nom_complet || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {u.telephone ?? "—"}
                      </TableCell>
                      <TableCell>
                        {estAdmin ? (
                          <Select
                            value={u.role ?? "reception"}
                            onValueChange={(v) =>
                              changerRole.mutate({ userId: u.id, role: v })
                            }
                          >
                            <SelectTrigger className="w-48 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {ROLES.find((r) => r.value === u.role)?.label ?? "Aucun"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {utilisateursFiltres.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-slate-400 dark:text-slate-500"
                      >
                        Aucun utilisateur trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}