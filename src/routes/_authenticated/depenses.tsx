import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Wallet, FileText, Search, Filter, X, Download, Upload, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Suivi des dépenses de LE DAYA Guest House par catégorie : achats, énergie, salaires, entretien.",
      },
      { property: "og:title", content: "Dépenses — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Charges d'exploitation détaillées en FCFA." },
    ],
  }),
  component: DepensesPage,
});

const CATEGORIES_DEFAUT = [
  "Achats",
  "Énergie & eau",
  "Salaires",
  "Entretien",
  "Transport",
  "Taxes & impôts",
  "Divers",
];

const COULEURS_CATEGORIES = {
  "Achats": "#3b82f6",
  "Énergie & eau": "#f59e0b",
  "Salaires": "#10b981",
  "Entretien": "#8b5cf6",
  "Transport": "#ef4444",
  "Taxes & impôts": "#6b7280",
  "Divers": "#64748b",
};

function DepensesPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  
  // États pour les filtres
  const [recherche, setRecherche] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [modeFiltre, setModeFiltre] = useState<string>("tous");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);
  const [mois, setMois] = useState(today().slice(0, 7));
  
  // États pour les dialogs
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(CATEGORIES_DEFAUT);
  const [openCategorie, setOpenCategorie] = useState(false);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");

  const [form, setForm] = useState({
    date_depense: today(),
    categorie: "Achats",
    libelle: "",
    montant: "",
    mode_paiement: "especes",
    fournisseur: "",
    reporter_caisse: true,
    statut: "brouillon",
    piece_jointe: null as File | null,
  });

  const [editForm, setEditForm] = useState({
    date_depense: today(),
    categorie: "Achats",
    libelle: "",
    montant: "",
    mode_paiement: "especes",
    fournisseur: "",
    statut: "brouillon",
  });

  // Récupération des dépenses
  const { data: depenses, isLoading } = useQuery({
    queryKey: ["depenses", mois],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depenses")
        .select("*")
        .gte("date_depense", `${mois}-01`)
        .lte("date_depense", `${mois}-31`)
        .order("date_depense", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filtrage des dépenses
  const depensesFiltrees = (depenses ?? []).filter((d) => {
    // Filtre par recherche
    if (recherche) {
      const terme = recherche.toLowerCase();
      const correspondRecherche =
        d.libelle?.toLowerCase().includes(terme) ||
        d.fournisseur?.toLowerCase().includes(terme) ||
        d.categorie?.toLowerCase().includes(terme);
      if (!correspondRecherche) return false;
    }

    // Filtre par catégorie
    if (categorieFiltre !== "toutes" && d.categorie !== categorieFiltre) {
      return false;
    }

    // Filtre par mode de paiement
    if (modeFiltre !== "tous" && d.mode_paiement !== modeFiltre) {
      return false;
    }

    // Filtre par période
    const dateDepense = new Date(d.date_depense);
    const maintenant = new Date();
    
    if (periodeFiltre === "aujourd'hui") {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      if (dateDepense < aujourdhui) return false;
    } else if (periodeFiltre === "mois-en-cours") {
      if (
        dateDepense.getMonth() !== maintenant.getMonth() ||
        dateDepense.getFullYear() !== maintenant.getFullYear()
      ) {
        return false;
      }
    } else if (periodeFiltre === "mois-dernier") {
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      if (
        dateDepense.getMonth() !== moisDernier.getMonth() ||
        dateDepense.getFullYear() !== moisDernier.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(depensesFiltrees.length / limitePage);
  const depensesPage = depensesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  // Calcul des statistiques
  const totalDepenses = depensesFiltrees.reduce((sum, d) => sum + Number(d.montant), 0);
  const totalMoisDernier = (depenses ?? [])
    .filter((d) => {
      const dateDepense = new Date(d.date_depense);
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      return dateDepense.getMonth() === moisDernier.getMonth() && 
             dateDepense.getFullYear() === moisDernier.getFullYear();
    })
    .reduce((sum, d) => sum + Number(d.montant), 0);
  const variation = totalMoisDernier > 0 ? ((totalDepenses - totalMoisDernier) / totalMoisDernier) * 100 : 0;
  const moyenneParJour = totalDepenses / new Date().getDate();
  const nbDepenses = depensesFiltrees.length;

  // Données pour le graphique
  const parCategorie = categories.map((c) => ({
    categorie: c,
    total: (depensesFiltrees ?? [])
      .filter((d) => d.categorie === c)
      .reduce((s, d) => s + Number(d.montant), 0),
  })).filter((c) => c.total > 0);

  const dataGraphique = parCategorie.map((c) => ({
    name: c.categorie,
    value: c.total,
  }));

  // Mutation pour ajouter une catégorie
  const ajouterCategorie = useMutation({
    mutationFn: async () => {
      if (!nouvelleCategorie.trim()) throw new Error("Nom de catégorie requis");
      if (categories.includes(nouvelleCategorie)) throw new Error("Catégorie déjà existante");
      setCategories([...categories, nouvelleCategorie]);
    },
    onSuccess: () => {
      setNouvelleCategorie("");
      setOpenCategorie(false);
      toast.success("Catégorie ajoutée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour créer une dépense
  const creer = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      
      // Upload de la pièce jointe si présente
      let pieceJointeUrl = null;
      if (form.piece_jointe) {
        const fileExt = form.piece_jointe.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('depenses-pieces-jointes')
          .upload(fileName, form.piece_jointe);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('depenses-pieces-jointes')
          .getPublicUrl(fileName);
        
        pieceJointeUrl = urlData.publicUrl;
      }
      
      const { error } = await supabase.from("depenses").insert({
        etablissement_id: etab!.id,
        date_depense: form.date_depense,
        categorie: form.categorie,
        libelle: form.libelle,
        montant: Number(form.montant),
        mode_paiement: form.mode_paiement,
        fournisseur: form.fournisseur || null,
        statut: form.statut,
        piece_jointe_url: pieceJointeUrl,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;

      if (form.reporter_caisse && form.statut !== "brouillon") {
        const { error: eOp } = await supabase.from("caisse_operations").insert({
          etablissement_id: etab!.id,
          sens: "sortie",
          motif: `Dépense — ${form.libelle}`,
          montant: Number(form.montant),
          mode_paiement: form.mode_paiement,
          created_by: u.user?.id ?? null,
        });
        if (eOp) throw eOp;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({ 
        ...form, 
        libelle: "", 
        montant: "", 
        fournisseur: "",
        piece_jointe: null,
      });
      toast.success("Dépense enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour modifier une dépense
  const modifier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("depenses")
        .update({
          date_depense: editForm.date_depense,
          categorie: editForm.categorie,
          libelle: editForm.libelle,
          montant: Number(editForm.montant),
          mode_paiement: editForm.mode_paiement,
          fournisseur: editForm.fournisseur || null,
          statut: editForm.statut,
        })
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditId(null);
      toast.success("Dépense modifiée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour exporter en CSV
  const exporterCSV = useMutation({
    mutationFn: async () => {
      const headers = ["Date", "Catégorie", "Libellé", "Fournisseur", "Mode", "Montant", "Statut"];
      const rows = depensesFiltrees.map((d) => [
        d.date_depense,
        d.categorie,
        d.libelle,
        d.fournisseur || "",
        d.mode_paiement,
        d.montant,
        d.statut,
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("
");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `depenses_${mois}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Export CSV téléchargé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Réinitialiser la pagination quand les filtres changent
  useState(() => {
    setPageActuelle(1);
  }, [recherche, categorieFiltre, periodeFiltre, modeFiltre, limitePage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-bg">
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Dépenses"
          description="Charges d'exploitation de l'établissement"
          action={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exporterCSV.mutate()}
                disabled={depensesFiltrees.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Plus className="size-4 mr-2" /> Nouvelle dépense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nouvelle dépense</DialogTitle>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      creer.mutate();
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          required
                          value={form.date_depense}
                          onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catégorie</Label>
                        <div className="flex gap-2">
                          <Select
                            value={form.categorie}
                            onValueChange={(v) => setForm({ ...form, categorie: v })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenCategorie(true)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Libellé</Label>
                      <Input
                        required
                        value={form.libelle}
                        onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                        placeholder="Ex: Achat fournitures bureau"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Montant (FCFA)</Label>
                        <Input
                          type="number"
                          min="0"
                          required
                          value={form.montant}
                          onChange={(e) => setForm({ ...form, montant: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mode de paiement</Label>
                        <Select
                          value={form.mode_paiement}
                          onValueChange={(v) => setForm({ ...form, mode_paiement: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="especes">Espèces</SelectItem>
                            <SelectItem value="mobile_money">Mobile money</SelectItem>
                            <SelectItem value="virement">Virement</SelectItem>
                            <SelectItem value="carte">Carte bancaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fournisseur</Label>
                      <Input
                        value={form.fournisseur}
                        onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                        placeholder="Nom du fournisseur (optionnel)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select
                        value={form.statut}
                        onValueChange={(v) => setForm({ ...form, statut: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brouillon">Brouillon</SelectItem>
                          <SelectItem value="valide">Validé</SelectItem>
                          <SelectItem value="rejete">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pièce jointe (facture, reçu)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setForm({ ...form, piece_jointe: e.target.files?.[0] || null })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Formats acceptés : PDF, JPG, PNG
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.reporter_caisse}
                        onChange={(e) => setForm({ ...form, reporter_caisse: e.target.checked })}
                      />
                      Reporter automatiquement en sortie de caisse
                    </label>
                    <DialogFooter>
                      <Button type="submit" disabled={creer.isPending || !etab}>
                        Enregistrer
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* CARTES DE SYNTHÈSE */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Total dépenses */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 via-white to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total dépenses
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatFCFA(totalDepenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {nbDepenses} dépense{nbDepenses > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_24px_rgba(239,68,68,0.7)] transition-shadow duration-300">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mois dernier */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mois dernier
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatFCFA(totalMoisDernier)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {variation >= 0 ? '↑' : '↓'} {Math.abs(variation).toFixed(1)}% vs ce mois
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_24px_rgba(59,130,246,0.7)] transition-shadow duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moyenne par jour */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Moyenne par jour
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatFCFA(moyenneParJour)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sur {new Date().getDate()} jours
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] transition-shadow duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nombre de dépenses */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nombre de dépenses
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {nbDepenses}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Période sélectionnée
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_0_16px_rgba(147,51,234,0.5)] group-hover:shadow-[0_0_24px_rgba(147,51,234,0.7)] transition-shadow duration-300">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRAPHIQUE + FILTRES */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Graphique de répartition */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Répartition par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              {dataGraphique.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dataGraphique}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatFCFA(value)}`}
                    >
                      {dataGraphique.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COULEURS_CATEGORIES[entry.name as keyof typeof COULEURS_CATEGORIES] || "#64748b"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatFCFA(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune dépense ce mois-ci
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filtres */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Filtres et recherche</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher (libellé, fournisseur, catégorie)..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-9"
                  />
                  {recherche && (
                    <button
                      onClick={() => setRecherche("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtres */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Période */}
                  <div className="space-y-2">
                    <Label className="text-xs">Période</Label>
                    <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                        <SelectItem value="mois-en-cours">Ce mois-ci</SelectItem>
                        <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                        <SelectItem value="tout">Toute période</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Catégorie */}
                  <div className="space-y-2">
                    <Label className="text-xs">Catégorie</Label>
                    <Select value={categorieFiltre} onValueChange={setCategorieFiltre}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toutes">Toutes catégories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mode de paiement */}
                  <div className="space-y-2">
                    <Label className="text-xs">Mode de paiement</Label>
                    <Select value={modeFiltre} onValueChange={setModeFiltre}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous modes</SelectItem>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="mobile_money">Mobile money</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="carte">Carte bancaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Badges des filtres actifs */}
                {(recherche || categorieFiltre !== "toutes" || periodeFiltre !== "mois-en-cours" || modeFiltre !== "tous") && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {recherche && (
                      <Badge variant="secondary" className="gap-1">
                        Recherche: {recherche}
                        <button onClick={() => setRecherche("")} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {categorieFiltre !== "toutes" && (
                      <Badge variant="secondary" className="gap-1">
                        Catégorie: {categorieFiltre}
                        <button onClick={() => setCategorieFiltre("toutes")} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {periodeFiltre !== "mois-en-cours" && (
                      <Badge variant="secondary" className="gap-1">
                        Période: {periodeFiltre === "aujourd'hui" ? "Aujourd'hui" : periodeFiltre === "mois-dernier" ? "Mois dernier" : "Toute période"}
                        <button onClick={() => setPeriodeFiltre("mois-en-cours")} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {modeFiltre !== "tous" && (
                      <Badge variant="secondary" className="gap-1">
                        Mode: {modeFiltre}
                        <button onClick={() => setModeFiltre("tous")} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SÉLECTEUR DE MOIS */}
        <div className="mb-4 max-w-48 space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
        </div>

        {/* TABLEAU DES DÉPENSES */}
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depensesPage.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(d.date_depense)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: COULEURS_CATEGORIES[d.categorie as keyof typeof COULEURS_CATEGORIES] }}>
                        {d.categorie}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.libelle}</TableCell>
                    <TableCell>{d.fournisseur ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.mode_paiement}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={d.statut === "valide" ? "secondary" : d.statut === "rejete" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {d.statut === "valide" ? "Validé" : d.statut === "rejete" ? "Rejeté" : "Brouillon"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatFCFA(d.montant)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(d.id)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(d.id);
                            setEditForm({
                              date_depense: d.date_depense,
                              categorie: d.categorie,
                              libelle: d.libelle,
                              montant: String(d.montant),
                              mode_paiement: d.mode_paiement,
                              fournisseur: d.fournisseur ?? "",
                              statut: d.statut,
                            });
                          }}
                        >
                          Modifier
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {depensesPage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {depensesFiltrees.length === 0
                        ? "Aucune dépense ne correspond aux filtres."
                        : "Aucune dépense sur ce mois."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {pageActuelle} sur {totalPages} ({depensesFiltrees.length} dépenses)
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(limitePage)}
                  onValueChange={(v) => setLimitePage(Number(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPageActuelle(pageActuelle - 1)}
                  disabled={pageActuelle === 1}
                >
                  ← Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPageActuelle(pageActuelle + 1)}
                  disabled={pageActuelle === totalPages}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* DIALOG - MODIFIER */}
        <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la dépense</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                modifier.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    required
                    value={editForm.date_depense}
                    onChange={(e) => setEditForm({ ...editForm, date_depense: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={editForm.categorie}
                    onValueChange={(v) => setEditForm({ ...editForm, categorie: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Libellé</Label>
                <Input
                  required
                  value={editForm.libelle}
                  onChange={(e) => setEditForm({ ...editForm, libelle: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Montant (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={editForm.montant}
                    onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={editForm.mode_paiement}
                    onValueChange={(v) => setEditForm({ ...editForm, mode_paiement: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="mobile_money">Mobile money</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="carte">Carte bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Input
                  value={editForm.fournisseur}
                  onChange={(e) => setEditForm({ ...editForm, fournisseur: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={(v) => setEditForm({ ...editForm, statut: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="rejete">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={modifier.isPending}>
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG - DÉTAIL */}
        <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détail de la dépense</DialogTitle>
            </DialogHeader>
            {(() => {
              const d = (depenses ?? []).find((x) => x.id === detailId);
              if (!d) return null;
              return (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(d.date_depense)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Catégorie</p>
                      <Badge variant="outline">{d.categorie}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Libellé</p>
                    <p className="font-medium">{d.libelle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fournisseur</p>
                    <p className="font-medium">{d.fournisseur ?? "—"}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Mode de paiement</p>
                      <p className="font-medium capitalize">{d.mode_paiement}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <Badge variant={d.statut === "valide" ? "secondary" : d.statut === "rejete" ? "destructive" : "outline"}>
                        {d.statut === "valide" ? "Validé" : d.statut === "rejete" ? "Rejeté" : "Brouillon"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="text-2xl font-bold">{formatFCFA(d.montant)}</p>
                  </div>
                  {d.piece_jointe_url && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Pièce jointe</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(d.piece_jointe_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* DIALOG - AJOUTER CATÉGORIE */}
        <Dialog open={openCategorie} onOpenChange={setOpenCategorie}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une catégorie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la catégorie</Label>
                <Input
                  value={nouvelleCategorie}
                  onChange={(e) => setNouvelleCategorie(e.target.value)}
                  placeholder="Ex: Marketing"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => ajouterCategorie.mutate()}
                  disabled={ajouterCategorie.isPending}
                >
                  Ajouter
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}