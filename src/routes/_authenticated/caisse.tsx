import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
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