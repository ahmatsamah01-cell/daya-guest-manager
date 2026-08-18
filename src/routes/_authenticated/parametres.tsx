import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Palette, Monitor, Layers, Sliders, Building2, Sparkles } from "lucide-react";

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

function ParametresPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const { data: monRole } = useMonRole();
  const estAdmin = monRole?.estAdmin ?? false;

  // Paramètres globaux de l'interface (Thème, Flou, Arrondis, etc.)
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

  const [etabForm, setEtabForm] = useState({
    nom: "",
    ville: "",
    telephone: "",
    email: "",
  });
  const [taxe, setTaxe] = useState("");
  const [prefixe, setPrefixe] = useState("");

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

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Configuration de l'établissement, des accès et de l'interface" />

      {/* SECTION 1 : PERSONNALISATION VISUELLE & FUTURISTE */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Thèmes & Identité */}
        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Thème & Ambiance visuelle</CardTitle>
            </div>
            <CardDescription>Sélectionnez l'identité visuelle globale de l'application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "cyber-gold", name: "Cyber Gold", desc: "Luxe & Or" },
                { id: "neo-obsidian", name: "Neo Obsidian", desc: "Cyberpunk Néon" },
                { id: "emerald-luxury", name: "Emerald Luxury", desc: "Vert & Champagne" },
                { id: "arctic-minimalist", name: "Arctic Minimalist", desc: "Blanc & Argent" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as ThemeType)}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    theme === t.id 
                      ? "border-primary bg-primary/10 shadow-md scale-[1.02]" 
                      : "border-border/60 hover:border-primary/50 bg-background/40"
                  }`}
                >
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mode d'affichage & Automatisation */}
        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <CardTitle>Mode d'affichage</CardTitle>
            </div>
            <CardDescription>Clair, Sombre ou Automatique (selon l'heure)</CardDescription>
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
                  className={`py-2 px-3 text-center font-medium border rounded-xl transition-all text-sm ${
                    mode === m.id 
                      ? "border-primary bg-primary/10 text-primary shadow-md" 
                      : "border-border/60 text-muted-foreground hover:text-foreground bg-background/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Le mode *Auto* bascule l'application en mode sombre à partir de 18h00.
            </p>
          </CardContent>
        </Card>

        {/* Géométrie & Arrondis */}
        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle>Géométrie & Arrondis globaux</CardTitle>
            </div>
            <CardDescription>Ajustez la rondeur de tous les composants de l'application</CardDescription>
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
                  className={`py-2 px-3 text-xs font-medium border transition-all ${radiusClasses[r.id as RadiusType]} ${
                    radius === r.id 
                      ? "border-primary bg-primary text-primary-foreground shadow-md" 
                      : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Effets & Immersion */}
        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <CardTitle>Effets visuels & Immersion</CardTitle>
            </div>
            <CardDescription>Intensité du flou et lueurs dynamiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground flex justify-between mb-1">
                <span>Flou d'arrière-plan (Glassmorphism)</span>
                <span className="text-primary font-bold">{blurIntensity}px</span>
              </label>
              <input
                type="range"
                min="4"
                max="32"
                value={blurIntensity}
                onChange={(e) => setBlurIntensity(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-foreground">Effets de lueur au survol (Glow)</span>
              <button
                onClick={() => setGlowEnabled(!glowEnabled)}
                className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                  glowEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
                    glowEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* SECTION 2 : CONFIGURATION ETABLISSEMENT & FACTURATION (EXISTANT CONSERVÉ) */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <CardTitle>Établissement</CardTitle>
            <CardDescription>Coordonnées et logo affichés sur les documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
              <BrandLogo className="max-h-20" />
              <div className="min-w-0 text-sm text-neutral-600">
                <p className="font-medium text-neutral-900">Logo officiel</p>
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
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
          <CardHeader>
            <CardTitle>Facturation & taxe</CardTitle>
            <CardDescription>
              Taxe actuelle : {formatFCFA(Number(taxe || 0))} par nuitée et par chambre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                enregistrerParams.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Montant de la taxe de séjour (FCFA / nuitée)</Label>
                <Input
                  type="number"
                  min="0"
                  value={taxe}
                  disabled={!estAdmin}
                  onChange={(e) => setTaxe(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Préfixe des numéros de facture</Label>
                <Input
                  value={prefixe}
                  disabled={!estAdmin}
                  onChange={(e) => setPrefixe(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!estAdmin || enregistrerParams.isPending}>
                Enregistrer
              </Button>
              {!estAdmin ? (
                <p className="text-xs text-muted-foreground">
                  Seul un administrateur peut modifier ces paramètres.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3 : UTILISATEURS & RÔLES */}
      <Card className={`mt-6 backdrop-blur-[${blurIntensity}px] bg-card/80 shadow-lg ${radiusClasses[radius]}`}>
        <CardHeader>
          <CardTitle>Utilisateurs & rôles</CardTitle>
          <CardDescription>Attribution des accès de l'équipe</CardDescription>
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
              {(utilisateurs ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nom_complet || "—"}</TableCell>
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
              {(utilisateurs ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Aucun utilisateur.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
