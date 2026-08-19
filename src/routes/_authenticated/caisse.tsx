import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, FileSpreadsheet, Download, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA, formatDateTime, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Suivi des entrées et sorties de caisse de LE DAYA Guest House, en FCFA.",
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
      const currentMonth = new Date().toISOString().slice(0, 7); // Format "YYYY-MM"
  const [mois, setMois] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [vue, setVue] = useState<"table" | "cartes">("table");
  const [sensFiltre, setSensFiltre] = useState<string>("tous");
  const [form, setForm] = useState({
    motif: "",
    montant: "",
    mode_paiement: "especes",
  });

  // Calcul dynamique du premier et dernier jour du mois sélectionné
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

  // Solde calculé spécifiquement sur le mois sélectionné (Entrées - Sorties)
  const soldePeriode = entrees - sorties;

  // Fonction d'export Excel (CSV)
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

  // Fonction d'export PDF (simple tableau HTML imprimé)
  const exporterPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const html = `
      <!DOCTYPE html>
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
            @media print {
              button { display: none; }
            }
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
                  (o) => `
                <tr>
                  <td>${new Date(o.date_operation).toLocaleString("fr-FR")}</td>
                  <td>${o.motif}</td>
                  <td>${o.mode_paiement}</td>
                  <td>${o.sens === "entree" ? "Entrée" : "Sortie"}</td>
                  <td>${formatFCFA(o.montant)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#7c2d2d;color:white;border:none;cursor:pointer;">🖨️ Imprimer</button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("Export PDF prêt à imprimer.");
  };

  // Calcul des données pour le graphique d'évolution du solde (jour par jour)
  const donneesGraphique = (() => {
    const joursDansMois = dernierJour;
    const donneesParJour: Record<string, { jour: string; entrees: number; sorties: number; solde: number }> = {};

    // Initialiser tous les jours du mois
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

    // Accumuler les opérations jour par jour
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

    // Calculer le solde cumulé jour par jour
    for (let i = 1; i <= joursDansMois; i++) {
      const jourStr = i.toString().padStart(2, "0");
      const dateStr = `${mois}-${jourStr}`;
      const data = donneesParJour[dateStr];
      soldeCumule += data.entrees - data.sorties;
      data.solde = soldeCumule;
    }

    return Object.values(donneesParJour);
  })();

  return (
    <div>
      <PageHeader
        title="Caisse"
        description="Encaissements et décaissements"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nouvelle opération
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opération de caisse</DialogTitle>
              </DialogHeader>
                            <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  ajouter.mutate();
                }}
              >
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">
                  Note : Ce formulaire sert uniquement à enregistrer une **Sortie de caisse** (dépense, décaissement). Les entrées sont générées automatiquement lors du check-out des réservations.
                </div>
                <div className="space-y-2">
                  <Label>Motif de la sortie</Label>
                  <Input
                    required
                    placeholder="Ex: Achat fournitures, maintenance..."
                    value={form.motif}
                    onChange={(e) => setForm({ ...form, motif: e.target.value })}
                  />
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
                <DialogFooter>
                  <Button type="submit" disabled={ajouter.isPending || !etab}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

                  {/* Graphique d'évolution du solde */}
      <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 via-primary to-primary/80 shadow-md">
              <TrendingUp className="size-4 text-white" />
            </div>
            <CardTitle>Évolution du solde — {mois}</CardTitle>
          </div>
          <CardDescription>Solde cumulé jour par jour (Entrées − Sorties)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donneesGraphique}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Jour du mois", position: "insideBottom", offset: -5, fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatFCFA(value)}
                  labelFormatter={(label) => `Jour ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="solde"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name="Solde"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="group flex items-center gap-3 rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-emerald-950/40 dark:to-emerald-900/20">
          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)] transition-transform group-hover:scale-110">
            <ArrowDownLeft className="size-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Entrées (période)</p>
            <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatFCFA(entrees)}
            </p>
            <p className="text-[11px] text-muted-foreground">Recettes encaissées</p>
          </div>
        </div>

        <div className="group flex items-center gap-3 rounded-xl border bg-gradient-to-br from-rose-50 to-rose-100/50 px-4 py-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-rose-950/40 dark:to-rose-900/20">
          <div className="flex size-11 items-center justify-center rounded-full bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.5)] transition-transform group-hover:scale-110">
            <ArrowUpRight className="size-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sorties (période)</p>
            <p className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatFCFA(sorties)}
            </p>
            <p className="text-[11px] text-muted-foreground">Dépenses effectuées</p>
          </div>
        </div>

        <div className="group flex items-center gap-3 rounded-xl border bg-gradient-to-br from-red-50 to-red-100/50 px-4 py-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-red-950/40 dark:to-red-900/20">
          <div className="flex size-11 items-center justify-center rounded-full bg-red-600 shadow-[0_0_16px_rgba(220,38,38,0.5)] transition-transform group-hover:scale-110">
            <Wallet className="size-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Solde du mois</p>
            <p
              className={`font-display text-2xl font-bold ${soldePeriode >= 0 ? "text-red-700 dark:text-red-400" : "text-rose-600"}`}
            >
              {formatFCFA(soldePeriode)}
            </p>
            <p className="text-[11px] text-muted-foreground">Entrées − Sorties</p>
          </div>
        </div>
      </div>
           <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={vue === "table" ? "default" : "outline"}
            onClick={() => setVue("table")}
          >
            Tableau
          </Button>
          <Button
            size="sm"
            variant={vue === "cartes" ? "default" : "outline"}
            onClick={() => setVue("cartes")}
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
          >
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exporterPDF}
            disabled={filteredOperations.length === 0}
          >
            <Download className="size-4" />
            PDF
          </Button>
          <Select value={sensFiltre} onValueChange={setSensFiltre}>
            <SelectTrigger className="w-[160px]">
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
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1 flex-1 min-w-[240px]">
          <Label className="text-xs">Rechercher une opération</Label>
          <Input
            placeholder="Filtrer par motif, mode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois et Année</Label>
          <Input
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
          />
        </div>
      </div>

      {vue === "table" ? (
        <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/20">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Sens</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperations.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(o.date_operation)}
                    </TableCell>
                    <TableCell>{o.motif}</TableCell>
                    <TableCell>{o.mode_paiement}</TableCell>
                    <TableCell>
                      <Badge variant={o.sens === "entree" ? "secondary" : "destructive"}>
                        {o.sens === "entree" ? "Entrée" : "Sortie"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatFCFA(o.montant)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
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
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Êtes-vous sûr de vouloir supprimer cette opération de caisse ?")) {
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
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucune opération trouvée.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOperations.map((o) => (
            <Card key={o.id} className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={o.sens === "entree" ? "secondary" : "destructive"}>
                    {o.sens === "entree" ? "Entrée" : "Sortie"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(o.date_operation)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{o.motif}</h4>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">Mode : {o.mode_paiement}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className={`font-display text-lg font-bold ${o.sens === "entree" ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatFCFA(o.montant)}
                  </span>
                  <div className="space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
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
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Êtes-vous sûr de vouloir supprimer cette opération de caisse ?")) {
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
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Aucune opération trouvée.
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'opération</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              modifier.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Date et heure</Label>
              <Input
                type="datetime-local"
                required
                value={editForm.date_operation}
                onChange={(e) => setEditForm({ ...editForm, date_operation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sens</Label>
              <Select
                value={editForm.sens}
                onValueChange={(v) => setEditForm({ ...editForm, sens: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entree">Entrée</SelectItem>
                  <SelectItem value="sortie">Sortie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input
                required
                value={editForm.motif}
                onChange={(e) => setEditForm({ ...editForm, motif: e.target.value })}
              />
            </div>
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
            <DialogFooter>
              <Button type="submit" disabled={modifier.isPending}>
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}