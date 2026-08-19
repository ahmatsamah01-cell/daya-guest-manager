import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, FileText, Search, Filter, X, Download, Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";
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
import { useEtablissement, useParametres } from "@/hooks/use-hotel";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/taxe-sejour")({
  head: () => ({
    meta: [
      { title: "Taxe de séjour — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Collecte et reversement de la taxe de séjour par nuitée pour LE DAYA Guest House, Port-Gentil.",
      },
      { property: "og:title", content: "Taxe de séjour — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Taxe collectée par nuitée et suivi des reversements." },
    ],
  }),
  component: TaxePage,
});

function TaxePage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const montantUnitaire = Number(params?.["taxe_sejour_montant"] ?? 1000);
  
  // États pour les filtres
  const [recherche, setRecherche] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);
  const [mois, setMois] = useState(today().slice(0, 7));
  
  // États pour les dialogs
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    date_nuitee: today(),
    nb_nuits: "1",
    montant_unitaire: String(montantUnitaire),
    reverse: false,
  });

  // Récupération des taxes
  const { data: taxes, isLoading } = useQuery({
    queryKey: ["taxes_sejour", mois],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes_sejour")
        .select("*, reservations(date_arrivee, date_depart, clients(nom, prenom), chambres(nom))")
        .gte("date_nuitee", `${mois}-01`)
        .lte("date_nuitee", `${mois}-31`)
        .order("date_nuitee", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Récupération de l'historique des reversements
  const { data: historique } = useQuery({
    queryKey: ["taxes_sejour_historique"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes_sejour")
        .select("date_reversement, montant_total")
        .not("date_reversement", "is", null)
        .order("date_reversement", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Filtrage des taxes
  const taxesFiltrees = (taxes ?? []).filter((t) => {
    // Filtre par recherche
    if (recherche) {
      const terme = recherche.toLowerCase();
      const client = `${t.reservations?.clients?.prenom ?? ""} ${t.reservations?.clients?.nom ?? ""}`.toLowerCase();
      const chambre = t.reservations?.chambres?.nom?.toLowerCase() ?? "";
      const correspondRecherche =
        client.includes(terme) ||
        chambre.includes(terme) ||
        t.id?.toLowerCase().includes(terme);
      if (!correspondRecherche) return false;
    }

    // Filtre par statut
    if (statutFiltre === "reversees" && !t.reverse) {
      return false;
    } else if (statutFiltre === "a_reverser" && t.reverse) {
      return false;
    }

    // Filtre par période
    const dateNuitee = new Date(t.date_nuitee);
    const maintenant = new Date();
    
    if (periodeFiltre === "aujourd'hui") {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      if (dateNuitee < aujourdhui) return false;
    } else if (periodeFiltre === "mois-en-cours") {
      if (
        dateNuitee.getMonth() !== maintenant.getMonth() ||
        dateNuitee.getFullYear() !== maintenant.getFullYear()
      ) {
        return false;
      }
    } else if (periodeFiltre === "mois-dernier") {
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      if (
        dateNuitee.getMonth() !== moisDernier.getMonth() ||
        dateNuitee.getFullYear() !== moisDernier.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(taxesFiltrees.length / limitePage);
  const taxesPage = taxesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  // Calcul des statistiques
  const collecte = taxesFiltrees.reduce((s, t) => s + Number(t.montant_total), 0);
  const aReverser = taxesFiltrees
    .filter((t) => !t.reverse)
    .reduce((s, t) => s + Number(t.montant_total), 0);
  const reversees = taxesFiltrees
    .filter((t) => t.reverse)
    .reduce((s, t) => s + Number(t.montant_total), 0);
  const nuitees = taxesFiltrees.reduce((s, t) => s + t.nb_nuits, 0);
  const tauxMoyen = nuitees > 0 ? collecte / nuitees : 0;
  const nbTaxes = taxesFiltrees.length;

  // Données pour le graphique
  const dataGraphique = taxesFiltrees
    .reduce((acc, t) => {
      const date = t.date_nuitee;
      const existing = acc.find((x) => x.date === date);
      if (existing) {
        existing.montant += Number(t.montant_total);
      } else {
        acc.push({ date, montant: Number(t.montant_total) });
      }
      return acc;
    }, [] as { date: string; montant: number }[])
    .slice(0, 10)
    .map((x) => ({
      ...x,
      date: formatDate(x.date),
    }));

  // Mutation pour modifier une taxe
  const modifier = useMutation({
    mutationFn: async () => {
      const nuits = Math.max(1, Number(editForm.nb_nuits) || 1);
      const unitaire = Number(editForm.montant_unitaire) || 0;
      const { error } = await supabase
        .from("taxes_sejour")
        .update({
          date_nuitee: editForm.date_nuitee,
          nb_nuits: nuits,
          montant_unitaire: unitaire,
          montant_total: nuits * unitaire,
          reverse: editForm.reverse,
          date_reversement: editForm.reverse ? today() : null,
        })
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditId(null);
      toast.success("Taxe modifiée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour reverser une taxe
  const reverser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("taxes_sejour")
        .update({ reverse: true, date_reversement: today() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxes_sejour"] });
      toast.success("Taxe marquée comme reversée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour exporter en CSV
  const exporterCSV = useMutation({
    mutationFn: async () => {
      const headers = ["Date", "Client", "Chambre", "Nuitées", "Montant", "Statut"];
      const rows = taxesFiltrees.map((t) => [
        t.date_nuitee,
        `${t.reservations?.clients?.prenom ?? ""} ${t.reservations?.clients?.nom ?? ""}`,
        t.reservations?.chambres?.nom ?? "",
        String(t.nb_nuits),
        String(t.montant_total),
        t.reverse ? "Reversée" : "À reverser",
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `taxes_sejour_${mois}.csv`;
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
  }, [recherche, statutFiltre, periodeFiltre, limitePage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-bg">
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Taxe de séjour"
          description={`Taux en vigueur : ${formatFCFA(montantUnitaire)} par nuitée et par chambre`}
          action={
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exporterCSV.mutate()}
              disabled={taxesFiltrees.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          }
        />

        {/* CARTES DE SYNTHÈSE */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          {/* Total collecté */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total collecté
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatFCFA(collecte)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {nbTaxes} taxe{nbTaxes > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] transition-shadow duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total reversé */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total reversé
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatFCFA(reversees)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {taxesFiltrees.filter(t => t.reverse).length} reversée{taxesFiltrees.filter(t => t.reverse).length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_24px_rgba(59,130,246,0.7)] transition-shadow duration-300">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reste à reverser */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 via-white to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Reste à reverser
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatFCFA(aReverser)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {taxesFiltrees.filter(t => !t.reverse).length} à reverser
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_24px_rgba(239,68,68,0.7)] transition-shadow duration-300">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nuitées taxées */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nuitées taxées
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {nuitees}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nombre de nuits
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_0_16px_rgba(147,51,234,0.5)] group-hover:shadow-[0_0_24px_rgba(147,51,234,0.7)] transition-shadow duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taux moyen */}
          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-50 via-white to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Taux moyen
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatFCFA(tauxMoyen)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Par nuitée
                  </p>
                </div>
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.5)] group-hover:shadow-[0_0_24px_rgba(245,158,11,0.7)] transition-shadow duration-300">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRAPHIQUE + FILTRES */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Graphique */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Évolution des taxes</CardTitle>
            </CardHeader>
            <CardContent>
              {dataGraphique.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dataGraphique}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatFCFA(value)} />
                    <Line type="monotone" dataKey="montant" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée ce mois-ci
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
                    placeholder="Rechercher (client, chambre, ID)..."
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
                <div className="grid gap-4 sm:grid-cols-2">
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

                  {/* Statut */}
                  <div className="space-y-2">
                    <Label className="text-xs">Statut</Label>
                    <Select value={statutFiltre} onValueChange={setStatutFiltre}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toutes">Toutes</SelectItem>
                        <SelectItem value="reversees">Reversées</SelectItem>
                        <SelectItem value="a_reverser">À reverser</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Badges des filtres actifs */}
                {(recherche || statutFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {recherche && (
                      <Badge variant="secondary" className="gap-1">
                        Recherche: {recherche}
                        <button onClick={() => setRecherche("")} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {statutFiltre !== "toutes" && (
                      <Badge variant="secondary" className="gap-1">
                        Statut: {statutFiltre === "reversees" ? "Reversées" : "À reverser"}
                        <button onClick={() => setStatutFiltre("toutes")} className="ml-1 hover:text-destructive">
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SÉLECTEUR DE MOIS */}
        <div className="mb-4 max-w-48 space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
        </div>

        {/* TABLEAU DES TAXES */}
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Nuitées</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxesPage.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(t.date_nuitee)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {t.reservations?.clients?.prenom?.[0] ?? "C"}
                        </div>
                        <div>
                          <p className="font-medium">
                            {t.reservations?.clients?.prenom} {t.reservations?.clients?.nom}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                        {t.reservations?.chambres?.nom ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {t.nb_nuits}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatFCFA(t.montant_total)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={t.reverse ? "secondary" : "destructive"}
                        className="gap-1"
                      >
                        {t.reverse ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Reversée
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            À reverser
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(t.id)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(t.id);
                            setEditForm({
                              date_nuitee: t.date_nuitee,
                              nb_nuits: String(t.nb_nuits),
                              montant_unitaire: String(t.montant_unitaire),
                              reverse: t.reverse,
                            });
                          }}
                        >
                          Modifier
                        </Button>
                        {!t.reverse && (
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                            onClick={() => reverser.mutate(t.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {taxesPage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {taxesFiltrees.length === 0
                        ? "Aucune taxe ne correspond aux filtres."
                        : "Aucune taxe collectée sur ce mois. Les taxes sont générées au check-out."}
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
                Page {pageActuelle} sur {totalPages} ({taxesFiltrees.length} taxes)
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
              <DialogTitle>Modifier la taxe de séjour</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                modifier.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Date de la première nuitée</Label>
                <Input
                  type="date"
                  required
                  value={editForm.date_nuitee}
                  onChange={(e) => setEditForm({ ...editForm, date_nuitee: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre de nuitées</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={editForm.nb_nuits}
                    onChange={(e) => setEditForm({ ...editForm, nb_nuits: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant par nuitée (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={editForm.montant_unitaire}
                    onChange={(e) =>
                      setEditForm({ ...editForm, montant_unitaire: e.target.value })
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.reverse}
                  onChange={(e) => setEditForm({ ...editForm, reverse: e.target.checked })}
                />
                Taxe reversée
              </label>
              <p className="text-sm text-muted-foreground">
                Total :{" "}
                {formatFCFA(
                  Math.max(1, Number(editForm.nb_nuits) || 1) *
                    (Number(editForm.montant_unitaire) || 0),
                )}
              </p>
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
              <DialogTitle>Détail de la taxe de séjour</DialogTitle>
            </DialogHeader>
            {(() => {
              const t = (taxes ?? []).find((x) => x.id === detailId);
              if (!t) return null;
              return (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(t.date_nuitee)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">
                        {t.reservations?.clients?.prenom} {t.reservations?.clients?.nom}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Chambre</p>
                      <Badge variant="outline">{t.reservations?.chambres?.nom ?? "—"}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nuitées</p>
                      <p className="font-medium text-2xl">{t.nb_nuits}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Montant unitaire</p>
                      <p className="font-medium">{formatFCFA(t.montant_unitaire)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="font-bold text-2xl">{formatFCFA(t.montant_total)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge 
                      variant={t.reverse ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {t.reverse ? "Reversée" : "À reverser"}
                    </Badge>
                  </div>
                  {t.date_reversement && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de reversement</p>
                      <p className="font-medium">{formatDate(t.date_reversement)}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}