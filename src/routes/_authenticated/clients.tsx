import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Printer, History, Eye, Users2, BedDouble, Wallet, Landmark } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { formatFCFA, formatDate, nbNuits, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Fichier clients de LE DAYA Guest House : coordonnées, pièce d'identité et nationalité.",
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
        .select("*, clients(nom, prenom, telephone, type_piece, numero_piece, nationalite), chambres(nom, type)")
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
      }
    }, 
  });
   const statsHistorique = (sejours ?? []).reduce(
    (acc, s) => {
      const n = nbNuits(s.date_arrivee, s.date_depart);
      acc.nuitees += n;
      acc.total += n * Number(s.prix_nuit);
      acc.taxes += n * Number(s.taxe_nuit ?? 0);
      return acc;
    },
    { nuitees: 0, total: 0, taxes: 0 },
  );

  function infosClient(clientId: string) {
    const historique = (sejoursTous ?? []).filter((s) => s.client_id === clientId);
    const dernier = historique[0];
    const totalDepense = historique.reduce(
      (s, r) => s + nbNuits(r.date_arrivee, r.date_depart) * Number(r.prix_nuit),
      0,
    );
    return { nbSejours: historique.length, dernier, totalDepense, historique };
  }

  const COULEURS_AVATAR = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];
  function couleurAvatar(nom: string) {
    let hash = 0;
    for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
    return COULEURS_AVATAR[Math.abs(hash) % COULEURS_AVATAR.length];
  }

  const clientFiche = ficheClient ? (clients ?? []).find((c) => c.id === ficheClient) : null;
  const infosFiche = ficheClient ? infosClient(ficheClient) : null;

  return (
    <div>
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
              <Button>
                <Plus className="size-4" /> Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? "Modifier le client" : "Nouveau client"}</DialogTitle>
              </DialogHeader>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de pièce</Label>
                  <Input
                    placeholder="CNI, passeport…"
                    value={form.type_piece}
                    onChange={(e) => setForm({ ...form, type_piece: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>N° de pièce</Label>
                  <Input
                    value={form.numero_piece}
                    onChange={(e) => setForm({ ...form, numero_piece: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <Input
                    value={form.nationalite}
                    onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="submit" disabled={enregistrer.isPending || !etab}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-6">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <p className="font-display font-semibold">Historique des séjours</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
              <div className="group flex min-w-[130px] items-center gap-3 rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 py-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-blue-950/40 dark:to-blue-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.5)] transition-transform group-hover:scale-110">
                  <Users2 className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold leading-none">{(sejours ?? []).length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Séjours</p>
                </div>
              </div>
              <div className="group flex min-w-[130px] items-center gap-3 rounded-xl border bg-gradient-to-br from-green-50 to-green-100/50 px-4 py-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-green-950/40 dark:to-green-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.5)] transition-transform group-hover:scale-110">
                  <BedDouble className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold leading-none">{statsHistorique.nuitees}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Nuitées</p>
                </div>
              </div>
              <div className="group flex min-w-[150px] items-center gap-3 rounded-xl border bg-gradient-to-br from-amber-50 to-amber-100/50 px-4 py-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-amber-950/40 dark:to-amber-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-110">
                  <Wallet className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold leading-none">{formatFCFA(statsHistorique.total)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              <div className="group flex min-w-[150px] items-center gap-3 rounded-xl border bg-gradient-to-br from-purple-50 to-purple-100/50 px-4 py-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:from-purple-950/40 dark:to-purple-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-purple-500 shadow-[0_0_16px_rgba(147,51,234,0.5)] transition-transform group-hover:scale-110">
                  <Landmark className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold leading-none">{formatFCFA(statsHistorique.taxes)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Taxes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Du</Label>
              <Input
                type="date"
                value={dateDebutFiltre}
                onChange={(e) => setDateDebutFiltre(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Au</Label>
              <Input
                type="date"
                value={dateFinFiltre}
                onChange={(e) => setDateFinFiltre(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button variant="outline" onClick={imprimerHistorique} className="gap-2">
              <Printer className="size-4" /> Imprimer
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">N°</TableHead>
                  <TableHead>Nom et prénom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Pièce</TableHead>
                  <TableHead>Nationalité</TableHead>
                  <TableHead>Type chambre</TableHead>
                  <TableHead>N° chambre</TableHead>
                  <TableHead>Période de séjour</TableHead>
                  <TableHead className="text-center">Nuits</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Taxe de séjour</TableHead>
                  <TableHead className="text-right">Prix total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sejours ?? []).map((s, i) => {
                  const n = nbNuits(s.date_arrivee, s.date_depart);
                  const taxe = n * Number(s.taxe_nuit ?? 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {s.clients?.prenom} {s.clients?.nom}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{s.clients?.telephone ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.clients?.type_piece ? `${s.clients.type_piece} ${s.clients.numero_piece ?? ""}` : "—"}
                      </TableCell>
                      <TableCell>{s.clients?.nationalite ?? "—"}</TableCell>
                      <TableCell>{s.chambres?.type ?? "—"}</TableCell>
                      <TableCell>{s.chambres?.nom ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                      </TableCell>
                      <TableCell className="text-center">{n}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatFCFA(s.prix_nuit)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatFCFA(taxe)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {formatFCFA(n * Number(s.prix_nuit) + taxe)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(sejours ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                Historique des séjours — du {formatDate(dateDebutFiltre)} au {formatDate(dateFinFiltre)}
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
                        {s.clients?.type_piece ? `${s.clients.type_piece} ${s.clients.numero_piece ?? ""}` : "—"}
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
                      <td style={{ textAlign: "right" }}>{formatFCFA(n * Number(s.prix_nuit) + taxe)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Fichier clients</h2>
          <p className="text-sm text-muted-foreground">
            Consultez et gérez les informations des clients de l'établissement.
          </p>
        </div>
        <div className="max-w-sm">
          <Input
            placeholder="Rechercher un client…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
      </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtres.map((c) => {
          const infos = infosClient(c.id);
          const nomComplet = `${c.prenom ?? ""} ${c.nom}`.trim();
          return (
            <Card
              key={c.id}
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
              onClick={() => setFicheClient(c.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white shadow-md"
                      style={{ backgroundColor: couleurAvatar(nomComplet) }}
                    >
                      {nomComplet[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold">{nomComplet}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.nationalite ?? "Nationalité —"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {infos.nbSejours} séj.
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>📞 {c.telephone ?? "—"}</p>
                  <p>
                    🪪 {c.type_piece ? `${c.type_piece} ${c.numero_piece ?? ""}` : "—"}
                  </p>
                  <p>
                    🗓️{" "}
                    {infos.dernier
                      ? `${formatDate(infos.dernier.date_arrivee)} → ${formatDate(infos.dernier.date_depart)}`
                      : "Aucun séjour"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <p className="text-sm font-semibold text-primary">
                    {formatFCFA(infos.totalDepense)}
                  </p>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
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
                        className="size-8"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer ${nomComplet} ? Toutes ses réservations, factures et taxes de séjour seront également supprimées définitivement.`,
                            )
                          ) {
                            supprimer.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtres.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Aucun client enregistré.
          </p>
        ) : null}
      </div>

      <Dialog open={!!ficheClient} onOpenChange={(o) => !o && setFicheClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Fiche client — {clientFiche?.prenom} {clientFiche?.nom}
            </DialogTitle>
          </DialogHeader>
          {clientFiche && infosFiche ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">{infosFiche.nbSejours}</p>
                  <p className="text-[10px] text-muted-foreground">Séjours</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">{formatFCFA(infosFiche.totalDepense)}</p>
                  <p className="text-[10px] text-muted-foreground">Total dépensé</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm font-bold">{clientFiche.telephone ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Téléphone</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm font-bold">{clientFiche.nationalite ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Nationalité</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Historique des séjours</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {infosFiche.historique.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{s.chambres?.nom ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatFCFA(nbNuits(s.date_arrivee, s.date_depart) * Number(s.prix_nuit))}
                      </span>
                    </div>
                  ))}
                  {infosFiche.historique.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Aucun séjour enregistré.</p>
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