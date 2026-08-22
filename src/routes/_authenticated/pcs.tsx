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
  Eye,
  Download,
  CalendarDays,
  Users,
  Tag,
  Printer, 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { DocumentHeader } from "@/components/Brand";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/pcs")({
  head: () => ({
    meta: [
      { title: "PCS — Pièces de caisse — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Émission des pièces de caisse (entrée / sortie) justifiant chaque mouvement d'espèces.",
      },
      { property: "og:title", content: "Pièces de caisse — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Justificatifs numérotés des mouvements de caisse." },
    ],
  }),
  component: PcsPage,
});

function PcsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const [open, setOpen] = useState(false);
  const [recu, setRecu] = useState<string | null>(null);

  const [recherche, setRecherche] = useState("");
  const [typeFiltre, setTypeFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);

  const [form, setForm] = useState({
    type_piece: "sortie",
    date_piece: today(),
    beneficiaire: "",
    motif: "",
    montant: "",
    categorie: "divers",
  });

  const { data: pieces } = useQuery({
    queryKey: ["pieces_caisse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pieces_caisse")
        .select("*, caisse_operations(mode_paiement)")
        .order("date_piece", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const piecesFiltrees = (pieces ?? []).filter((p) => {
    if (recherche) {
      const terme = recherche.toLowerCase();
      const correspondRecherche =
        p.numero?.toLowerCase().includes(terme) ||
        p.beneficiaire?.toLowerCase().includes(terme) ||
        p.motif?.toLowerCase().includes(terme);
      if (!correspondRecherche) return false;
    }

    if (typeFiltre !== "toutes" && p.type_piece !== typeFiltre) {
      return false;
    }

    const datePiece = new Date(p.date_piece);
    const maintenant = new Date();

    if (periodeFiltre === "aujourd'hui") {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      if (datePiece < aujourdhui) return false;
    } else if (periodeFiltre === "mois-en-cours") {
      if (
        datePiece.getMonth() !== maintenant.getMonth() ||
        datePiece.getFullYear() !== maintenant.getFullYear()
      ) {
        return false;
      }
    } else if (periodeFiltre === "mois-dernier") {
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      if (
        datePiece.getMonth() !== moisDernier.getMonth() ||
        datePiece.getFullYear() !== moisDernier.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(piecesFiltrees.length / limitePage);
  const piecesPage = piecesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  const totalEntrees = piecesFiltrees
    .filter((p) => p.type_piece === "entree")
    .reduce((sum, p) => sum + Number(p.montant), 0);
  const totalSorties = piecesFiltrees
    .filter((p) => p.type_piece === "sortie")
    .reduce((sum, p) => sum + Number(p.montant), 0);
  const soldeNet = totalEntrees - totalSorties;
  const nbPieces = piecesFiltrees.length;

  const creer = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { count } = await supabase
        .from("pieces_caisse")
        .select("id", { count: "exact", head: true });
      const prefixe = form.type_piece === "entree" ? "PCE" : "PCS";
      const numero = `${prefixe}-${new Date().getFullYear()}-${String(
        (count ?? 0) + 1
      ).padStart(4, "0")}`;

      const { data: op, error: eOp } = await supabase
        .from("caisse_operations")
        .insert({
          etablissement_id: etab!.id,
          sens: form.type_piece === "entree" ? "entree" : "sortie",
          motif: `${numero} — ${form.motif}`,
          montant: Number(form.montant),
          mode_paiement: "especes",
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (eOp) throw eOp;

      const { error } = await supabase.from("pieces_caisse").insert({
        etablissement_id: etab!.id,
        numero,
        type_piece: form.type_piece,
        date_piece: form.date_piece,
        beneficiaire: form.beneficiaire,
        motif: form.motif,
        montant: Number(form.montant),
        categorie: form.categorie,
        operation_id: op.id,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      return numero;
    },
    onSuccess: (numero) => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({
        type_piece: "sortie",
        date_piece: today(),
        beneficiaire: "",
        motif: "",
        montant: "",
        categorie: "divers",
      });
      toast.success(`Pièce ${numero} créée et reportée en caisse.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pieceRecu = (pieces ?? []).find((p) => p.id === recu);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pièces de caisse (PCS)"
        description="Justificatifs numérotés des mouvements d'espèces"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                <Plus className="size-4 mr-2" /> Nouvelle pièce
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Nouvelle pièce de caisse
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
                    <Label className="text-slate-700 dark:text-slate-300">Type</Label>
                    <Select
                      value={form.type_piece}
                      onValueChange={(v) => setForm({ ...form, type_piece: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sortie">Sortie (décaissement)</SelectItem>
                        <SelectItem value="entree">Entrée (encaissement)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Date</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_piece}
                      onChange={(e) => setForm({ ...form, date_piece: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Bénéficiaire</Label>
                  <Input
                    required
                    value={form.beneficiaire}
                    onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Motif</Label>
                  <Input
                    required
                    value={form.motif}
                    onChange={(e) => setForm({ ...form, motif: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Catégorie</Label>
                  <Select
                    value={form.categorie}
                    onValueChange={(v) => setForm({ ...form, categorie: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="personnel">Personnel</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        }
      />

      {/* ═══════════════════════════════════════════════════════
          CARTES DE SYNTHÈSE
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total entrées
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatFCFA(totalEntrees)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {piecesFiltrees.filter((p) => p.type_piece === "entree").length} pièce(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
              <TrendingDown className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total sorties
              </p>
              <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
                {formatFCFA(totalSorties)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {piecesFiltrees.filter((p) => p.type_piece === "sortie").length} pièce(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
              <Wallet className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Solde net
              </p>
              <p
                className={`font-display text-2xl font-bold ${
                  soldeNet >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatFCFA(Math.abs(soldeNet))}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {soldeNet >= 0 ? "Excédent" : "Déficit"}
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
                Nombre de pièces
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {nbPieces}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Période sélectionnée
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BARRE DE FILTRES
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Rechercher (n°, bénéficiaire, motif)..."
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
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                <SelectTrigger className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                  <SelectItem value="mois-en-cours">Ce mois-ci</SelectItem>
                  <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                  <SelectItem value="tout">Toute période</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFiltre} onValueChange={setTypeFiltre}>
                <SelectTrigger className="w-[140px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Tous types</SelectItem>
                  <SelectItem value="entree">Entrées</SelectItem>
                  <SelectItem value="sortie">Sorties</SelectItem>
                </SelectContent>
              </Select>

              {(recherche || typeFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecherche("");
                    setTypeFiltre("toutes");
                    setPeriodeFiltre("mois-en-cours");
                  }}
                  className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                >
                  <Filter className="size-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {(recherche || typeFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              {recherche && (
                <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Recherche: {recherche}
                  <button onClick={() => setRecherche("")} className="ml-1 hover:text-red-500">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {typeFiltre !== "toutes" && (
                <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Type: {typeFiltre === "entree" ? "Entrées" : "Sorties"}
                  <button onClick={() => setTypeFiltre("toutes")} className="ml-1 hover:text-red-500">
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
                  <button onClick={() => setPeriodeFiltre("mois-en-cours")} className="ml-1 hover:text-red-500">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          TABLEAU DES PIÈCES
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Numéro
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Date
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Bénéficiaire
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Motif
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Catégorie
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Type
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
              {piecesPage.map((p) => (
                <TableRow
                  key={p.id}
                  className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                >
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {p.numero}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatDate(p.date_piece)}
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {p.beneficiaire}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {p.motif}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 dark:border-slate-600/50 text-slate-600 dark:text-slate-300"
                    >
                      {p.categorie || "Divers"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        p.type_piece === "entree"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                      }`}
                    >
                      {p.type_piece === "entree" ? "Entrée" : "Sortie"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right whitespace-nowrap font-medium ${
                      p.type_piece === "entree"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatFCFA(p.montant)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => setRecu(p.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => {
                          toast.info("Export à venir");
                        }}
                      >
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {piecesPage.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    {piecesFiltrees.length === 0
                      ? "Aucune pièce ne correspond aux filtres."
                      : "Aucune pièce de caisse enregistrée."}
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
              Page {pageActuelle} sur {totalPages} ({piecesFiltrees.length} pièces)
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
          DIALOG - REÇU
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!recu} onOpenChange={(o) => !o && setRecu(null)}>
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Reçu — pièce de caisse
            </DialogTitle>
          </DialogHeader>
          {pieceRecu ? (
            <div className="print-area space-y-4 text-sm">
              <DocumentHeader
                titre={`Pièce de caisse ${pieceRecu.numero}`}
                sousTitre={formatDate(pieceRecu.date_piece)}
                etablissement={etab}
              />
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 overflow-hidden">
                <div className="flex justify-between gap-4 p-4">
                  <span className="text-slate-500 dark:text-slate-400">Type</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pieceRecu.type_piece === "entree" ? "Entrée" : "Sortie"}
                  </span>
                </div>
                <div className="flex justify-between gap-4 p-4">
                  <span className="text-slate-500 dark:text-slate-400">Bénéficiaire</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pieceRecu.beneficiaire}
                  </span>
                </div>
                <div className="flex justify-between gap-4 p-4">
                  <span className="text-slate-500 dark:text-slate-400">Motif</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pieceRecu.motif}
                  </span>
                </div>
                <div className="flex justify-between gap-4 p-4">
                  <span className="text-slate-500 dark:text-slate-400">Catégorie</span>
                  <span className="font-medium text-slate-900 dark:text-white capitalize">
                    {pieceRecu.categorie || "Divers"}
                  </span>
                </div>
              </div>
              <div className="font-display flex justify-between text-xl font-bold">
                <span className="text-slate-700 dark:text-slate-300">Montant</span>
                <span
                  className={
                    pieceRecu.type_piece === "entree"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {formatFCFA(pieceRecu.montant)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700/50">
                <p>Signature bénéficiaire</p>
                <p className="text-right">Signature caissier</p>
              </div>
            </div>
          ) : null}
          <div className="no-print flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Printer className="size-4 mr-1.5" />
              Imprimer / PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}