import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  FileSpreadsheet,
  Download,
  TrendingUp,
  X,
  TrendingDown,
  Minus,
  CalendarDays,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatFCFA, formatDateTime, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Suivi des entrées et sorties de caisse de LE DAYA Guest House, en FCFA.",
      },
      { property: "og:title", content: "Caisse — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Mouvements et solde de caisse au quotidien." },
    ],
  }),
  component: CaissePage,
});

function CaissePage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const [open, setOpen] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [mois, setMois] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [vue, setVue] = useState<"table" | "cartes">("table");
  const [sensFiltre, setSensFiltre] = useState<string>("tous");
  const [form, setForm] = useState({
    motif: "",
    montant: "",
    mode_paiement: "especes",
  });

  const [annee, numMois] = mois.split("-");
  const dernierJour = new Date(Number(annee), Number(numMois), 0).getDate();
  const debut = `${mois}-01`;
  const fin = `${mois}-${dernierJour}`;

  const { data: operations } = useQuery({
    queryKey: ["caisse", debut, fin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisse_operations")
        .select("*")
        .gte("date_operation", `${debut}T00:00:00`)
        .lte("date_operation", `${fin}T23:59:59`)
        .order("date_operation", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations-select-caisse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    sens: "entree",
    motif: "",
    montant: "",
    mode_paiement: "especes",
    date_operation: "",
  });

  const modifier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("caisse_operations")
        .update({
          sens: editForm.sens,
          motif: editForm.motif,
          montant: Number(editForm.montant),
          mode_paiement: editForm.mode_paiement,
          date_operation: new Date(editForm.date_operation).toISOString(),
        })
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditId(null);
      toast.success("Opération modifiée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caisse_operations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Opération supprimée avec succès.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ajouter = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("caisse_operations").insert({
        etablissement_id: etab!.id,
        sens: "sortie",
        motif: form.motif,
        montant: Number(form.montant),
        mode_paiement: form.mode_paiement,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({ motif: "", montant: "", mode_paiement: "especes" });
      toast.success("Sortie de caisse enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredOperations = (operations ?? []).filter((o) => {
    const matchSearch =
      o.motif.toLowerCase().includes(search.toLowerCase()) ||
      o.mode_paiement.toLowerCase().includes(search.toLowerCase());
    const matchSens = sensFiltre === "tous" || o.sens === sensFiltre;
    return matchSearch && matchSens;
  });

  const entrees = (operations ?? [])
    .filter((o) => o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);
  const sorties = (operations ?? [])
    .filter((o) => o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);
  const soldePeriode = entrees - sorties;

  const exporterExcel = () => {
    const headers = ["Date", "Motif", "Mode de paiement", "Sens", "Montant (FCFA)"];
    const rows = filteredOperations.map((o) => [
      new Date(o.date_operation).toLocaleString("fr-FR"),
      o.motif,
      o.mode_paiement,
      o.sens === "entree" ? "Entrée" : "Sortie",
      o.montant,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell ?? ''}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caisse_${mois}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel téléchargé.");
  };

  const exporterPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Export Caisse - ${mois}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #7c2d2d; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #7c2d2d; color: white; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .total { font-weight: bold; margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>LE DAYA Guest House - Export Caisse</h1>
    <p>Période : ${mois}</p>
    <p class="total">Total Entrées : ${formatFCFA(entrees)} | Total Sorties : ${formatFCFA(sorties)} | Solde : ${formatFCFA(soldePeriode)}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Motif</th>
          <th>Mode</th>
          <th>Sens</th>
          <th>Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        ${filteredOperations
          .map(
            (o) => `<tr>
          <td>${new Date(o.date_operation).toLocaleString("fr-FR")}</td>
          <td>${o.motif}</td>
          <td>${o.mode_paiement}</td>
          <td>${o.sens === "entree" ? "Entrée" : "Sortie"}</td>
          <td>${formatFCFA(o.montant)}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#7c2d2d;color:white;border:none;cursor:pointer;">Imprimer</button>
  </body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("Export PDF prêt à imprimer.");
  };

  const donneesGraphique = (() => {
    const joursDansMois = dernierJour;
    const donneesParJour: Record<
      string,
      { jour: string; entrees: number; sorties: number; solde: number }
    > = {};

    for (let i = 1; i <= joursDansMois; i++) {
      const jourStr = i.toString().padStart(2, "0");
      const dateStr = `${mois}-${jourStr}`;
      donneesParJour[dateStr] = {
        jour: jourStr,
        entrees: 0,
        sorties: 0,
        solde: 0,
      };
    }

    let soldeCumule = 0;
    (operations ?? []).forEach((o) => {
      const dateOp = new Date(o.date_operation);
      const jourStr = dateOp.getDate().toString().padStart(2, "0");
      const dateStr = `${mois}-${jourStr}`;

      if (donneesParJour[dateStr]) {
        if (o.sens === "entree") {
          donneesParJour[dateStr].entrees += Number(o.montant);
        } else {
          donneesParJour[dateStr].sorties += Number(o.montant);
        }
      }
    });

    for (let i = 1; i <= joursDansMois; i++) {
      const jourStr = i.toString().padStart(2, "0");
      const dateStr = `${mois}-${jourStr}`;
      const data = donneesParJour[dateStr];
      soldeCumule += data.entrees - data.sorties;
      data.solde = soldeCumule;
    }

    return Object.values(donneesParJour);
  })();

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const entreesAujourdhui = (operations ?? [])
    .filter((o) => o.date_operation.startsWith(aujourdhui) && o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);

  const entreesHier = (operations ?? [])
    .filter((o) => o.date_operation.startsWith(hier) && o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);

  const sortiesAujourdhui = (operations ?? [])
    .filter((o) => o.date_operation.startsWith(aujourdhui) && o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);

  const sortiesHier = (operations ?? [])
    .filter((o) => o.date_operation.startsWith(hier) && o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);

  const variationEntrees =
    entreesHier > 0 ? ((entreesAujourdhui - entreesHier) / entreesHier) * 100 : 0;
  const variationSorties =
    sortiesHier > 0 ? ((sortiesAujourdhui - sortiesHier) / sortiesHier) * 100 : 0;
  const variationSolde =
    entreesHier > 0
      ? ((entreesAujourdhui - sortiesAujourdhui - (entreesHier - sortiesHier)) /
          (entreesHier - sortiesHier)) *
        100
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caisse"
        description="Encaissements et décaissements"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                <Plus className="size-4 mr-2" /> Nouvelle opération
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Opération de caisse
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  ajouter.mutate();
                }}
              >
                <div className="rounded-2xl bg-red-50/80 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200/30">
                  <span className="font-medium">📌 Note :</span> Ce formulaire sert uniquement
                  à enregistrer une <strong>Sortie de caisse</strong> (dépense, décaissement).
                  Les entrées sont générées automatiquement lors du check-out.
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Motif de la sortie</Label>
                  <Input
                    required
                    placeholder="Ex: Achat fournitures, maintenance..."
                    value={form.motif}
                    onChange={(e) => setForm({ ...form, motif: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
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
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={ajouter.isPending || !etab}
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
          GRAPHIQUE ÉVOLUTION DU SOLDE
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25">
              <TrendingUp className="size-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                Évolution du solde — {mois}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Solde cumulé jour par jour (Entrées − Sorties)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donneesGraphique}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  label={{
                    value: "Jour du mois",
                    position: "insideBottom",
                    offset: -5,
                    fontSize: 11,
                    fill: "#94A3B8",
                  }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                />
                <Tooltip
                  formatter={(value: number) => formatFCFA(value)}
                  labelFormatter={(label) => `Jour ${label}`}
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(226,232,240,0.8)",
                    borderRadius: "12px",
                    backdropFilter: "blur(12px)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="solde"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: "#ef4444", r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#ef4444" }}
                  name="Solde"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          STATISTIQUES - 3 CARTES KPI
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
              <ArrowDownLeft className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Entrées
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatFCFA(entrees)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {variationEntrees > 0 ? (
                  <TrendingUp className="size-3 text-emerald-600" />
                ) : variationEntrees < 0 ? (
                  <TrendingDown className="size-3 text-rose-600" />
                ) : (
                  <Minus className="size-3 text-slate-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    variationEntrees > 0
                      ? "text-emerald-600"
                      : variationEntrees < 0
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {variationEntrees > 0 ? "+" : ""}
                  {variationEntrees.toFixed(1)}% vs hier
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 transition-transform group-hover:scale-110">
              <ArrowUpRight className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sorties
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatFCFA(sorties)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {variationSorties > 0 ? (
                  <TrendingUp className="size-3 text-amber-600" />
                ) : variationSorties < 0 ? (
                  <TrendingDown className="size-3 text-emerald-600" />
                ) : (
                  <Minus className="size-3 text-slate-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    variationSorties > 0
                      ? "text-amber-600"
                      : variationSorties < 0
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  {variationSorties > 0 ? "+" : ""}
                  {variationSorties.toFixed(1)}% vs hier
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
              <Wallet className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Solde
              </p>
              <p
                className={`font-display text-2xl font-bold ${
                  soldePeriode >= 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatFCFA(soldePeriode)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {variationSolde > 0 ? (
                  <TrendingUp className="size-3 text-emerald-600" />
                ) : variationSolde < 0 ? (
                  <TrendingDown className="size-3 text-rose-600" />
                ) : (
                  <Minus className="size-3 text-slate-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    variationSolde > 0
                      ? "text-emerald-600"
                      : variationSolde < 0
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {variationSolde > 0 ? "+" : ""}
                  {variationSolde.toFixed(1)}% vs hier
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          FILTRES ET RECHERCHE
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1">
          <Button
            size="sm"
            variant={vue === "table" ? "default" : "ghost"}
            onClick={() => setVue("table")}
            className={vue === "table" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            Tableau
          </Button>
          <Button
            size="sm"
            variant={vue === "cartes" ? "default" : "ghost"}
            onClick={() => setVue("cartes")}
            className={vue === "cartes" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            Cartes
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exporterExcel}
            disabled={filteredOperations.length === 0}
            className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
          >
            <FileSpreadsheet className="size-4 mr-1.5" />
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exporterPDF}
            disabled={filteredOperations.length === 0}
            className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
          >
            <Download className="size-4 mr-1.5" />
            PDF
          </Button>
          <Select value={sensFiltre} onValueChange={setSensFiltre}>
            <SelectTrigger className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
              <SelectValue placeholder="Tous les sens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les sens</SelectItem>
              <SelectItem value="entree">Entrées uniquement</SelectItem>
              <SelectItem value="sortie">Sorties uniquement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtres actifs */}
      {(search || sensFiltre !== "tous") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtres actifs :
          </span>
          {search && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Recherche : {search}
              <button
                onClick={() => setSearch("")}
                className="ml-1 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {sensFiltre !== "tous" && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Sens : {sensFiltre === "entree" ? "Entrées" : "Sorties"}
              <button
                onClick={() => setSensFiltre("tous")}
                className="ml-1 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            onClick={() => {
              setSearch("");
              setSensFiltre("tous");
            }}
          >
            Tout effacer
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs text-slate-500 dark:text-slate-400">Rechercher</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Motif, mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400">Mois</Label>
          <Input
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LISTE DES OPÉRATIONS
          ═══════════════════════════════════════════════════════ */}
      {vue === "table" ? (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Motif
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Mode
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Sens
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
                {filteredOperations.map((o) => (
                  <TableRow
                    key={o.id}
                    className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                  >
                    <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDateTime(o.date_operation)}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{o.motif}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 capitalize">
                      {o.mode_paiement}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                          o.sens === "entree"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                        }`}
                      >
                        {o.sens === "entree" ? "Entrée" : "Sortie"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-right whitespace-nowrap font-medium ${
                        o.sens === "entree"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatFCFA(o.montant)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => {
                          setEditId(o.id);
                          setEditForm({
                            sens: o.sens,
                            motif: o.motif,
                            montant: String(o.montant),
                            mode_paiement: o.mode_paiement,
                            date_operation: new Date(o.date_operation)
                              .toISOString()
                              .slice(0, 16),
                          });
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25"
                        onClick={() => {
                          if (
                            confirm(
                              "Êtes-vous sûr de vouloir supprimer cette opération de caisse ?"
                            )
                          ) {
                            supprimer.mutate(o.id);
                          }
                        }}
                        disabled={supprimer.isPending}
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOperations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-slate-400 dark:text-slate-500"
                    >
                      Aucune opération trouvée.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOperations.map((o) => (
            <Card
              key={o.id}
              className="group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-lg"
            >
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      o.sens === "entree"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                    }`}
                  >
                    {o.sens === "entree" ? "Entrée" : "Sortie"}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDateTime(o.date_operation)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    {o.motif}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize">
                    Mode : {o.mode_paiement}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <span
                    className={`font-display text-lg font-bold ${
                      o.sens === "entree"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatFCFA(o.montant)}
                  </span>
                  <div className="space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => {
                        setEditId(o.id);
                        setEditForm({
                          sens: o.sens,
                          motif: o.motif,
                          montant: String(o.montant),
                          mode_paiement: o.mode_paiement,
                          date_operation: new Date(o.date_operation)
                            .toISOString()
                            .slice(0, 16),
                        });
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25"
                      onClick={() => {
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir supprimer cette opération de caisse ?"
                          )
                        ) {
                          supprimer.mutate(o.id);
                        }
                      }}
                      disabled={supprimer.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredOperations.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-slate-400 dark:text-slate-500">
              Aucune opération trouvée.
            </div>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DIALOG MODIFICATION
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Modifier l'opération
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
              <Label className="text-slate-700 dark:text-slate-300">Date et heure</Label>
              <Input
                type="datetime-local"
                required
                value={editForm.date_operation}
                onChange={(e) => setEditForm({ ...editForm, date_operation: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Sens</Label>
              <Select
                value={editForm.sens}
                onValueChange={(v) => setEditForm({ ...editForm, sens: v })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entree">Entrée</SelectItem>
                  <SelectItem value="sortie">Sortie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Motif</Label>
              <Input
                required
                value={editForm.motif}
                onChange={(e) => setEditForm({ ...editForm, motif: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Montant (FCFA)</Label>
              <Input
                type="number"
                min="0"
                required
                value={editForm.montant}
                onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Mode de paiement</Label>
              <Select
                value={editForm.mode_paiement}
                onValueChange={(v) => setEditForm({ ...editForm, mode_paiement: v })}
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
    </div>
  );
}