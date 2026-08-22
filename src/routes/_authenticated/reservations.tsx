import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
  Rows3,
  CalendarPlus,
  Users,
  BedDouble,
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
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

const STATUTS: Record<string, { label: string; badge: string }> = {
  reservee: {
    label: "Réservée",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200/30",
  },
  en_cours: {
    label: "En cours",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200/30",
  },
  terminee: {
    label: "Terminée",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200/30",
  },
  annulee: {
    label: "Annulée",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200/30",
  },
};

function ReservationsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const taxeParNuit = Number(params?.["taxe_sejour_montant"] ?? 1000);
  const prefixeFacture = params?.["prefixe_facture"] ?? "FAC";

  const [vue, setVue] = useState<"planning" | "liste">("planning");
  const [sousVueListe, setSousVueListe] = useState<"tableau" | "cartes">("tableau");
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
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
          `Chambre déjà réservée du ${formatDate(conflit.date_arrivee)} au ${formatDate(
            conflit.date_depart
          )} pour cette période.`
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
        editId ?? undefined
      );
      if (conflit) {
        throw new Error(
          `Chambre déjà réservée du ${formatDate(conflit.date_arrivee)} au ${formatDate(
            conflit.date_depart
          )} pour cette période.`
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

  const [prolongerResa, setProlongerResa] = useState<Resa | null>(null);
  const [nouvelleDatePeriode, setNouvelleDatePeriode] = useState("");

  const prolonger = useMutation({
    mutationFn: async () => {
      if (!prolongerResa) return;
      const conflit = detecterConflit(
        prolongerResa.chambre_id,
        prolongerResa.date_arrivee,
        nouvelleDatePeriode,
        prolongerResa.id
      );
      if (conflit) {
        throw new Error(
          `Impossible : chambre déjà réservée à partir du ${formatDate(conflit.date_arrivee)}.`
        );
      }
      const { error } = await supabase
        .from("reservations")
        .update({ date_depart: nouvelleDatePeriode })
        .eq("id", prolongerResa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      setProlongerResa(null);
      setNouvelleDatePeriode("");
      toast.success("Séjour prolongé.");
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
      const numero = `${prefixeFacture}-${new Date().getFullYear()}-${String(
        (count ?? 0) + 1
      ).padStart(4, "0")}`;

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
    ignorerId?: string
  ) {
    return (reservations ?? []).find(
      (r) =>
        r.id !== ignorerId &&
        r.chambre_id === chambreId &&
        r.statut !== "annulee" &&
        dateArrivee < r.date_depart &&
        dateDepart > r.date_arrivee
    );
  }

  const conflitCreation =
    form.chambre_id && form.date_arrivee && form.date_depart
      ? detecterConflit(form.chambre_id, form.date_arrivee, form.date_depart)
      : null;

  const conflitEdition =
    editForm.chambre_id && editForm.date_arrivee && editForm.date_depart
      ? detecterConflit(
          editForm.chambre_id,
          editForm.date_arrivee,
          editForm.date_depart,
          editId ?? undefined
        )
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
        jour < r.date_depart
    );
  }

  function couleurStatutPlanning(statut: string) {
    if (statut === "en_cours") return "bg-gradient-to-br from-emerald-500 to-emerald-600";
    if (statut === "reservee") return "bg-gradient-to-br from-amber-500 to-amber-600";
    if (statut === "terminee") return "bg-gradient-to-br from-blue-500 to-blue-600";
    return "bg-gradient-to-br from-gray-400 to-gray-500";
  }

  const reservationsFiltrees = (reservations ?? []).filter((r) => {
    const q = recherche.trim().toLowerCase();
    const matchRecherche =
      !q ||
      `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""} ${r.chambres?.nom ?? ""}`
        .toLowerCase()
        .includes(q);
    const matchStatut = filtreStatut === "tous" || r.statut === filtreStatut;
    return matchRecherche && matchStatut;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réservations"
        description="Séjours réservés, en cours et terminés"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                <Plus className="size-4 mr-2" /> Nouvelle réservation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Nouvelle réservation
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  creer.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Client</Label>
                  <Select
                    value={form.client_id}
                    onValueChange={(v) => setForm({ ...form, client_id: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                  <Label className="text-slate-700 dark:text-slate-300">Chambre</Label>
                  <Select
                    value={form.chambre_id}
                    onValueChange={(v) => {
                      const ch = (chambres ?? []).find((c) => c.id === v);
                      setForm({ ...form, chambre_id: v, prix_nuit: String(ch?.prix_nuit ?? "") });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                    <Label className="text-slate-700 dark:text-slate-300">Arrivée</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_arrivee}
                      onChange={(e) => setForm({ ...form, date_arrivee: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Départ</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_depart}
                      onChange={(e) => setForm({ ...form, date_depart: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Personnes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.nb_personnes}
                      onChange={(e) => setForm({ ...form, nb_personnes: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Prix / nuit (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.prix_nuit}
                      onChange={(e) => setForm({ ...form, prix_nuit: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>

                <div className="grid gap-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Moyen de paiement</Label>
                    <Select
                      value={form.mode_paiement}
                      onValueChange={(v) => setForm({ ...form, mode_paiement: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                    <Label className="text-slate-700 dark:text-slate-300">Montant déjà payé (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.montant_paye}
                      onChange={(e) => setForm({ ...form, montant_paye: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Réservé par</Label>
                    <Input
                      value={form.reserve_par}
                      onChange={(e) => setForm({ ...form, reserve_par: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">N° de confirmation</Label>
                    <Input
                      value={form.numero_confirmation}
                      onChange={(e) => setForm({ ...form, numero_confirmation: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                {conflitCreation ? (
                  <div className="rounded-xl border border-red-200/50 bg-red-50/80 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠️ Chambre déjà réservée du {formatDate(conflitCreation.date_arrivee)} au{" "}
                    {formatDate(conflitCreation.date_depart)} pour{" "}
                    {conflitCreation.clients?.prenom} {conflitCreation.clients?.nom}.
                  </div>
                ) : null}

                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-700/50 p-4 text-sm backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50">
                  <p className="text-slate-600 dark:text-slate-300">
                    {nuits} nuit(s) — taxe de séjour {formatFCFA(taxeParNuit)} / nuitée
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    Total estimé : {formatFCFA(totalEstime)}
                  </p>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <Button
            variant={vue === "planning" ? "default" : "ghost"}
            size="sm"
            onClick={() => setVue("planning")}
            className={vue === "planning" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            <LayoutGrid className="size-4" /> Planning
          </Button>
          <Button
            variant={vue === "liste" ? "default" : "ghost"}
            size="sm"
            onClick={() => setVue("liste")}
            className={vue === "liste" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            <List className="size-4" /> Liste
          </Button>
        </div>
        {vue === "planning" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              onClick={() => {
                const d = new Date(planningDebut);
                d.setDate(d.getDate() - 7);
                setPlanningDebut(d.toISOString().slice(0, 10));
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatDate(joursPlanning[0])} → {formatDate(joursPlanning[13])}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
    <CardContent className="p-5">
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> En cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" /> Réservée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500" /> Terminée
        </span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${140 + joursPlanning.length * 70}px` }}>
          <div
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${joursPlanning.length}, 70px)` }}
          >
            <div className="sticky left-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Chambre
            </div>
            {joursPlanning.map((j) => (
              <div
                key={j}
                className="border-l border-slate-200/50 dark:border-slate-700/50 p-2 text-center text-xs text-slate-400 dark:text-slate-500"
              >
                {new Date(j).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </div>
            ))}
          </div>
          {(chambres ?? []).map((c) => (
            <div
              key={c.id}
              className="grid border-t border-slate-200/50 dark:border-slate-700/50"
              style={{ gridTemplateColumns: `140px repeat(${joursPlanning.length}, 70px)` }}
            >
              <div className="sticky left-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {c.nom}
              </div>
              {joursPlanning.map((j) => {
                const r = reservationPourJour(c.id, j);
                return (
                  <div key={j} className="border-l border-slate-200/50 dark:border-slate-700/50 p-1">
                    {r ? (
                      <div
                        title={`${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`}
                        className={`flex h-7 items-center justify-center truncate rounded-xl px-1 text-[10px] font-medium text-white shadow-sm ${couleurStatutPlanning(r.statut)}`}
                      >
                        {r.clients?.nom ?? ""}
                      </div>
                    ) : (
                      <div className="h-7 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {(chambres ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Aucune chambre enregistrée.
            </p>
          ) : null}
        </div>
      </div>
    </CardContent>
  </Card>
) : null}
   ) :(
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Rechercher client ou chambre…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <Select value={filtreStatut} onValueChange={setFiltreStatut}>
              <SelectTrigger className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {Object.entries(STATUTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <Button
                variant={sousVueListe === "tableau" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSousVueListe("tableau")}
                className={sousVueListe === "tableau" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
              >
                <Rows3 className="size-4" />
              </Button>
              <Button
                variant={sousVueListe === "cartes" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSousVueListe("cartes")}
                className={sousVueListe === "cartes" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>

          {sousVueListe === "cartes" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reservationsFiltrees.map((r) => {
                const n = nbNuits(r.date_arrivee, r.date_depart);
                return (
                  <Card
                    key={r.id}
                    className="group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-lg"
                  >
                    <CardContent className="space-y-3.5 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                            {r.clients?.prenom} {r.clients?.nom}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {r.chambres?.nom}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${STATUTS[r.statut]?.badge || STATUTS.reservee.badge}`}>
                          {STATUTS[r.statut]?.label || r.statut}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <CalendarDays className="size-4" />
                        {formatDate(r.date_arrivee)} → {formatDate(r.date_depart)}
                        <span className="text-xs">({n} nuit(s))</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="size-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-300">{r.nb_personnes} pers.</span>
                      </div>
                      <p className="text-lg font-bold text-red-500">
                        {formatFCFA(n * Number(r.prix_nuit) + n * Number(r.taxe_nuit))}
                      </p>
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500 dark:hover:text-emerald-400"
                              onClick={() =>
                                changerStatut.mutate({ id: r.id, statut: "en_cours" })
                              }
                            >
                              <CheckCircle className="size-3.5 mr-1" /> Check-in
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                              onClick={() =>
                                changerStatut.mutate({ id: r.id, statut: "annulee" })
                              }
                            >
                              <XCircle className="size-3.5 mr-1" /> Annuler
                            </Button>
                          </>
                        ) : null}
                        {r.statut === "en_cours" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={() => {
                                setProlongerResa(r);
                                setNouvelleDatePeriode(r.date_depart);
                              }}
                            >
                              <CalendarPlus className="size-3.5 mr-1" /> Prolonger
                            </Button>
                            <Button
                              size="sm"
                              className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-xl"
                              onClick={() => {
                                setFacturerResa(r);
                                setFacturerForm({
                                  avance: "",
                                  buanderie: "",
                                  remiseType: "montant",
                                  remiseValeur: "",
                                });
                              }}
                            >
                              Check-out & facturer
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {reservationsFiltrees.length === 0 ? (
                <p className="col-span-full py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                  Aucune réservation trouvée.
                </p>
              ) : null}
            </div>
          ) : (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                      <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                        Client
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                        Chambre
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                        Séjour
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                        Personnes
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
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
                    {reservationsFiltrees.map((r) => {
                      const n = nbNuits(r.date_arrivee, r.date_depart);
                      return (
                        <TableRow
                          key={r.id}
                          className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {r.clients?.prenom} {r.clients?.nom}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {r.chambres?.nom}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {formatDate(r.date_arrivee)} → {formatDate(r.date_depart)}
                            <span className="block text-xs text-slate-400 dark:text-slate-500">
                              {n} nuit(s)
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {r.nb_personnes}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                            {formatFCFA(n * Number(r.prix_nuit) + n * Number(r.taxe_nuit))}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                                STATUTS[r.statut]?.badge || STATUTS.reservee.badge
                              }`}
                            >
                              {STATUTS[r.statut]?.label || r.statut}
                            </span>
                          </TableCell>
                          <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                                  className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500 dark:hover:text-emerald-400"
                                  onClick={() =>
                                    changerStatut.mutate({ id: r.id, statut: "en_cours" })
                                  }
                                >
                                  <CheckCircle className="size-3.5 mr-1" /> Check-in
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                                  onClick={() =>
                                    changerStatut.mutate({ id: r.id, statut: "annulee" })
                                  }
                                >
                                  <XCircle className="size-3.5 mr-1" /> Annuler
                                </Button>
                              </>
                            ) : null}
                            {r.statut === "en_cours" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400"
                                  onClick={() => {
                                    setProlongerResa(r);
                                    setNouvelleDatePeriode(r.date_depart);
                                  }}
                                >
                                  <CalendarPlus className="size-3.5 mr-1" /> Prolonger
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-xl"
                                  onClick={() => {
                                    setFacturerResa(r);
                                    setFacturerForm({
                                      avance: "",
                                      buanderie: "",
                                      remiseType: "montant",
                                      remiseValeur: "",
                                    });
                                  }}
                                >
                                  Check-out & facturer
                                </Button>
                              </>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {reservationsFiltrees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-slate-400 dark:text-slate-500"
                        >
                          Aucune réservation trouvée.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Modifier la réservation
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
              <Label className="text-slate-700 dark:text-slate-300">Client</Label>
              <Select
                value={editForm.client_id}
                onValueChange={(v) => setEditForm({ ...editForm, client_id: v })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
              <Label className="text-slate-700 dark:text-slate-300">Chambre</Label>
              <Select
                value={editForm.chambre_id}
                onValueChange={(v) => setEditForm({ ...editForm, chambre_id: v })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                <Label className="text-slate-700 dark:text-slate-300">Arrivée</Label>
                <Input
                  type="date"
                  required
                  value={editForm.date_arrivee}
                  onChange={(e) => setEditForm({ ...editForm, date_arrivee: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Départ</Label>
                <Input
                  type="date"
                  required
                  value={editForm.date_depart}
                  onChange={(e) => setEditForm({ ...editForm, date_depart: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Personnes</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.nb_personnes}
                  onChange={(e) => setEditForm({ ...editForm, nb_personnes: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Prix / nuit (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.prix_nuit}
                  onChange={(e) => setEditForm({ ...editForm, prix_nuit: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Taxe / nuitée (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.taxe_nuit}
                  onChange={(e) => setEditForm({ ...editForm, taxe_nuit: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Statut</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={(v) => setEditForm({ ...editForm, statut: v })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUTS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Notes</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            {conflitEdition ? (
              <div className="rounded-xl border border-red-200/50 bg-red-50/80 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                ⚠️ Chambre déjà réservée du {formatDate(conflitEdition.date_arrivee)} au{" "}
                {formatDate(conflitEdition.date_depart)} pour{" "}
                {conflitEdition.clients?.prenom} {conflitEdition.clients?.nom}.
              </div>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={modifier.isPending || !!conflitEdition}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!facturerResa} onOpenChange={(o) => !o && setFacturerResa(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Check-out & facturation
            </DialogTitle>
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
            <div className="rounded-xl bg-slate-50/80 dark:bg-slate-700/50 p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50">
              <p className="font-medium text-slate-900 dark:text-white">
                {facturerResa?.clients?.prenom} {facturerResa?.clients?.nom}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {facturerResa?.chambres?.nom} — {formatDate(facturerResa?.date_arrivee || "")} →{" "}
                {formatDate(facturerResa?.date_depart || "")}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Service buanderie (FCFA) — laisser vide si aucun
              </Label>
              <Input
                type="number"
                min="0"
                value={facturerForm.buanderie}
                onChange={(e) => setFacturerForm({ ...facturerForm, buanderie: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Type de remise</Label>
                <Select
                  value={facturerForm.remiseType}
                  onValueChange={(v) => setFacturerForm({ ...facturerForm, remiseType: v })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="montant">Montant fixe (FCFA)</SelectItem>
                    <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Valeur de la remise — laisser vide si aucune
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={facturerForm.remiseValeur}
                  onChange={(e) =>
                    setFacturerForm({ ...facturerForm, remiseValeur: e.target.value })
                  }
                  className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Avance déjà versée (FCFA) — laisser vide si aucune
              </Label>
              <Input
                type="number"
                min="0"
                value={facturerForm.avance}
                onChange={(e) => setFacturerForm({ ...facturerForm, avance: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={cloturer.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                Clôturer et générer la facture
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!prolongerResa} onOpenChange={(o) => !o && setProlongerResa(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Prolonger le séjour
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              prolonger.mutate();
            }}
          >
            <div className="rounded-xl bg-slate-50/80 dark:bg-slate-700/50 p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50">
              <p className="font-medium text-slate-900 dark:text-white">
                {prolongerResa?.clients?.prenom} {prolongerResa?.clients?.nom}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {prolongerResa?.chambres?.nom}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Date de départ actuelle</Label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {prolongerResa ? formatDate(prolongerResa.date_depart) : ""}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Nouvelle date de départ</Label>
              <Input
                type="date"
                required
                min={prolongerResa?.date_depart}
                value={nouvelleDatePeriode}
                onChange={(e) => setNouvelleDatePeriode(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={prolonger.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                Prolonger le séjour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}