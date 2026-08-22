import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Search,
  Filter,
  X,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Printer,
  Eye,
  Pencil,
  Trash2,
  Tag,
  Building2,
  CreditCard,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Achats: "#3b82f6",
  "Énergie & eau": "#f59e0b",
  Salaires: "#10b981",
  Entretien: "#8b5cf6",
  Transport: "#ef4444",
  "Taxes & impôts": "#6b7280",
  Divers: "#64748b",
};

function DepensesPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();

  const [recherche, setRecherche] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [modeFiltre, setModeFiltre] = useState<string>("tous");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);
  const [mois, setMois] = useState(today().slice(0, 7));

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

  const depensesFiltrees = (depenses ?? []).filter((d) => {
    if (recherche) {
      const terme = recherche.toLowerCase();
      const correspondRecherche =
        d.libelle?.toLowerCase().includes(terme) ||
        d.fournisseur?.toLowerCase().includes(terme) ||
        d.categorie?.toLowerCase().includes(terme);
      if (!correspondRecherche) return false;
    }

    if (categorieFiltre !== "toutes" && d.categorie !== categorieFiltre) {
      return false;
    }

    if (modeFiltre !== "tous" && d.mode_paiement !== modeFiltre) {
      return false;
    }

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

  const totalPages = Math.ceil(depensesFiltrees.length / limitePage);
  const depensesPage = depensesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  const totalDepenses = depensesFiltrees.reduce((sum, d) => sum + Number(d.montant), 0);
  const totalMoisDernier = (depenses ?? [])
    .filter((d) => {
      const dateDepense = new Date(d.date_depense);
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      return (
        dateDepense.getMonth() === moisDernier.getMonth() &&
        dateDepense.getFullYear() === moisDernier.getFullYear()
      );
    })
    .reduce((sum, d) => sum + Number(d.montant), 0);
  const variation =
    totalMoisDernier > 0
      ? ((totalDepenses - totalMoisDernier) / totalMoisDernier) * 100
      : 0;
  const moyenneParJour = totalDepenses / new Date().getDate();
  const nbDepenses = depensesFiltrees.length;

  const parCategorie = categories
    .map((c) => ({
      categorie: c,
      total: (depensesFiltrees ?? [])
        .filter((d) => d.categorie === c)
        .reduce((s, d) => s + Number(d.montant), 0),
    }))
    .filter((c) => c.total > 0);

  const dataGraphique = parCategorie.map((c) => ({
    name: c.categorie,
    value: c.total,
  }));

  const ajouterCategorie = useMutation({
    mutationFn: async () => {
      if (!nouvelleCategorie.trim()) throw new Error("Nom de catégorie requis");
      if (categories.includes(nouvelleCategorie))
        throw new Error("Catégorie déjà existante");
      setCategories([...categories, nouvelleCategorie]);
    },
    onSuccess: () => {
      setNouvelleCategorie("");
      setOpenCategorie(false);
      toast.success("Catégorie ajoutée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creer = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();

      let pieceJointeUrl = null;
      if (form.piece_jointe) {
        const fileExt = form.piece_jointe.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("depenses-pieces-jointes")
          .upload(fileName, form.piece_jointe);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("depenses-pieces-jointes")
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
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Charges d'exploitation de l'établissement"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exporterCSV.mutate()}
              disabled={depensesFiltrees.length === 0}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Download className="size-4 mr-1.5" />
              Export CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                  <Plus className="size-4 mr-2" /> Nouvelle dépense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    Nouvelle dépense
                  </DialogTitle>
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
                      <Label className="text-slate-700 dark:text-slate-300">Date</Label>
                      <Input
                        type="date"
                        required
                        value={form.date_depense}
                        onChange={(e) =>
                          setForm({ ...form, date_depense: e.target.value })
                        }
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Catégorie</Label>
                      <div className="flex gap-2">
                        <Select
                          value={form.categorie}
                          onValueChange={(v) => setForm({ ...form, categorie: v })}
                        >
                          <SelectTrigger className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                          className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Libellé</Label>
                    <Input
                      required
                      value={form.libelle}
                      onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                      placeholder="Ex: Achat fournitures bureau"
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Montant (FCFA)</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        value={form.montant}
                        onChange={(e) => setForm({ ...form, montant: e.target.value })}
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Mode de paiement</Label>
                      <Select
                        value={form.mode_paiement}
                        onValueChange={(v) => setForm({ ...form, mode_paiement: v })}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                    <Label className="text-slate-700 dark:text-slate-300">Fournisseur</Label>
                    <Input
                      value={form.fournisseur}
                      onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                      placeholder="Nom du fournisseur (optionnel)"
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Statut</Label>
                    <Select
                      value={form.statut}
                      onValueChange={(v) => setForm({ ...form, statut: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                    <Label className="text-slate-700 dark:text-slate-300">Pièce jointe</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          piece_jointe: e.target.files?.[0] || null,
                        })
                      }
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Formats acceptés : PDF, JPG, PNG
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.reporter_caisse}
                      onChange={(e) =>
                        setForm({ ...form, reporter_caisse: e.target.checked })
                      }
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    Reporter automatiquement en sortie de caisse
                  </label>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={creer.isPending || !etab}
                      className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
                    >
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════════════
          CARTES DE SYNTHÈSE
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
              <TrendingDown className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total dépenses
              </p>
              <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
                {formatFCFA(totalDepenses)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {nbDepenses} dépense{nbDepenses > 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
              <Calendar className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mois dernier
              </p>
              <p className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatFCFA(totalMoisDernier)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {variation >= 0 ? "↑" : "↓"} {Math.abs(variation).toFixed(1)}% vs ce mois
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Moyenne par jour
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatFCFA(moyenneParJour)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Sur {new Date().getDate()} jours
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-110">
              <FileText className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nombre de dépenses
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {nbDepenses}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Période sélectionnée
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          GRAPHIQUE + FILTRES
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white">
              Répartition par catégorie
            </CardTitle>
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
                    labelLine={false}
                  >
                    {dataGraphique.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          COULEURS_CATEGORIES[
                            entry.name as keyof typeof COULEURS_CATEGORIES
                          ] || "#64748b"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatFCFA(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 dark:text-slate-500">
                Aucune dépense ce mois-ci
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white">
              Filtres et recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Rechercher (libellé, fournisseur, catégorie)..."
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Période</Label>
                <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Catégorie</Label>
                <Select value={categorieFiltre} onValueChange={setCategorieFiltre}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Mode de paiement</Label>
                <Select value={modeFiltre} onValueChange={setModeFiltre}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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

            {(recherche ||
              categorieFiltre !== "toutes" ||
              periodeFiltre !== "mois-en-cours" ||
              modeFiltre !== "tous") && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                {recherche && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Recherche: {recherche}
                    <button onClick={() => setRecherche("")} className="ml-1 hover:text-red-500">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {categorieFiltre !== "toutes" && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Catégorie: {categorieFiltre}
                    <button
                      onClick={() => setCategorieFiltre("toutes")}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {periodeFiltre !== "mois-en-cours" && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Période:{" "}
                    {periodeFiltre === "aujourd'hui"
                      ? "Aujourd'hui"
                      : periodeFiltre === "mois-dernier"
                      ? "Mois dernier"
                      : "Toute période"}
                    <button
                      onClick={() => setPeriodeFiltre("mois-en-cours")}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {modeFiltre !== "tous" && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Mode: {modeFiltre}
                    <button
                      onClick={() => setModeFiltre("tous")}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SÉLECTEUR DE MOIS
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-48 space-y-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400">Mois</Label>
        <Input
          type="month"
          value={mois}
          onChange={(e) => setMois(e.target.value)}
          className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABLEAU DES DÉPENSES
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Date
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Catégorie
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Libellé
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Fournisseur
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Mode
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Statut
                </TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">
                  Montant
                </TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depensesPage.map((d) => (
                <TableRow
                  key={d.id}
                  className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                >
                  <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatDate(d.date_depense)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px]"
                      style={{
                        borderColor:
                          COULEURS_CATEGORIES[
                            d.categorie as keyof typeof COULEURS_CATEGORIES
                          ] || "#64748b",
                        color:
                          COULEURS_CATEGORIES[
                            d.categorie as keyof typeof COULEURS_CATEGORIES
                          ] || "#64748b",
                      }}
                    >
                      {d.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {d.libelle}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {d.fournisseur ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                    {d.mode_paiement}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        d.statut === "valide"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                          : d.statut === "rejete"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200/30"
                      }`}
                    >
                      {d.statut === "valide"
                        ? "Validé"
                        : d.statut === "rejete"
                        ? "Rejeté"
                        : "Brouillon"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium text-red-600 dark:text-red-400">
                    {formatFCFA(d.montant)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => setDetailId(d.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {depensesPage.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    {depensesFiltrees.length === 0
                      ? "Aucune dépense ne correspond aux filtres."
                      : "Aucune dépense sur ce mois."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* ═══════════════════════════════════════════════════════
            PAGINATION
            ═══════════════════════════════════════════════════════ */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700/50">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Page {pageActuelle} sur {totalPages} ({depensesFiltrees.length}{" "}
              dépenses)
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(limitePage)}
                onValueChange={(v) => setLimitePage(Number(v))}
              >
                <SelectTrigger className="w-[120px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              >
                ← Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPageActuelle(pageActuelle + 1)}
                disabled={pageActuelle === totalPages}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              >
                Suivant →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════
          DIALOG - MODIFIER
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Modifier la dépense
            </DialogTitle>
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
                <Label className="text-slate-700 dark:text-slate-300">Date</Label>
                <Input
                  type="date"
                  required
                  value={editForm.date_depense}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date_depense: e.target.value })
                  }
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Catégorie</Label>
                <Select
                  value={editForm.categorie}
                  onValueChange={(v) => setEditForm({ ...editForm, categorie: v })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
              <Label className="text-slate-700 dark:text-slate-300">Libellé</Label>
              <Input
                required
                value={editForm.libelle}
                onChange={(e) =>
                  setEditForm({ ...editForm, libelle: e.target.value })
                }
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Montant (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={editForm.montant}
                  onChange={(e) =>
                    setEditForm({ ...editForm, montant: e.target.value })
                  }
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Mode de paiement</Label>
                <Select
                  value={editForm.mode_paiement}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, mode_paiement: v })
                  }
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
              <Label className="text-slate-700 dark:text-slate-300">Fournisseur</Label>
              <Input
                value={editForm.fournisseur}
                onChange={(e) =>
                  setEditForm({ ...editForm, fournisseur: e.target.value })
                }
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Statut</Label>
              <Select
                value={editForm.statut}
                onValueChange={(v) => setEditForm({ ...editForm, statut: v })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
              <Button
                type="submit"
                disabled={modifier.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          DIALOG - DÉTAIL
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Détail de la dépense
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const d = (depenses ?? []).find((x) => x.id === detailId);
            if (!d) return null;
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatDate(d.date_depense)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Catégorie</p>
                    <Badge
                      variant="outline"
                      className="rounded-full"
                      style={{
                        borderColor:
                          COULEURS_CATEGORIES[
                            d.categorie as keyof typeof COULEURS_CATEGORIES
                          ] || "#64748b",
                        color:
                          COULEURS_CATEGORIES[
                            d.categorie as keyof typeof COULEURS_CATEGORIES
                          ] || "#64748b",
                      }}
                    >
                      {d.categorie}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Libellé</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {d.libelle}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fournisseur</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {d.fournisseur ?? "—"}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Mode de paiement</p>
                    <p className="font-medium text-slate-900 dark:text-white capitalize">
                      {d.mode_paiement}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Statut</p>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        d.statut === "valide"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                          : d.statut === "rejete"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200/30"
                      }`}
                    >
                      {d.statut === "valide"
                        ? "Validé"
                        : d.statut === "rejete"
                        ? "Rejeté"
                        : "Brouillon"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Montant</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatFCFA(d.montant)}
                  </p>
                </div>
                {d.piece_jointe_url && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Pièce jointe
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(d.piece_jointe_url, "_blank")}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Download className="size-4 mr-1.5" />
                      Télécharger
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          DIALOG - AJOUTER CATÉGORIE
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={openCategorie} onOpenChange={setOpenCategorie}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Ajouter une catégorie
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Nom de la catégorie</Label>
              <Input
                value={nouvelleCategorie}
                onChange={(e) => setNouvelleCategorie(e.target.value)}
                placeholder="Ex: Marketing"
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => ajouterCategorie.mutate()}
                disabled={ajouterCategorie.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                Ajouter
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}