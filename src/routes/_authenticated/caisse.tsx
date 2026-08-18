import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
  const [debut, setDebut] = useState(today());
  const [fin, setFin] = useState(today());
    const [form, setForm] = useState({
    sens: "entree",
    motif: "",
    montant: "",
    mode_paiement: "especes",
    reservation_id: "",
  });

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

  const { data: soldeGlobal } = useQuery({
    queryKey: ["caisse-solde"],
    queryFn: async () => {
      const { data, error } = await supabase.from("caisse_operations").select("sens, montant");
      if (error) throw error;
      return (data ?? []).reduce(
        (s, o) => s + (o.sens === "entree" ? Number(o.montant) : -Number(o.montant)),
        0,
      );
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

    const ajouter = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("caisse_operations").insert({
        etablissement_id: etab!.id,
        sens: form.sens,
        motif: form.motif,
        montant: Number(form.montant),
        mode_paiement: form.mode_paiement,
        created_by: u.user?.id ?? null,
        reservation_id: form.reservation_id ? form.reservation_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({ sens: "entree", motif: "", montant: "", mode_paiement: "especes", reservation_id: "" });
      toast.success("Opération enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const entrees = (operations ?? [])
    .filter((o) => o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);
  const sorties = (operations ?? [])
    .filter((o) => o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);

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
                <div className="space-y-2">
                  <Label>Sens</Label>
                  <Select value={form.sens} onValueChange={(v) => setForm({ ...form, sens: v })}>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entrées (période)</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-success">
            {formatFCFA(entrees)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sorties (période)</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-destructive">
            {formatFCFA(sorties)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Solde de caisse global</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold">
            {formatFCFA(soldeGlobal ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>

      <Card>
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
              {(operations ?? []).map((o) => (
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
                  <TableCell className="text-right whitespace-nowrap">
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
                  </TableCell>
                </TableRow>
              ))}
              {(operations ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune opération sur la période.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
