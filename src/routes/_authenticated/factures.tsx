import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { LOGO_URL } from "@/components/Brand";
import { FactureDocument, type FactureDocumentData } from "@/components/FactureDocument";
import { formatFCFA, formatDate } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  CreditCard,
  Eye,
  Download,
  Search,
  Filter,
  X,
  CalendarDays,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({
    meta: [
      { title: "Facturation — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Factures clients de LE DAYA Guest House : détail des lignes, taxe et règlements.",
      },
      { property: "og:title", content: "Facturation — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Émission et suivi des factures en FCFA." },
    ],
  }),
  component: FacturesPage,
});

function FacturesPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();

  const [recherche, setRecherche] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);

  const [detail, setDetail] = useState<string | null>(null);
  const [factureEmail, setFactureEmail] = useState<string | null>(null);
  const [factureWhatsApp, setFactureWhatsApp] = useState<string | null>(null);
  const [remiseFacture, setRemiseFacture] = useState<string | null>(null);
  const [remiseForm, setRemiseForm] = useState({ type: "montant", valeur: "", motif: "" });
  const [emailForm, setEmailForm] = useState({ destinataire: "", message: "" });
  const [whatsappForm, setWhatsappForm] = useState({ telephone: "", message: "" });

  const { data: factures, isLoading } = useQuery({
    queryKey: ["factures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("*, clients(nom, prenom, email, telephone)")
        .order("date_facture", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lignes } = useQuery({
    queryKey: ["facture-lignes", detail],
    enabled: !!detail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facture_lignes")
        .select("*")
        .eq("facture_id", detail!);
      if (error) throw error;
      return data;
    },
  });

  const facturesFiltrees = (factures ?? []).filter((f) => {
    if (recherche) {
      const terme = recherche.toLowerCase();
      const correspondRecherche =
        f.numero?.toLowerCase().includes(terme) ||
        f.clients?.nom?.toLowerCase().includes(terme) ||
        f.clients?.prenom?.toLowerCase().includes(terme) ||
        f.clients?.email?.toLowerCase().includes(terme) ||
        f.clients?.telephone?.includes(terme);
      if (!correspondRecherche) return false;
    }

    if (statutFiltre !== "toutes" && f.statut !== statutFiltre) {
      return false;
    }

    const dateFacture = new Date(f.date_facture);
    const maintenant = new Date();

    if (periodeFiltre === "aujourd'hui") {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      if (dateFacture < aujourdhui) return false;
    } else if (periodeFiltre === "mois-en-cours") {
      if (
        dateFacture.getMonth() !== maintenant.getMonth() ||
        dateFacture.getFullYear() !== maintenant.getFullYear()
      ) {
        return false;
      }
    } else if (periodeFiltre === "mois-dernier") {
      const moisDernier = new Date();
      moisDernier.setMonth(moisDernier.getMonth() - 1);
      if (
        dateFacture.getMonth() !== moisDernier.getMonth() ||
        dateFacture.getFullYear() !== moisDernier.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(facturesFiltrees.length / limitePage);
  const facturesPage = facturesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  const totalFacture = facturesFiltrees.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalPaye = facturesFiltrees
    .filter((f) => f.statut === "payee")
    .reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalImpaye = facturesFiltrees
    .filter((f) => f.statut !== "payee")
    .reduce((sum, f) => sum + Number(f.montant_total), 0);
  const nbFactures = facturesFiltrees.length;

  const appliquerRemise = useMutation({
    mutationFn: async () => {
      const f = (factures ?? []).find((x) => x.id === remiseFacture);
      if (!f) throw new Error("Facture introuvable");
      const base =
        Number(f.montant_hebergement) + Number(f.montant_taxe) + Number(f.montant_autres);
      const valeur = Number(remiseForm.valeur) || 0;
      const remise =
        remiseForm.type === "pourcentage" ? Math.round((base * valeur) / 100) : valeur;
      if (remise < 0 || remise > base) throw new Error("Remise invalide");
      const { error } = await supabase
        .from("factures")
        .update({
          montant_remise: remise,
          motif_remise: remiseForm.motif || null,
          montant_total: base - remise,
        })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setRemiseFacture(null);
      setRemiseForm({ type: "montant", valeur: "", motif: "" });
      toast.success("Remise appliquée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payer = useMutation({
    mutationFn: async (f: NonNullable<typeof factures>[number]) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("factures")
        .update({ statut: "payee" })
        .eq("id", f.id);
      if (error) throw error;
      const { error: eCaisse } = await supabase.from("caisse_operations").insert({
        etablissement_id: f.etablissement_id,
        sens: "entree",
        motif: `Règlement facture ${f.numero}`,
        montant: Number(f.montant_total),
        mode_paiement: "especes",
        facture_id: f.id,
        created_by: u.user?.id ?? null,
      });
      if (eCaisse) throw eCaisse;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Facture réglée et encaissée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const envoyerEmail = useMutation({
    mutationFn: async (factureId: string) => {
      const f = (factures ?? []).find((x) => x.id === factureId);
      if (!f) throw new Error("Facture introuvable");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setFactureEmail(null);
      setEmailForm({ destinataire: "", message: "" });
      toast.success("Facture envoyée par email.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const envoyerWhatsApp = useMutation({
    mutationFn: async (factureId: string) => {
      const f = (factures ?? []).find((x) => x.id === factureId);
      if (!f) throw new Error("Facture introuvable");
      const telephone = whatsappForm.telephone || f.clients?.telephone;
      if (!telephone) throw new Error("Numéro de téléphone requis");
      const message = encodeURIComponent(
        `Bonjour ${f.clients?.prenom ?? ''},

Votre facture ${f.numero} d'un montant de ${formatFCFA(f.montant_total)} est disponible.

Merci de votre confiance.

LE DAYA Guest House`
      );
      window.open(`https://wa.me/${telephone}?text=${message}`, '_blank');
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setFactureWhatsApp(null);
      setWhatsappForm({ telephone: "", message: "" });
      toast.success("Facture envoyée par WhatsApp.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function imprimerFacture() {
    const contenu = document.querySelector(".facture-a4");
    if (!contenu) return;
    const fenetre = window.open("", "_blank", "width=900,height=1000");
    if (!fenetre) return;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");
    fenetre.document.write(`
      <html>
        <head>
          <title>Facture</title>
          ${styles}
        </head>
        <body style="margin:0;">
          ${contenu.outerHTML}
        </body>
      </html>
    `);
    fenetre.document.close();
    fenetre.onload = () => {
      fenetre.focus();
      fenetre.print();
    };
  }

  const facture = (factures ?? []).find((f) => f.id === detail);
  const factureData: FactureDocumentData | null = facture
    ? {
        numero: facture.numero,
        clientNom: `${facture.clients?.prenom ?? ""} ${facture.clients?.nom ?? ""}`.trim(),
        periodeLabel: formatDate(facture.date_facture),
        lignesHebergement: (lignes ?? [])
          .filter((l) => l.libelle.startsWith("Hébergement"))
          .map((l) => ({
            periode: l.libelle,
            nuitees: Number(l.quantite),
            chambre: "",
            prixUnitaire: Number(l.prix_unitaire),
            prixTotal: Number(l.montant),
          })),
        totalHebergement: Number(facture.montant_hebergement),
        buanderie:
          Number(facture.montant_autres) > 0
            ? {
                detail: formatFCFA(facture.montant_autres),
                total: Number(facture.montant_autres),
              }
            : undefined,
        remise:
          Number(facture.montant_remise) > 0
            ? {
                label: facture.motif_remise || "Remise",
                montant: Number(facture.montant_remise),
              }
            : undefined,
        avance: Number(facture.montant_paye) > 0 ? Number(facture.montant_paye) : undefined,
        totalGeneral: Number(facture.montant_total),
        ville: etab?.ville ?? "Port-Gentil",
        dateEmission: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        etablissement: {
          nom: etab?.nom ?? "LE DAYA Guest House",
          adresse: "BP 780",
          telephone: "074.87.42.33",
          email: "ledayaguestpog@gmail.com",
          rccm: "RG/POG 2021 A 15358",
          nif: "319220 T",
          banque: "ORABANK : Le DAYA Guest House",
          compte: "40021 02001 22873000201",
          cle: "63",
        },
        logoUrl: LOGO_URL,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturation"
        description={`Factures émises${etab ? ` — ${etab.nom}` : ""}`}
      />

      {/* ═══════════════════════════════════════════════════════
          CARTES DE SYNTHÈSE
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total facturé
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {formatFCFA(totalFacture)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {nbFactures} facture{nbFactures > 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
              <CheckCircle2 className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total payé
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatFCFA(totalPaye)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {facturesFiltrees.filter((f) => f.statut === "payee").length} payée(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
              <AlertCircle className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total impayé
              </p>
              <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
                {formatFCFA(totalImpaye)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {facturesFiltrees.filter((f) => f.statut !== "payee").length} impayée(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-110">
              <FileText className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nombre de factures
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {nbFactures}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Période sélectionnée
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BARRE DE FILTRES
          ═══════════════════════════════════════════════════════ */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Rechercher (n°, client, email, téléphone)..."
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
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                <SelectTrigger className="w-[160px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                  <SelectItem value="mois-en-cours">Ce mois-ci</SelectItem>
                  <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                  <SelectItem value="tout">Toute période</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statutFiltre} onValueChange={setStatutFiltre}>
                <SelectTrigger className="w-[140px] rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Tous statuts</SelectItem>
                  <SelectItem value="payee">Payées</SelectItem>
                  <SelectItem value="impayee">Impayées</SelectItem>
                </SelectContent>
              </Select>

              {(recherche || statutFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecherche("");
                    setStatutFiltre("toutes");
                    setPeriodeFiltre("mois-en-cours");
                  }}
                  className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                >
                  <Filter className="size-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {(recherche || statutFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
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
                  Statut: {statutFiltre === "payee" ? "Payées" : "Impayées"}
                  <button onClick={() => setStatutFiltre("toutes")} className="ml-1 hover:text-red-500">
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
                  <button onClick={() => setPeriodeFiltre("mois-en-cours")} className="ml-1 hover:text-red-500">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          GRILLE DES FACTURES
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {facturesPage.map((f) => (
          <Card
            key={f.id}
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-lg"
            onClick={() => setDetail(f.id)}
          >
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {f.numero}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(f.date_facture)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                    f.statut === "payee"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30"
                  }`}
                >
                  {f.statut === "payee" ? "Payée" : "Impayée"}
                </span>
              </div>

              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                  {f.clients?.prenom} {f.clients?.nom}
                </p>
                {f.clients?.email && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {f.clients?.email}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 dark:text-slate-500">Total</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatFCFA(f.montant_total)}
                </p>
              </div>

              <div className="flex gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetail(f.id);
                  }}
                >
                  <Eye className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFactureEmail(f.id);
                  }}
                >
                  <Mail className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFactureWhatsApp(f.id);
                  }}
                >
                  <MessageCircle className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetail(f.id);
                    setTimeout(() => imprimerFacture(), 600);
                  }}
                >
                  <Printer className="size-3.5" />
                </Button>
              </div>

              {f.statut !== "payee" && (
                <Button
                  size="sm"
                  className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                  onClick={(e) => {
                    e.stopPropagation();
                    payer.mutate(f);
                  }}
                >
                  <CreditCard className="size-3.5 mr-1.5" />
                  Encaisser
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {facturesPage.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <FileText className="size-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-400 dark:text-slate-500">
              {facturesFiltrees.length === 0
                ? "Aucune facture ne correspond aux filtres."
                : "Aucune facture."}
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          PAGINATION
          ═══════════════════════════════════════════════════════ */}
      {totalPages > 1 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {pageActuelle} sur {totalPages} ({facturesFiltrees.length} factures)
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
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          DIALOG - DÉTAIL FACTURE
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Facture {facture?.numero}
            </DialogTitle>
          </DialogHeader>
          {factureData ? <FactureDocument data={factureData} /> : null}
          <div className="no-print flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFactureEmail(facture?.id ?? null)}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Mail className="size-4 mr-1.5" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFactureWhatsApp(facture?.id ?? null)}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <MessageCircle className="size-4 mr-1.5" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={imprimerFacture}
              className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
            >
              <Printer className="size-4 mr-1.5" />
              Imprimer / PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          DIALOG - ENVOYER PAR EMAIL
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!factureEmail} onOpenChange={(o) => !o && setFactureEmail(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Envoyer la facture par email
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (factureEmail) {
                envoyerEmail.mutate(factureEmail);
              }
            }}
          >
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Destinataire</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={emailForm.destinataire}
                onChange={(e) => setEmailForm({ ...emailForm, destinataire: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Message (optionnel)</Label>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20 focus:outline-none"
                placeholder="Bonjour, voici votre facture..."
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={envoyerEmail.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                <Mail className="size-4 mr-1.5" />
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          DIALOG - ENVOYER PAR WHATSAPP
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!factureWhatsApp} onOpenChange={(o) => !o && setFactureWhatsApp(null)}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Envoyer la facture par WhatsApp
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (factureWhatsApp) {
                envoyerWhatsApp.mutate(factureWhatsApp);
              }
            }}
          >
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Numéro de téléphone</Label>
              <Input
                type="tel"
                placeholder="+241 XX XX XX XX"
                value={whatsappForm.telephone}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, telephone: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Laissez vide pour utiliser le numéro du client
              </p>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={envoyerWhatsApp.isPending}
                className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
              >
                <MessageCircle className="size-4 mr-1.5" />
                Ouvrir WhatsApp
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}