import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Printer,
  History,
  Eye,
  Users2,
  BedDouble,
  Wallet,
  Landmark,
  FileText,
  Search,
  User,
  Phone,
  Mail,
  IdCard,
  Globe,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { formatFCFA, formatDate, nbNuits, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Fichier clients de LE DAYA Guest House : coordonnées, pièce d'identité et nationalité.",
      },
      { property: "og:title", content: "Clients — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Base de données des clients de l'établissement." },
    ],
  }),
  component: ClientsPage,
});

type Form = {
  id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  adresse: string;
};

const vide: Form = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  type_piece: "",
  numero_piece: "",
  nationalite: "",
  adresse: "",
};

function ClientsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vide);
  const [recherche, setRecherche] = useState("");

  const [dateDebutFiltre, setDateDebutFiltre] = useState(`${today().slice(0, 7)}-01`);
  const [dateFinFiltre, setDateFinFiltre] = useState(today());

  const { data: sejours } = useQuery({
    queryKey: ["clients-sejours", dateDebutFiltre, dateFinFiltre],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          "*, clients(nom, prenom, telephone, type_piece, numero_piece, nationalite), chambres(nom, type)"
        )
        .neq("statut", "annulee")
        .gte("date_arrivee", dateDebutFiltre)
        .lte("date_arrivee", dateFinFiltre)
        .order("date_arrivee");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sejoursTous } = useQuery({
    queryKey: ["clients-sejours-tous"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, chambres(nom, type)")
        .neq("statut", "annulee")
        .order("date_depart", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [ficheClient, setFicheClient] = useState<string | null>(null);

  function imprimerFichePolice(sejour: any, client: any) {
    const n = nbNuits(sejour.date_arrivee, sejour.date_depart);
    const total = n * Number(sejour.prix_nuit) + n * Number(sejour.taxe_nuit ?? 0);

    const fenetre = window.open("", "_blank", "width=800,height=1000");
    if (!fenetre) return;

    fenetre.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Fiche de renseignement client</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 30px; color: #000; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #333; padding: 8px 10px; font-size: 13px; text-align: left; }
            th { width: 40%; background: #f5f5f5; font-weight: normal; }
            .titre-section { background: #d32f2f; color: white; text-align: center; font-weight: bold; padding: 6px; font-size: 14px; }
            @page { margin: 15mm; }
          </style>
        </head>
        <body>
          <h1>FICHE DE RENSEIGNEMENT CLIENT</h1>
          <table>
            <tr><th>NOM HÔTEL</th><td>${etab?.nom ?? "LE DAYA Guest House"}</td></tr>
            <tr><th>ADRESSE DE L'HÔTEL</th><td>${etab?.ville ?? ""}</td></tr>
            <tr><th>TÉLÉPHONE DE L'HÔTEL</th><td>074.87.42.33</td></tr>
          </table>

          <div class="titre-section">CLIENT</div>
          <table>
            <tr><th>NOM ET PRÉNOM</th><td>${client.prenom ?? ""} ${client.nom ?? ""}</td></tr>
            <tr><th>ADRESSE</th><td>${client.adresse ?? "—"}</td></tr>
            <tr><th>TÉLÉPHONE</th><td>${client.telephone ?? "—"}</td></tr>
            <tr><th>NATIONALITÉ</th><td>${client.nationalite ?? "—"}</td></tr>
            <tr><th>N° ET PIÈCE D'IDENTITÉ</th><td>${client.type_piece ?? ""} ${client.numero_piece ?? "—"}</td></tr>
          </table>

          <div class="titre-section">DÉTAILS DE LA RÉSERVATION</div>
          <table>
            <tr><th>DATE D'ARRIVÉE</th><td>${formatDate(sejour.date_arrivee)}</td></tr>
            <tr><th>DATE DE DÉPART</th><td>${formatDate(sejour.date_depart)}</td></tr>
            <tr><th>NOMBRE DE NUITS</th><td>${n}</td></tr>
            <tr><th>TYPE DE CHAMBRE</th><td>${sejour.chambres?.type ?? "—"}</td></tr>
            <tr><th>N° CHAMBRE</th><td>${sejour.chambres?.nom ?? "—"}</td></tr>
            <tr><th>PRIX PAR NUIT</th><td>${formatFCFA(sejour.prix_nuit)}</td></tr>
            <tr><th>TOTAL DE LA RÉSERVATION</th><td>${formatFCFA(total)}</td></tr>
          </table>

          <div class="titre-section">INFORMATIONS DE PAIEMENT</div>
          <table>
            <tr><th>MOYEN DE PAIEMENT</th><td>${sejour.mode_paiement ?? "—"}</td></tr>
            <tr><th>MONTANT PAYÉ</th><td>${formatFCFA(sejour.montant_paye ?? 0)}</td></tr>
          </table>

          <div class="titre-section">CONFIRMATION DE LA RÉSERVATION</div>
          <table>
            <tr><th>RÉSERVÉ PAR</th><td>${sejour.reserve_par ?? "—"}</td></tr>
            <tr><th>DATE DE LA RÉSERVATION</th><td>${sejour.created_at ? formatDate(sejour.created_at.slice(0, 10)) : "—"}</td></tr>
            <tr><th>N° DE CONFIRMATION</th><td>${sejour.numero_confirmation ?? "—"}</td></tr>
            <tr><th>SIGNATURE DU CLIENT</th><td>&nbsp;</td></tr>
            <tr><th>SIGNATURE DU RESPONSABLE</th><td>&nbsp;</td></tr>
          </table>
        </body>
      </html>
    `);

    fenetre.document.close();
    fenetre.onload = () => {
      fenetre.focus();
      fenetre.print();
    };
  }

  function imprimerHistorique() {
    const contenu = document.querySelector(".historique-print");
    if (!contenu) return;

    const fenetre = window.open("", "_blank", "width=1100,height=1000");
    if (!fenetre) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");

    fenetre.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <base href="${window.location.origin}/" />
          <title>Historique des séjours</title>
          ${styles}
          <style>
            @page { margin: 15mm; }
            body { padding: 0; margin: 0; background: white; color: black; font-family: sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
            th { background: #f3f3f3; text-align: left; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${contenu.innerHTML}
        </body>
      </html>
    `);

    fenetre.document.close();
    fenetre.onload = () => {
      fenetre.focus();
      fenetre.print();
    };
  }

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        etablissement_id: etab!.id,
        nom: f.nom,
        prenom: f.prenom || null,
        telephone: f.telephone || null,
        email: f.email || null,
        type_piece: f.type_piece || null,
        numero_piece: f.numero_piece || null,
        nationalite: f.nationalite || null,
        adresse: f.adresse || null,
      };
      const { error } = f.id
        ? await supabase.from("clients").update(payload).eq("id", f.id)
        : await supabase.from("clients").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm(vide);
      toast.success("Client enregistré.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statsHistorique = (sejours ?? []).reduce(
    (acc, s) => {
      const n = nbNuits(s.date_arrivee, s.date_depart);
      acc.nuitees += n;
      acc.total += n * Number(s.prix_nuit);
      acc.taxes += n * Number(s.taxe_nuit ?? 0);
      return acc;
    },
    { nuitees: 0, total: 0, taxes: 0 }
  );

  function infosClient(clientId: string) {
    const historique = (sejoursTous ?? []).filter((s) => s.client_id === clientId);
    const dernier = historique[0];
    const totalDepense = historique.reduce(
      (s, r) => s + nbNuits(r.date_arrivee, r.date_depart) * Number(r.prix_nuit),
      0
    );
    return { nbSejours: historique.length, dernier, totalDepense, historique };
  }

  const COULEURS_AVATAR = [
    "#dc2626",
    "#2563eb",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2",
  ];
  function couleurAvatar(nom: string) {
    let hash = 0;
    for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
    return COULEURS_AVATAR[Math.abs(hash) % COULEURS_AVATAR.length];
  }

  const clientFiche = ficheClient ? (clients ?? []).find((c) => c.id === ficheClient) : null;
  const infosFiche = ficheClient ? infosClient(ficheClient) : null;

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { data: resasClient } = await supabase
        .from("reservations")
        .select("id")
        .eq("client_id", id);
      const idsResas = (resasClient ?? []).map((r) => r.id);

      if (idsResas.length > 0) {
        const { data: facturesLiees } = await supabase
          .from("factures")
          .select("id")
          .in("reservation_id", idsResas);
        const idsFactures = (facturesLiees ?? []).map((f) => f.id);

        if (idsFactures.length > 0) {
          await supabase.from("caisse_operations").delete().in("facture_id", idsFactures);
          await supabase.from("facture_lignes").delete().in("facture_id", idsFactures);
          await supabase.from("factures").delete().in("id", idsFactures);
        }

        await supabase.from("taxes_sejour").delete().in("reservation_id", idsResas);
        await supabase.from("reservations").delete().in("id", idsResas);
      }

      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Client et son historique supprimés.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtres = (clients ?? []).filter((c) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return [c.nom, c.prenom, c.telephone, c.email, c.numero_piece]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Fichier clients de l'établissement"
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setForm(vide);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                <Plus className="size-4 mr-2" /> Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {form.id ? "Modifier le client" : "Nouveau client"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Nom *</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Prénom</Label>
                  <Input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Type de pièce</Label>
                  <Input
                    placeholder="CNI, passeport…"
                    value={form.type_piece}
                    onChange={(e) => setForm({ ...form, type_piece: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">N° de pièce</Label>
                  <Input
                    value={form.numero_piece}
                    onChange={(e) => setForm({ ...form, numero_piece: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Nationalité</Label>
                  <Input
                    value={form.nationalite}
                    onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Adresse</Label>
                  <Input
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={enregistrer.isPending || !etab}
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
          HISTORIQUE DES SÉJOURS
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <History className="size-4" />
              </div>
              <p className="font-display font-semibold text-slate-800 dark:text-white">
                Historique des séjours
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
              <div className="group flex min-w-[120px] items-center gap-3 rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 px-4 py-2.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Users2 className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {(sejours ?? []).length}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Séjours</p>
                </div>
              </div>
              <div className="group flex min-w-[120px] items-center gap-3 rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 px-4 py-2.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <BedDouble className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {statsHistorique.nuitees}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Nuitées</p>
                </div>
              </div>
              <div className="group flex min-w-[140px] items-center gap-3 rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 px-4 py-2.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Wallet className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {formatFCFA(statsHistorique.total)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Total</p>
                </div>
              </div>
              <div className="group flex min-w-[140px] items-center gap-3 rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 px-4 py-2.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Landmark className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {formatFCFA(statsHistorique.taxes)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Taxes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Du</Label>
              <Input
                type="date"
                value={dateDebutFiltre}
                onChange={(e) => setDateDebutFiltre(e.target.value)}
                className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Au</Label>
              <Input
                type="date"
                value={dateFinFiltre}
                onChange={(e) => setDateFinFiltre(e.target.value)}
                className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <Button
              variant="outline"
              onClick={imprimerHistorique}
              className="gap-2 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Printer className="size-4" /> Imprimer
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">N°</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Nom et prénom</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Téléphone</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Pièce</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Nationalité</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Type chambre</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">N° chambre</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Période</TableHead>
                  <TableHead className="text-center text-slate-600 dark:text-slate-300 font-semibold">Nuits</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">Prix U.</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">Taxe</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sejours ?? []).map((s, i) => {
                  const n = nbNuits(s.date_arrivee, s.date_depart);
                  const taxe = n * Number(s.taxe_nuit ?? 0);
                  return (
                    <TableRow
                      key={s.id}
                      className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                    >
                      <TableCell className="text-slate-600 dark:text-slate-300">{i + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-slate-900 dark:text-white">
                        {s.clients?.prenom} {s.clients?.nom}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {s.clients?.telephone ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {s.clients?.type_piece
                          ? `${s.clients.type_piece} ${s.clients.numero_piece ?? ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {s.clients?.nationalite ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {s.chambres?.type ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {s.chambres?.nom ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 dark:text-slate-300">{n}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatFCFA(s.prix_nuit)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatFCFA(taxe)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium text-slate-900 dark:text-white">
                        {formatFCFA(n * Number(s.prix_nuit) + taxe)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(sejours ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="py-8 text-center text-slate-400 dark:text-slate-500"
                    >
                      Aucun séjour sur cette période.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="historique-print hidden">
            <div className="mb-4 text-center">
              <p className="font-display text-lg font-bold">{etab?.nom ?? "LE DAYA Guest House"}</p>
              <p className="text-sm text-slate-500">
                Historique des séjours — du {formatDate(dateDebutFiltre)} au{" "}
                {formatDate(dateFinFiltre)}
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  {[
                    "N°",
                    "Nom et prénom",
                    "Téléphone",
                    "Pièce",
                    "Nationalité",
                    "Type",
                    "Chambre",
                    "Période",
                    "Nuits",
                    "Prix U.",
                    "Taxe",
                    "Total",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sejours ?? []).map((s, i) => {
                  const n = nbNuits(s.date_arrivee, s.date_depart);
                  const taxe = n * Number(s.taxe_nuit ?? 0);
                  return (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>
                        {s.clients?.prenom} {s.clients?.nom}
                      </td>
                      <td>{s.clients?.telephone ?? "—"}</td>
                      <td>
                        {s.clients?.type_piece
                          ? `${s.clients.type_piece} ${s.clients.numero_piece ?? ""}`
                          : "—"}
                      </td>
                      <td>{s.clients?.nationalite ?? "—"}</td>
                      <td>{s.chambres?.type ?? "—"}</td>
                      <td>{s.chambres?.nom ?? "—"}</td>
                      <td>
                        {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                      </td>
                      <td>{n}</td>
                      <td style={{ textAlign: "right" }}>{formatFCFA(s.prix_nuit)}</td>
                      <td style={{ textAlign: "right" }}>{formatFCFA(taxe)}</td>
                      <td style={{ textAlign: "right" }}>
                        {formatFCFA(n * Number(s.prix_nuit) + taxe)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          FICHIER CLIENTS
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-white">
            Fichier clients
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Consultez et gérez les informations des clients de l'établissement.
          </p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Rechercher un client…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="pl-9 rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtres.map((c) => {
          const infos = infosClient(c.id);
          const nomComplet = `${c.prenom ?? ""} ${c.nom}`.trim();
          return (
            <Card
              key={c.id}
              className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-lg"
              onClick={() => setFicheClient(c.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg"
                      style={{ backgroundColor: couleurAvatar(nomComplet) }}
                    >
                      {nomComplet[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-slate-900 dark:text-white">
                        {nomComplet}
                      </p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {c.nationalite ?? "Nationalité —"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-semibold text-red-500 border border-red-200/30">
                    {infos.nbSejours} séj.
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3" /> {c.telephone ?? "—"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <IdCard className="size-3" /> {c.type_piece ? `${c.type_piece} ${c.numero_piece ?? ""}` : "—"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="size-3" />{" "}
                    {infos.dernier
                      ? `${formatDate(infos.dernier.date_arrivee)} → ${formatDate(
                          infos.dernier.date_depart
                        )}`
                      : "Aucun séjour"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-3">
                  <p className="text-sm font-bold text-red-500">
                    {formatFCFA(infos.totalDepense)}
                  </p>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          nom: c.nom,
                          prenom: c.prenom ?? "",
                          telephone: c.telephone ?? "",
                          email: c.email ?? "",
                          type_piece: c.type_piece ?? "",
                          numero_piece: c.numero_piece ?? "",
                          nationalite: c.nationalite ?? "",
                          adresse: c.adresse ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {role?.estAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer ${nomComplet} ? Toutes ses réservations, factures et taxes de séjour seront également supprimées définitivement.`
                            )
                          ) {
                            supprimer.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtres.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-slate-400 dark:text-slate-500">
            Aucun client enregistré.
          </p>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════════
          FICHE CLIENT - DIALOG
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!ficheClient} onOpenChange={(o) => !o && setFicheClient(null)}>
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Fiche client — {clientFiche?.prenom} {clientFiche?.nom}
            </DialogTitle>
          </DialogHeader>
          {clientFiche && infosFiche ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {infosFiche.nbSejours}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Séjours</p>
                </div>
                <div className="rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 p-3 text-center">
                  <p className="text-lg font-bold text-red-500">
                    {formatFCFA(infosFiche.totalDepense)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Total dépensé</p>
                </div>
                <div className="rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 p-3 text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {clientFiche.telephone ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Téléphone</p>
                </div>
                <div className="rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 p-3 text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {clientFiche.nationalite ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Nationalité</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Historique des séjours
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {infosFiche.historique.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 px-4 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {s.chambres?.nom ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatFCFA(
                            nbNuits(s.date_arrivee, s.date_depart) * Number(s.prix_nuit)
                          )}
                        </span>
                        {s.statut === "terminee" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => imprimerFichePolice(s, clientFiche)}
                            className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <FileText className="size-3.5 mr-1" /> Fiche
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {infosFiche.historique.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                      Aucun séjour enregistré.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}