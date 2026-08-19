import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { formatFCFA } from "@/lib/format";
import { useEtablissement, useParametres, useMonRole } from "@/hooks/use-hotel";
import { useSettings, ThemeType, RadiusType, WallpaperType, ModeType } from "../../context/ThemeContext";
import { 
  Palette, Monitor, Layers, Sliders, Building2, Sparkles, Search, Users, 
  Settings, Database, Bell, Shield, CreditCard, Mail, Globe, Clock, 
  Save, Upload, Download, RefreshCw, CheckCircle, AlertCircle, X,
  TrendingUp, Home, Calendar, DollarSign, FileText, PieChart, BarChart3,
  Wifi, Coffee, Car, Dumbbell, Utensils, Key, Zap, HardDrive, Cloud
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

  // Paramètres globaux de l'interface
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

  const radiusClasses: Record<RadiusType, string> = {
    sm: "rounded-sm",
    lg: "rounded-lg",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full",
  };

  // États pour les formulaires
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

  // Paramètres techniques de l'application
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

  // Paramètres techniques de l'établissement
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

  // Paramètres de paiement
  const [paramsPaiement, setParamsPaiement] = useState({
    mobileMoney: true,
    carteBancaire: true,
    virement: true,
    especes: true,
    acomptePourcentage: "30",
    delaiPaiementJours: "30",
  });

  // Paramètres email
  const [paramsEmail, setParamsEmail] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    emailExpediteur: "",
    signatureEmail: "Cordialement,\nL'équipe LE DAYA Guest House",
  });

  // Initialisation des données
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

  // Récupération des utilisateurs
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

  // Filtrage des utilisateurs
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

  // Statistiques des rôles
  const statsRoles = useMemo(() => {
    const roles = (utilisateurs ?? []).reduce((acc, u) => {
      const role = u.role ?? "aucun";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return roles;
  }, [utilisateurs]);

  // Mutations
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
    link.download = `parametres_${etab?.nom?.replace(/s+/g, "_") ?? "export"}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Paramètres exportés.");
  };

  function ParametresPage() {
  // tes hooks et tes états...

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Configuration de l'application"
      />

      {/* Bloc temporaire de test */}
      <div className="mb-6 rounded-2xl border bg-card/80 p-6 shadow-lg backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold">
          Test des boutons
        </h2>

        <div className="flex flex-wrap gap-4">
          <Button>
            Principal
          </Button>

          <Button variant="secondary">
            Secondaire
          </Button>

          <Button variant="outline">
            Contour
          </Button>

          <Button variant="ghost">
            Transparent
          </Button>

          <Button variant="destructive">
            Supprimer
          </Button>

          <Button variant="glow">
            Premium
          </Button>

          <Button variant="glass">
            Verre
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label="Rechercher"
          >
            <Search />
          </Button>
        </div>
      </div>
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exporterParametres}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          }
        />

        {/* ONGLETS DE NAVIGATION */}
        <Tabs value={tabActif} onValueChange={setTabActif} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="interface" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Interface</span>
            </TabsTrigger>
            <TabsTrigger value="etablissement" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Établissement</span>
            </TabsTrigger>
            <TabsTrigger value="technique" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Technique</span>
            </TabsTrigger>
            <TabsTrigger value="utilisateurs" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
          </TabsList>

          {/* ONGLET 1 : INTERFACE */}
          <TabsContent value="interface" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Thèmes */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-600" />
                    <CardTitle>Thème & Ambiance</CardTitle>
                  </div>
                  <CardDescription>Sélectionnez l'identité visuelle globale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as ThemeType)}
                        className={`p-4 text-left border-2 rounded-xl transition-all ${
                          theme === t.id 
                            ? "border-purple-500 bg-purple-100 shadow-lg scale-[1.02]" 
                            : "border-gray-200 hover:border-purple-300 bg-white/50"
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          {t.couleurs.map((c, i) => (
                            <div 
                              key={i} 
                              className="w-6 h-6 rounded-full border border-gray-300"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Mode d'affichage */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-blue-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <CardTitle>Mode d'affichage</CardTitle>
                  </div>
                  <CardDescription>Clair, Sombre ou Automatique</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light", label: "Clair ☀️" },
                      { id: "dark", label: "Sombre 🌙" },
                      { id: "auto", label: "Auto ⚡" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as ModeType)}
                        className={`py-3 px-2 text-center font-medium border-2 rounded-xl transition-all text-sm ${
                          mode === m.id 
                            ? "border-blue-500 bg-blue-100 text-blue-700 shadow-lg" 
                            : "border-gray-200 text-gray-600 hover:border-blue-300 bg-white/50"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Le mode *Auto* bascule en mode sombre à partir de 18h00.
                  </p>
                </CardContent>
              </Card>

              {/* Géométrie */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <CardTitle>Géométrie & Arrondis</CardTitle>
                  </div>
                  <CardDescription>Rondeur des composants</CardDescription>
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
                            ? "border-emerald-500 bg-emerald-100 text-emerald-700 shadow-lg" 
                            : "border-gray-200 text-gray-600 hover:border-emerald-300 bg-white/50"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Effets visuels */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-600" />
                    <CardTitle>Effets visuels</CardTitle>
                  </div>
                  <CardDescription>Flou et lueurs dynamiques</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 flex justify-between mb-1">
                      <span>Flou d'arrière-plan</span>
                      <span className="text-amber-600 font-bold">{blurIntensity}px</span>
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="32"
                      value={blurIntensity}
                      onChange={(e) => setBlurIntensity(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-medium text-gray-700">Effets de lueur (Glow)</span>
                    <button
                      onClick={() => setGlowEnabled(!glowEnabled)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                        glowEnabled ? "bg-amber-500" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          glowEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Wallpaper */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-pink-50 via-white to-rose-50 border-pink-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-600" />
                    <CardTitle>Arrière-plan</CardTitle>
                  </div>
                  <CardDescription>Wallpaper et fond personnalisé</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {WALLPAPERS.map((w) => (
                      <button
                        key={w}
                        onClick={() => setWallpaper(w)}
                        className={`h-16 border-2 rounded-lg transition-all ${
                          wallpaper === w
                            ? "border-pink-500 bg-pink-100 shadow-lg"
                            : "border-gray-200 hover:border-pink-300 bg-white/50"
                        }`}
                        style={{
                          background: w === "solid" 
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : `linear-gradient(135deg, ${w === "gradient-1" ? "#667eea, #764ba2" : w === "gradient-2" ? "#f093fb, #f5576c" : w === "gradient-3" ? "#4facfe, #00f2fe" : w === "gradient-4" ? "#43e97b, #38f9d7" : "#fa709a, #fee140"})`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">URL personnalisée</Label>
                    <Input
                      value={customWallpaperUrl}
                      onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                      placeholder="https://exemple.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ONGLET 2 : ÉTABLISSEMENT */}
          <TabsContent value="etablissement" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Informations établissement */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <CardTitle>Informations</CardTitle>
                  </div>
                  <CardDescription>Coordonnées de l'établissement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
                    <BrandLogo className="max-h-20" />
                    <div className="min-w-0 text-sm text-gray-600">
                      <p className="font-medium text-gray-900">Logo officiel</p>
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
                      <Label>Nom</Label>
                      <Input
                        value={etabForm.nom}
                        disabled={!estAdmin}
                        onChange={(e) => setEtabForm({ ...etabForm, nom: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input
                          value={etabForm.ville}
                          disabled={!estAdmin}
                          onChange={(e) => setEtabForm({ ...etabForm, ville: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input
                          value={etabForm.telephone}
                          disabled={!estAdmin}
                          onChange={(e) => setEtabForm({ ...etabForm, telephone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={etabForm.email}
                        disabled={!estAdmin}
                        onChange={(e) => setEtabForm({ ...etabForm, email: e.target.value })}
                      />
                    </div>
                    <Button type="submit" disabled={!estAdmin || enregistrerEtab.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Horaires & Services */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <CardTitle>Horaires & Services</CardTitle>
                  </div>
                  <CardDescription>Configuration des horaires et équipements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Check-in</Label>
                      <Input
                        type="time"
                        value={paramsEtab.heureCheckIn}
                        onChange={(e) => setParamsEtab({ ...paramsEtab, heureCheckIn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Check-out</Label>
                      <Input
                        type="time"
                        value={paramsEtab.heureCheckOut}
                        onChange={(e) => setParamsEtab({ ...paramsEtab, heureCheckOut: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ouverture réception</Label>
                      <Input
                        type="time"
                        value={paramsEtab.heureOuvertureReception}
                        onChange={(e) => setParamsEtab({ ...paramsEtab, heureOuvertureReception: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fermeture réception</Label>
                      <Input
                        type="time"
                        value={paramsEtab.heureFermetureReception}
                        onChange={(e) => setParamsEtab({ ...paramsEtab, heureFermetureReception: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Label className="mb-3 block">Équipements</Label>
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
                          <label key={key} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-white/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={paramsEtab[key] as boolean}
                              onChange={(e) => setParamsEtab({ ...paramsEtab, [key]: e.target.checked })}
                              className="w-4 h-4 accent-emerald-500"
                            />
                            <Icon className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarifs & Taxes */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <CardTitle>Tarifs & Taxes</CardTitle>
                  </div>
                  <CardDescription>Configuration des prix et taxes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Taux TVA (%)</Label>
                    <Input
                      type="number"
                      value={paramsEtab.tvaTaux}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, tvaTaux: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxe de séjour (FCFA / nuitée)</Label>
                    <Input
                      type="number"
                      value={taxe}
                      disabled={!estAdmin}
                      onChange={(e) => setTaxe(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service d'étage (%)</Label>
                    <Input
                      type="number"
                      value={paramsEtab.serviceEtageTaux}
                      onChange={(e) => setParamsEtab({ ...paramsEtab, serviceEtageTaux: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Préfixe facture</Label>
                    <Input
                      value={prefixe}
                      disabled={!estAdmin}
                      onChange={(e) => setPrefixe(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => enregistrerParams.mutate()}
                    disabled={!estAdmin || enregistrerParams.isPending}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer les tarifs
                  </Button>
                </CardContent>
              </Card>

              {/* Paiement */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <CardTitle>Moyens de paiement</CardTitle>
                  </div>
                  <CardDescription>Configuration des paiements</CardDescription>
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
                        <label key={key} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-white/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paramsPaiement[key] as boolean}
                            onChange={(e) => setParamsPaiement({ ...paramsPaiement, [key]: e.target.checked })}
                            className="w-4 h-4 accent-purple-500"
                          />
                          <span className="text-sm font-medium">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <Label>Acompte (%)</Label>
                    <Input
                      type="number"
                      value={paramsPaiement.acomptePourcentage}
                      onChange={(e) => setParamsPaiement({ ...paramsPaiement, acomptePourcentage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Délai de paiement (jours)</Label>
                    <Input
                      type="number"
                      value={paramsPaiement.delaiPaiementJours}
                      onChange={(e) => setParamsPaiement({ ...paramsPaiement, delaiPaiementJours: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ONGLET 3 : TECHNIQUE */}
          <TabsContent value="technique" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Application */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-cyan-50 via-white to-blue-50 border-cyan-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-600" />
                    <CardTitle>Application</CardTitle>
                  </div>
                  <CardDescription>Paramètres généraux</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <Select value={paramsApp.langue} onValueChange={(v) => setParamsApp({ ...paramsApp, langue: v })}>
                        <SelectTrigger>
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
                      <Label>Devise</Label>
                      <Select value={paramsApp.devise} onValueChange={(v) => setParamsApp({ ...paramsApp, devise: v })}>
                        <SelectTrigger>
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
                      <Label>Format de date</Label>
                      <Select value={paramsApp.formatDate} onValueChange={(v) => setParamsApp({ ...paramsApp, formatDate: v })}>
                        <SelectTrigger>
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
                      <Label>Format d'heure</Label>
                      <Select value={paramsApp.formatHeure} onValueChange={(v) => setParamsApp({ ...paramsApp, formatHeure: v })}>
                        <SelectTrigger>
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
                    <Label>Fuseau horaire</Label>
                    <Select value={paramsApp.fuseauHoraire} onValueChange={(v) => setParamsApp({ ...paramsApp, fuseauHoraire: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Libreville">Africa/Libreville</SelectItem>
                        <SelectItem value="Africa/Paris">Europe/Paris</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 via-white to-emerald-50 border-green-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-green-600" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <CardDescription>Alertes et notifications</CardDescription>
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
                      <label key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-white/50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={paramsApp[key] as boolean}
                          onChange={(e) => setParamsApp({ ...paramsApp, [key]: e.target.checked })}
                          className="w-4 h-4 accent-green-500"
                        />
                      </label>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Sauvegarde */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-indigo-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-indigo-600" />
                    <CardTitle>Sauvegarde & Performance</CardTitle>
                  </div>
                  <CardDescription>Backup et optimisation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-white/50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium">Sauvegarde automatique</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={paramsApp.sauvegardeAuto}
                      onChange={(e) => setParamsApp({ ...paramsApp, sauvegardeAuto: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500"
                    />
                  </label>
                  <div className="space-y-2">
                    <Label>Fréquence de sauvegarde</Label>
                    <Select value={paramsApp.frequenceSauvegarde} onValueChange={(v) => setParamsApp({ ...paramsApp, frequenceSauvegarde: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quotidienne">Quotidienne</SelectItem>
                        <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                        <SelectItem value="mensuelle">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-white/50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium">Cache activé</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={paramsApp.cacheEnabled}
                      onChange={(e) => setParamsApp({ ...paramsApp, cacheEnabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500"
                    />
                  </label>
                </CardContent>
              </Card>

              {/* Email */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-rose-50 via-white to-pink-50 border-rose-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-rose-600" />
                    <CardTitle>Configuration Email</CardTitle>
                  </div>
                  <CardDescription>SMTP et expéditeur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Host SMTP</Label>
                      <Input
                        value={paramsEmail.smtpHost}
                        onChange={(e) => setParamsEmail({ ...paramsEmail, smtpHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port SMTP</Label>
                      <Input
                        value={paramsEmail.smtpPort}
                        onChange={(e) => setParamsEmail({ ...paramsEmail, smtpPort: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Utilisateur SMTP</Label>
                    <Input
                      value={paramsEmail.smtpUser}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, smtpUser: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mot de passe SMTP</Label>
                    <Input
                      type="password"
                      value={paramsEmail.smtpPassword}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, smtpPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email d'expédition</Label>
                    <Input
                      type="email"
                      value={paramsEmail.emailExpediteur}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, emailExpediteur: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signature</Label>
                    <Input
                      value={paramsEmail.signatureEmail}
                      onChange={(e) => setParamsEmail({ ...paramsEmail, signatureEmail: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ONGLET 4 : UTILISATEURS */}
          <TabsContent value="utilisateurs" className="space-y-6">
            {/* Statistiques */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {utilisateurs?.length ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Admins</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">
                        {statsRoles.admin ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                      <Shield className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Réception</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {statsRoles.reception ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                      <Home className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-50 via-white to-amber-100 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Comptables</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {statsRoles.comptable ?? 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Recherche et filtres */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-gray-50 via-white to-gray-100 border-gray-200">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      value={recherche}
                      onChange={(e) => setRecherche(e.target.value)}
                      className="pl-9"
                    />
                    {recherche && (
                      <button
                        onClick={() => setRecherche("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filtreRole === "tous" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltreRole("tous")}
                    >
                      Tous
                    </Button>
                    <Button
                      variant={filtreRole === "admin" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltreRole("admin")}
                    >
                      Admins
                    </Button>
                    <Button
                      variant={filtreRole === "reception" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltreRole("reception")}
                    >
                      Réception
                    </Button>
                    <Button
                      variant={filtreRole === "comptable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltreRole("comptable")}
                    >
                      Comptables
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
{/* Tableau des utilisateurs */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white via-white to-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Liste des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Rôle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilisateursFiltres.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {u.nom_complet?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            {u.nom_complet || "—"}
                          </div>
                        </TableCell>
                        <TableCell>{u.telephone ?? "—"}</TableCell>
                        <TableCell>
                          {estAdmin ? (
                            <Select
                              value={u.role ?? "reception"}
                              onValueChange={(v) => changerRole.mutate({ userId: u.id, role: v })}
                            >
                              <SelectTrigger className="w-48">
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
                            <Badge variant="secondary">
                              {ROLES.find((r) => r.value === u.role)?.label ?? "Aucun"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {utilisateursFiltres.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                          Aucun utilisateur trouvé.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}