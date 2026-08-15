import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { formatFCFA, formatDate, nbNuits, today } from "@/lib/format";
import { useEtablissement, useParametres } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [
      { title: "Réservations — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Créez et suivez les réservations de LE DAYA Guest House : arrivées, séjours en cours et départs.",
      },
      { property: "og:title", content: "Réservations — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Planning des séjours et check-in / check-out." },
    ],
  }),
  component: ReservationsPage,
});

const STATUTS: Record<string, string> = {
  reservee: "Réservée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

function ReservationsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const taxeParNuit = Number(params?.["taxe_sejour_montant"] ?? 1000);
  const prefixeFacture = params?.["prefixe_facture"] ?? "FAC";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    chambre_id: "",
    date_arrivee: today(),
    date_depart: "",
    nb_personnes: "1",
    prix_nuit: "",
    notes: "",
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, clients(nom, prenom), chambres(nom, prix_nuit)")
        .order("date_arrivee", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: chambres } = useQuery({
    queryKey: ["chambres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chambres")
        .select("*")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const creer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reservations").insert({
        etablissement_id: etab!.id,
        client_id: form.client_id,
        chambre_id: form.chambre_id,
        date_arrivee: form.date_arrivee,
        date_depart: form.date_depart,
        nb_personnes: Number(form.nb_personnes),
        prix_nuit: Number(form.prix_nuit),
        taxe_nuit: taxeParNuit,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      setOpen(false);
      toast.success("Réservation créée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    client_id: "",
    chambre_id: "",
    date_arrivee: "",
    date_depart: "",
    nb_personnes: "1",
    prix_nuit: "",
    taxe_nuit: "",
    statut: "reservee",
    notes: "",
  });

  const modifier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reservations")
        .update({
          client_id: editForm.client_id,
          chambre_id: editForm.chambre_id,
          date_arrivee: editForm.date_arrivee,
          date_depart: editForm.date_depart,
          nb_personnes: Number(editForm.nb_personnes),
          prix_nuit: Number(editForm.prix_nuit),
          taxe_nuit: Number(editForm.taxe_nuit),
          statut: editForm.statut,
          notes: editForm.notes || null,
        })
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditId(null);
      toast.success("Réservation modifiée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("reservations").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Réservation mise à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  type Resa = NonNullable<typeof reservations>[number];

  const cloturer = useMutation({
    mutationFn: async (r: Resa) => {
      const nuits = nbNuits(r.date_arrivee, r.date_depart);
      const hebergement = nuits * Number(r.prix_nuit);
      const taxe = nuits * Number(r.taxe_nuit);
      const { count } = await supabase
        .from("factures")
        .select("id", { count: "exact", head: true });
      const numero = `${prefixeFacture}-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data: facture, error: eFacture } = await supabase
        .from("factures")
        .insert({
          etablissement_id: r.etablissement_id,
          numero,
          reservation_id: r.id,
          client_id: r.client_id,
          montant_hebergement: hebergement,
          montant_taxe: taxe,
          montant_total: hebergement + taxe,
        })
        .select()
        .single();
      if (eFacture) throw eFacture;

      const { error: eLignes } = await supabase.from("facture_lignes").insert([
        {
          facture_id: facture.id,
          libelle: `Hébergement ${r.chambres?.nom ?? ""} — ${nuits} nuit(s)`,
          quantite: nuits,
          prix_unitaire: Number(r.prix_nuit),
          montant: hebergement,
        },
        {
          facture_id: facture.id,
          libelle: `Taxe de séjour — ${nuits} nuitée(s)`,
          quantite: nuits,
          prix_unitaire: Number(r.taxe_nuit),
          montant: taxe,
        },
      ]);
      if (eLignes) throw eLignes;

      const { error: eTaxe } = await supabase.from("taxes_sejour").insert({
        etablissement_id: r.etablissement_id,
        reservation_id: r.id,
        date_nuitee: r.date_arrivee,
        nb_nuits: nuits,
        montant_unitaire: Number(r.taxe_nuit),
        montant_total: taxe,
      });
      if (eTaxe) throw eTaxe;

      const { error: eResa } = await supabase
        .from("reservations")
        .update({ statut: "terminee" })
        .eq("id", r.id);
      if (eResa) throw eResa;
      return numero;
    },
    onSuccess: (numero) => {
      qc.invalidateQueries();
      toast.success(`Séjour clôturé — facture ${numero} générée.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nuits =
    form.date_arrivee && form.date_depart ? nbNuits(form.date_arrivee, form.date_depart) : 0;
  const totalEstime = nuits * (Number(form.prix_nuit) || 0) + nuits * taxeParNuit;

  return (
    <div>
      <PageHeader
        title="Réservations"
        description="Séjours réservés, en cours et terminés"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nouvelle réservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle réservation</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  creer.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={form.client_id}
                    onValueChange={(v) => setForm({ ...form, client_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.prenom} {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chambre</Label>
                  <Select
                    value={form.chambre_id}
                    onValueChange={(v) => {
                      const ch = (chambres ?? []).find((c) => c.id === v);
                      setForm({ ...form, chambre_id: v, prix_nuit: String(ch?.prix_nuit ?? "") });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une chambre" />
                    </SelectTrigger>
                    <SelectContent>
                      {(chambres ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom} — {formatFCFA(c.prix_nuit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Arrivée</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_arrivee}
                      onChange={(e) => setForm({ ...form, date_arrivee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Départ</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_depart}
                      onChange={(e) => setForm({ ...form, date_depart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personnes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.nb_personnes}
                      onChange={(e) => setForm({ ...form, nb_personnes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix / nuit (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.prix_nuit}
                      onChange={(e) => setForm({ ...form, prix_nuit: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p>
                    {nuits} nuit(s) — taxe de séjour {formatFCFA(taxeParNuit)} / nuitée
                  </p>
                  <p className="font-medium">Total estimé : {formatFCFA(totalEstime)}</p>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={creer.isPending || !etab || !form.client_id || !form.chambre_id}
                  >
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Chambre</TableHead>
                <TableHead>Séjour</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reservations ?? []).map((r) => {
                const n = nbNuits(r.date_arrivee, r.date_depart);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.clients?.prenom} {r.clients?.nom}
                    </TableCell>
                    <TableCell>{r.chambres?.nom}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.date_arrivee)} → {formatDate(r.date_depart)}
                      <span className="block text-xs text-muted-foreground">{n} nuit(s)</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatFCFA(n * Number(r.prix_nuit) + n * Number(r.taxe_nuit))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.statut === "annulee" ? "destructive" : "secondary"}>
                        {STATUTS[r.statut] ?? r.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right whitespace-nowrap">
                      {r.statut === "reservee" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              changerStatut.mutate({ id: r.id, statut: "en_cours" })
                            }
                          >
                            Check-in
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => changerStatut.mutate({ id: r.id, statut: "annulee" })}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : null}
                      {r.statut === "en_cours" ? (
                        <Button size="sm" onClick={() => cloturer.mutate(r)}>
                          Check-out & facturer
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(reservations ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune réservation enregistrée.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
