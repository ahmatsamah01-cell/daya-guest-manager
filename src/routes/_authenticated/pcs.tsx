import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Wallet, FileText, Search, Filter, X, Eye, Download } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  
  // États pour les filtres
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

  // Filtrage des pièces
  const piecesFiltrees = (pieces ?? []).filter((p) => {
    // Filtre par recherche
    if (recherche) {
      const terme = recherche.toLowerCase();
      const correspondRecherche =
        p.numero?.toLowerCase().includes(terme) ||
        p.beneficiaire?.toLowerCase().includes(terme) ||
        p.motif?.toLowerCase().includes(terme);
      if (!correspondRecherche) return false;
    }

    // Filtre par type
    if (typeFiltre !== "toutes" && p.type_piece !== typeFiltre) {
      return false;
    }

    // Filtre par période
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

  // Pagination
  const totalPages = Math.ceil(piecesFiltrees.length / limitePage);
  const piecesPage = piecesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  // Calcul des statistiques
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
      const numero = `${prefixe}-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

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

  // Réinitialiser la pagination quand les filtres changent
  useState(() => {
    setPageActuelle(1);
  }, [recherche, typeFiltre, periodeFiltre, limitePage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-bg">
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Pièces de caisse (PCS)"
          description="Justificatifs numérotés des mouvements d'espèces"
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Plus className="size-4 mr-2" /> Nouvelle pièce
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle pièce de caisse</DialogTitle>
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
                      <Label>Type</Label>
                      <Select
                        value={form.type_piece}
                        onValueChange={(v) => setForm({ ...form, type_piece: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sortie">Sortie (décaissement)</SelectItem>
                          <SelectItem value="entree">Entrée (encaissement)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        required
                        value={form.date_piece}
                        onChange={(e) => setForm({ ...form, date_piece: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bénéficiaire</Label>
                    <Input
                      required
                      value={form.beneficiaire}
                      onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motif</Label>
                    <Input
                      required
                      value={form.motif}
                      onChange={(e) => setForm({ ...form, motif: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={form.categorie}
                      onValueChange={(v) => setForm({ ...form, categorie: v })}
                    >
                      <SelectTrigger>
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
                    <Label>Montant (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.montant}
                      onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={creer.isPending || !etab}>
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        {/* CARTES DE SYNTHÈSE */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Total entrées */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total entrées
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatFCFA(totalEntrees)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {piecesFiltrees.filter(p => p.type_piece === 'entree').length} pièce{piecesFiltrees.filter(p => p.type_piece === 'entree').length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] transition-shadow duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total sorties */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 via-white to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total sorties
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatFCFA(totalSorties)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {piecesFiltrees.filter(p => p.type_piece === 'sortie').length} pièce{piecesFiltrees.filter(p => p.type_piece === 'sortie').length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_24px_rgba(239,68,68,0.7)] transition-shadow duration-300">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solde net */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Solde net
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${soldeNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatFCFA(Math.abs(soldeNet))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {soldeNet >= 0 ? 'Excédent' : 'Déficit'}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_24px_rgba(59,130,246,0.7)] transition-shadow duration-300">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nombre de pièces */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nombre de pièces
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {nbPieces}
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

        {/* BARRE DE FILTRES */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Recherche */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher (n°, bénéficiaire, motif)..."
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
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap gap-2">
                {/* Période */}
                <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                    <SelectItem value="mois-en-cours">Ce mois-ci</SelectItem>
                    <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                    <SelectItem value="tout">Toute période</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type */}
                <Select value={typeFiltre} onValueChange={setTypeFiltre}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toutes">Tous types</SelectItem>
                    <SelectItem value="entree">Entrées</SelectItem>
                    <SelectItem value="sortie">Sorties</SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset filtres */}
                {(recherche || typeFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRecherche("");
                      setTypeFiltre("toutes");
                      setPeriodeFiltre("mois-en-cours");
                    }}
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Badges des filtres actifs */}
            {(recherche || typeFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {recherche && (
                  <Badge variant="secondary" className="gap-1">
                    Recherche: {recherche}
                    <button onClick={() => setRecherche("")} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {typeFiltre !== "toutes" && (
                  <Badge variant="secondary" className="gap-1">
                    Type: {typeFiltre === "entree" ? "Entrées" : "Sorties"}
                    <button onClick={() => setTypeFiltre("toutes")} className="ml-1 hover:text-destructive">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* TABLEAU DES PIÈCES */}
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piecesPage.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.numero}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(p.date_piece)}</TableCell>
                    <TableCell>{p.beneficiaire}</TableCell>
                    <TableCell>{p.motif}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.categorie || 'Divers'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.type_piece === "entree" ? "secondary" : "destructive"}>
                        {p.type_piece === "entree" ? "Entrée" : "Sortie"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatFCFA(p.montant)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setRecu(p.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Fonction export à implémenter
                            toast.info("Export à venir");
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {piecesPage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {piecesFiltrees.length === 0
                        ? "Aucune pièce ne correspond aux filtres."
                        : "Aucune pièce de caisse enregistrée."}
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
                Page {pageActuelle} sur {totalPages} ({piecesFiltrees.length} pièces)
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

        {/* DIALOG - REÇU */}
<Dialog open={!!recu} onOpenChange={(o) => !o && setRecu(null)}>
  <DialogContent className="max-w-2xl">
    <DialogHeader className="no-print">
      <DialogTitle>Reçu — pièce de caisse</DialogTitle>
    </DialogHeader>
    {pieceRecu ? (
      <div className="print-area space-y-3 text-sm">
        <DocumentHeader
          titre={`Pièce de caisse ${pieceRecu.numero}`}
          sousTitre={formatDate(pieceRecu.date_piece)}
          etablissement={etab}
        />
        <div className="divide-y rounded-lg border">
          <div className="flex justify-between gap-4 p-3">
            <span className="text-muted-foreground">Type</span>
            <span>{pieceRecu.type_piece === "entree" ? "Entrée" : "Sortie"}</span>
          </div>
          <div className="flex justify-between gap-4 p-3">
            <span className="text-muted-foreground">Bénéficiaire</span>
            <span>{pieceRecu.beneficiaire}</span>
          </div>
          <div className="flex justify-between gap-4 p-3">
            <span className="text-muted-foreground">Motif</span>
            <span>{pieceRecu.motif}</span>
          </div>
          <div className="flex justify-between gap-4 p-3">
            <span className="text-muted-foreground">Catégorie</span>
            <span className="capitalize">{pieceRecu.categorie || 'Divers'}</span>
          </div>
        </div>
        <div className="font-display flex justify-between text-lg font-semibold">
          <span>Montant</span>
          <span>{formatFCFA(pieceRecu.montant)}</span>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-6 text-[11px] text-muted-foreground">
          <p>Signature bénéficiaire</p>
          <p className="text-right">Signature caissier</p>
        </div>
      </div>
    ) : null}
    <div className="no-print flex justify-end mt-4">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        Imprimer / PDF
      </Button>
    </div>
  </DialogContent>
</Dialog>