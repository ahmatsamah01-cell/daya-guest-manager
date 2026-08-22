import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Search,
  Filter,
  X,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  BedDouble,
  Eye,
  Pencil,
  Printer,
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
import { useEtablissement, useParametres } from "@/hooks/use-hotel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

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

  const [recherche, setRecherche] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);
  const [mois, setMois] = useState(today().slice(0, 7));

  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    date_nuitee: today(),
    nb_nuits: "1",
    montant_unitaire: String(montantUnitaire),
    reverse: false,
  });

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

  const taxesFiltrees = (taxes ?? []).filter((t) => {
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

    if (statutFiltre === "reversees" && !t.reverse) {
      return false;
    } else if (statutFiltre === "a_reverser" && t.reverse) {
      return false;
    }

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

  const totalPages = Math.ceil(taxesFiltrees.length / limitePage);
  const taxesPage = taxesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

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
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxe de séjour"
        description={`Taux en vigueur : ${formatFCFA(montantUnitaire)} par nuitée et par chambre`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exporterCSV.mutate()}
            disabled={taxesFiltrees.length === 0}
            className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
          >
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>
        }
      />

      {/* ═══════════════════════════════════════════════════════
          CARTES DE SYNTHÈSE
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total collecté
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatFCFA(collecte)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {nbTaxes} taxe{nbTaxes > 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
              <CheckCircle className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total reversé
              </p>
              <p className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatFCFA(reversees)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {taxesFiltrees.filter((t) => t.reverse).length} reversée(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
              <Clock className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Reste à reverser
              </p>
              <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
                {formatFCFA(aReverser)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {taxesFiltrees.filter((t) => !t.reverse).length} à reverser
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-110">
              <Calendar className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nuitées taxées
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {nuitees}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Nombre de nuits
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 transition-transform group-hover:scale-110">
              <Wallet className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taux moyen
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatFCFA(tauxMoyen)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Par nuitée
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
              Évolution des taxes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataGraphique.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dataGraphique}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatFCFA(value)}
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(226,232,240,0.8)",
                      borderRadius: "12px",
                      backdropFilter: "blur(12px)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="montant"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 dark:text-slate-500">
                Aucune donnée ce mois-ci
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
                placeholder="Rechercher (client, chambre, ID)..."
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

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label className="text-xs text-slate-500 dark:text-slate-400">Statut</Label>
                <Select value={statutFiltre} onValueChange={setStatutFiltre}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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

            {(recherche ||
              statutFiltre !== "toutes" ||
              periodeFiltre !== "mois-en-cours") && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                {recherche && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Recherche: {recherche}
                    <button onClick={() => setRecherche("")} className="ml-1 hover:text-red-500">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {statutFiltre !== "toutes" && (
                  <Badge className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Statut: {statutFiltre === "reversees" ? "Reversées" : "À reverser"}
                    <button
                      onClick={() => setStatutFiltre("toutes")}
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
          TABLEAU DES TAXES
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
                  Client
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Chambre
                </TableHead>
                <TableHead className="text-center text-slate-600 dark:text-slate-300 font-semibold">
                  Nuitées
                </TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">
                  Montant
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                  Statut
                </TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxesPage.map((t) => (
                <TableRow
                  key={t.id}
                  className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                >
                  <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatDate(t.date_nuitee)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold shadow-md">
                        {t.reservations?.clients?.prenom?.[0] ?? "C"}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {t.reservations?.clients?.prenom} {t.reservations?.clients?.nom}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 dark:border-slate-600/50 text-slate-600 dark:text-slate-300"
                    >
                      {t.reservations?.chambres?.nom ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold text-sm">
                      {t.nb_nuits}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium text-slate-900 dark:text-white">
                    {formatFCFA(t.montant_total)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        t.reverse
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/30"
                      }`}
                    >
                      {t.reverse ? (
                        <>
                          <CheckCircle className="inline size-3 mr-1" />
                          Reversée
                        </>
                      ) : (
                        <>
                          <Clock className="inline size-3 mr-1" />
                          À reverser
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => setDetailId(t.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                        <Pencil className="size-4" />
                      </Button>
                      {!t.reverse && (
                        <Button
                          size="sm"
                          className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                          onClick={() => reverser.mutate(t.id)}
                        >
                          <CheckCircle className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {taxesPage.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    {taxesFiltrees.length === 0
                      ? "Aucune taxe ne correspond aux filtres."
                      : "Aucune taxe collectée sur ce mois. Les taxes sont générées au check-out."}
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
              Page {pageActuelle} sur {totalPages} ({taxesFiltrees.length} taxes)
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
              Modifier la taxe de séjour
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              modifier.mutate();
            }}
          >
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Date de la première nuitée</Label>
              <Input
                type="date"
                required
                value={editForm.date_nuitee}
                onChange={(e) => setEditForm({ ...editForm, date_nuitee: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Nombre de nuitées</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={editForm.nb_nuits}
                  onChange={(e) => setEditForm({ ...editForm, nb_nuits: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Montant par nuitée (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={editForm.montant_unitaire}
                  onChange={(e) =>
                    setEditForm({ ...editForm, montant_unitaire: e.target.value })
                  }
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.reverse}
                onChange={(e) => setEditForm({ ...editForm, reverse: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Taxe reversée
            </label>
            <div className="rounded-xl bg-slate-50/80 dark:bg-slate-700/50 p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Total :{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatFCFA(
                    Math.max(1, Number(editForm.nb_nuits) || 1) *
                      (Number(editForm.montant_unitaire) || 0)
                  )}
                </span>
              </p>
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
              Détail de la taxe de séjour
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const t = (taxes ?? []).find((x) => x.id === detailId);
            if (!t) return null;
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatDate(t.date_nuitee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {t.reservations?.clients?.prenom} {t.reservations?.clients?.nom}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chambre</p>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 dark:border-slate-600/50 text-slate-600 dark:text-slate-300"
                    >
                      {t.reservations?.chambres?.nom ?? "—"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nuitées</p>
                    <p className="font-medium text-2xl text-slate-900 dark:text-white">
                      {t.nb_nuits}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Montant unitaire</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatFCFA(t.montant_unitaire)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Montant total</p>
                    <p className="font-bold text-2xl text-red-600 dark:text-red-400">
                      {formatFCFA(t.montant_total)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Statut</p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold ${
                      t.reverse
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/30"
                    }`}
                  >
                    {t.reverse ? (
                      <>
                        <CheckCircle className="size-3" />
                        Reversée
                      </>
                    ) : (
                      <>
                        <Clock className="size-3" />
                        À reverser
                      </>
                    )}
                  </span>
                </div>
                {t.date_reversement && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date de reversement</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatDate(t.date_reversement)}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}