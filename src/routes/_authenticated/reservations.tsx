import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
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

  const [vue, setVue] = useState<"planning" | "liste">("planning");
  const [planningDebut, setPlanningDebut] = useState(() => today());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    chambre_id: "",
    date_arrivee: today(),
    date_depart: "",
    nb_personnes: "1",
    prix_nuit: "",
    notes: "",
    mode_paiement: "",
    montant_paye: "",
    reserve_par: "",
    numero_confirmation: "",
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
      const conflit = detecterConflit(form.chambre_id, form.date_arrivee, form.date_depart);
      if (conflit) {
        throw new Error(
          `Chambre déjà réservée du ${formatDate(conflit.date_arrivee)} au ${formatDate(conflit.date_depart)} pour cette période.`,
        );
      }
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
        mode_paiement: form.mode_paiement || null,
        montant_paye: Number(form.montant_paye) || 0,
        reserve_par: form.reserve_par || null,
        numero_confirmation: form.numero_confirmation || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      setOpen(false);
      setForm({
        client_id: "",
        chambre_id: "",
        date_arrivee: today(),
        date_depart: "",
        nb_personnes: "1",
        prix_nuit: "",
        notes: "",
        mode_paiement: "",
        montant_paye: "",
        reserve_par: "",
        numero_confirmation: "",
      });
      toast.success("Réservation créée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

const [facturerResa, setFacturerResa] = useState<Resa | null>(null);
  const [facturerForm, setFacturerForm] = useState({
    avance: "",
    buanderie: "",
    remiseType: "montant",
    remiseValeur: "",
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
      const conflit = detecterConflit(
        editForm.chambre_id,
        editForm.date_arrivee,
        editForm.date_depart,
        editId ?? undefined,
      );
      if (conflit) {
        throw new Error(
          `Chambre déjà réservée du ${formatDate(conflit.date_arrivee)} au ${formatDate(conflit.date_depart)} pour cette période.`,
        );
      }
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
    mutationFn: async ({
      r,
      avance,
      buanderie,
      remiseType,
      remiseValeur,
    }: {
      r: Resa;
      avance: number;
      buanderie: number;
      remiseType: string;
      remiseValeur: number;
    }) => {
      const nuits = nbNuits(r.date_arrivee, r.date_depart);
      const hebergement = nuits * Number(r.prix_nuit);
      const taxe = nuits * Number(r.taxe_nuit);
      const baseHT = hebergement + buanderie;
      const remise =
        remiseType === "pourcentage" ? Math.round((baseHT * remiseValeur) / 100) : remiseValeur;
      const totalNetHT = baseHT - remise;
      const totalTTC = totalNetHT + taxe;

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
          date_facture: today(),
          montant_hebergement: hebergement,
          montant_taxe: taxe,
          montant_autres: buanderie,
          montant_remise: remise,
          motif_remise:
            remise > 0 ? (remiseType === "pourcentage" ? `Remise ${remiseValeur}%` : "Remise") : null,
          montant_paye: avance,
          montant_total: totalTTC,
        })
        .select()
        .single();
      if (eFacture) throw eFacture;

      const lignes = [
        {
          facture_id: facture.id,
          libelle: `Hébergement ${r.chambres?.nom ?? ""} — ${nuits} nuit(s)`,
          quantite: nuits,
          prix_unitaire: Number(r.prix_nuit),
          montant: hebergement,
        },
      ];

      if (buanderie > 0) {
        lignes.push({
          facture_id: facture.id,
          libelle: "Service buanderie",
          quantite: 1,
          prix_unitaire: buanderie,
          montant: buanderie,
        });
      }

      if (taxe > 0) {
        lignes.push({
          facture_id: facture.id,
          libelle: `Taxe de séjour — ${nuits} nuitée(s)`,
          quantite: nuits,
          prix_unitaire: Number(r.taxe_nuit),
          montant: taxe,
        });
      }

      const { error: eLignes } = await supabase.from("facture_lignes").insert(lignes);
      if (eLignes) throw eLignes;

      if (taxe > 0) {
        const { error: eTaxe } = await supabase.from("taxes_sejour").insert({
          etablissement_id: r.etablissement_id,
          reservation_id: r.id,
          date_nuitee: r.date_arrivee,
          nb_nuits: nuits,
          montant_unitaire: Number(r.taxe_nuit),
          montant_total: taxe,
        });
        if (eTaxe) throw eTaxe;
      }

      const { error: eResa } = await supabase
        .from("reservations")
        .update({ statut: "terminee" })
        .eq("id", r.id);
      if (eResa) throw eResa;
      return numero;
    },
    onSuccess: (numero) => {
      qc.invalidateQueries();
      setFacturerResa(null);
      setFacturerForm({ avance: "", buanderie: "", remiseType: "montant", remiseValeur: "" });
      toast.success(`Séjour clôturé — facture ${numero} générée.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nuits =
    form.date_arrivee && form.date_depart ? nbNuits(form.date_arrivee, form.date_depart) : 0;
  const totalEstime = nuits * (Number(form.prix_nuit) || 0) + nuits * taxeParNuit;

  function detecterConflit(
    chambreId: string,
    dateArrivee: string,
    dateDepart: string,
    ignorerId?: string,
  ) {
    return (reservations ?? []).find(
      (r) =>
        r.id !== ignorerId &&
        r.chambre_id === chambreId &&
        r.statut !== "annulee" &&
        dateArrivee < r.date_depart &&
        dateDepart > r.date_arrivee,
    );
  }

  const conflitCreation =
    form.chambre_id && form.date_arrivee && form.date_depart
      ? detecterConflit(form.chambre_id, form.date_arrivee, form.date_depart)
      : null;

  const joursPlanning = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(planningDebut);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  function reservationPourJour(chambreId: string, jour: string) {
    return (reservations ?? []).find(
      (r) =>
        r.chambre_id === chambreId &&
        r.statut !== "annulee" &&
        jour >= r.date_arrivee &&
        jour < r.date_depart,
    );
  }

  function couleurStatutPlanning(statut: string) {
    if (statut === "en_cours") return "bg-red-500";
    if (statut === "reservee") return "bg-orange-400";
    if (statut === "terminee") return "bg-gray-300";
    return "bg-gray-200";
  }

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

                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Moyen de paiement</Label>
                    <Select
                      value={form.mode_paiement}
                      onValueChange={(v) => setForm({ ...form, mode_paiement: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="airtel_money">Airtel Money</SelectItem>
                        <SelectItem value="moov_money">Moov Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Montant déjà payé (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.montant_paye}
                      onChange={(e) => setForm({ ...form, montant_paye: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Réservé par</Label>
                    <Input
                      value={form.reserve_par}
                      onChange={(e) => setForm({ ...form, reserve_par: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° de confirmation</Label>
                    <Input
                      value={form.numero_confirmation}
                      onChange={(e) => setForm({ ...form, numero_confirmation: e.target.value })}
                    />
                  </div>
                </div>

                {conflitCreation ? (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    ⚠️ Chambre déjà réservée du {formatDate(conflitCreation.date_arrivee)} au{" "}
                    {formatDate(conflitCreation.date_depart)} pour{" "}
                    {conflitCreation.clients?.prenom} {conflitCreation.clients?.nom}.
                  </div>
                ) : null}

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p>
                    {nuits} nuit(s) — taxe de séjour {formatFCFA(taxeParNuit)} / nuitée
                  </p>
                  <p className="font-medium">Total estimé : {formatFCFA(totalEstime)}</p>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      creer.isPending ||
                      !etab ||
                      !form.client_id ||
                      !form.chambre_id ||
                      !!conflitCreation
                    }
                  >
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-1">
          <Button
            variant={vue === "planning" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVue("planning")}
          >
            <LayoutGrid className="size-4" /> Planning
          </Button>
          <Button
            variant={vue === "liste" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVue("liste")}
          >
            <List className="size-4" /> Liste
          </Button>
        </div>
        {vue === "planning" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = new Date(planningDebut);
                d.setDate(d.getDate() - 7);
                setPlanningDebut(d.toISOString().slice(0, 10));
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {formatDate(joursPlanning[0])} → {formatDate(joursPlanning[13])}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = new Date(planningDebut);
                d.setDate(d.getDate() + 7);
                setPlanningDebut(d.toISOString().slice(0, 10));
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {vue === "planning" ? (
        <Card className="mb-6">
          <CardContent className="overflow-x-auto p-4">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500" /> En cours
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-orange-400" /> Réservée
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-gray-300" /> Terminée
              </span>
            </div>
            <div style={{ minWidth: `${140 + joursPlanning.length * 70}px` }}>
              <div className="grid" style={{ gridTemplateColumns: `140px repeat(${joursPlanning.length}, 70px)` }}>
                <div className="sticky left-0 bg-card p-2 text-xs font-medium">Chambre</div>
                {joursPlanning.map((j) => (
                  <div key={j} className="border-l p-2 text-center text-xs text-muted-foreground">
                    {new Date(j).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </div>
                ))}
              </div>
              {(chambres ?? []).map((c) => (
                <div
                  key={c.id}
                  className="grid border-t"
                  style={{ gridTemplateColumns: `140px repeat(${joursPlanning.length}, 70px)` }}
                >
                  <div className="sticky left-0 bg-card p-2 text-sm font-medium">{c.nom}</div>
                  {joursPlanning.map((j) => {
                    const r = reservationPourJour(c.id, j);
                    return (
                      <div key={j} className="border-l p-1">
                        {r ? (
                          <div
                            title={`${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`}
                            className={`flex h-6 items-center justify-center truncate rounded px-1 text-[10px] font-medium text-white ${couleurStatutPlanning(r.statut)}`}
                          >
                            {r.clients?.nom ?? ""}
                          </div>
                        ) : (
                          <div className="h-6 rounded bg-green-50 dark:bg-green-950/20" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {(chambres ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucune chambre enregistrée.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditId(r.id);
                          setEditForm({
                            client_id: r.client_id,
                            chambre_id: r.chambre_id,
                            date_arrivee: r.date_arrivee,
                            date_depart: r.date_depart,
                            nb_personnes: String(r.nb_personnes),
                            prix_nuit: String(r.prix_nuit),
                            taxe_nuit: String(r.taxe_nuit),
                            statut: r.statut,
                            notes: r.notes ?? "",
                          });
                        }}
                      >
                        Modifier
                      </Button>
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
  <Button
    size="sm"
    onClick={() => {
      setFacturerResa(r);
      setFacturerForm({ avance: "", buanderie: "", remiseType: "montant", remiseValeur: "" });
    }}
  >
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
      )}

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la réservation</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              modifier.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={editForm.client_id}
                onValueChange={(v) => setEditForm({ ...editForm, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Client" />
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
                value={editForm.chambre_id}
                onValueChange={(v) => setEditForm({ ...editForm, chambre_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chambre" />
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
                  value={editForm.date_arrivee}
                  onChange={(e) => setEditForm({ ...editForm, date_arrivee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Départ</Label>
                <Input
                  type="date"
                  required
                  value={editForm.date_depart}
                  onChange={(e) => setEditForm({ ...editForm, date_depart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Personnes</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.nb_personnes}
                  onChange={(e) => setEditForm({ ...editForm, nb_personnes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prix / nuit (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.prix_nuit}
                  onChange={(e) => setEditForm({ ...editForm, prix_nuit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxe / nuitée (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.taxe_nuit}
                  onChange={(e) => setEditForm({ ...editForm, taxe_nuit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={(v) => setEditForm({ ...editForm, statut: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUTS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            {conflitEdition ? (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                ⚠️ Chambre déjà réservée du {formatDate(conflitEdition.date_arrivee)} au{" "}
                {formatDate(conflitEdition.date_depart)} pour{" "}
                {conflitEdition.clients?.prenom} {conflitEdition.clients?.nom}.
              </div>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={modifier.isPending || !!conflitEdition}>
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!facturerResa} onOpenChange={(o) => !o && setFacturerResa(null)}>
          <DialogHeader>
            <DialogTitle>Check-out & facturation</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!facturerResa) return;
              cloturer.mutate({
                r: facturerResa,
                avance: Number(facturerForm.avance) || 0,
                buanderie: Number(facturerForm.buanderie) || 0,
                remiseType: facturerForm.remiseType,
                remiseValeur: Number(facturerForm.remiseValeur) || 0,
              });
            }}
          >
            <p className="text-sm text-muted-foreground">
              {facturerResa?.clients?.prenom} {facturerResa?.clients?.nom} —{" "}
              {facturerResa?.chambres?.nom}
            </p>

            <div className="space-y-2">
              <Label>Service buanderie (FCFA) — laisser vide si aucun</Label>
              <Input
                type="number"
                min="0"
                value={facturerForm.buanderie}
                onChange={(e) => setFacturerForm({ ...facturerForm, buanderie: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de remise</Label>
                <Select
                  value={facturerForm.remiseType}
                  onValueChange={(v) => setFacturerForm({ ...facturerForm, remiseType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="montant">Montant fixe (FCFA)</SelectItem>
                    <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur de la remise — laisser vide si aucune</Label>
                <Input
                  type="number"
                  min="0"
                  value={facturerForm.remiseValeur}
                  onChange={(e) =>
                    setFacturerForm({ ...facturerForm, remiseValeur: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Avance déjà versée (FCFA) — laisser vide si aucune</Label>
              <Input
                type="number"
                min="0"
                value={facturerForm.avance}
                onChange={(e) => setFacturerForm({ ...facturerForm, avance: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={cloturer.isPending}>
                Clôturer et générer la facture
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
