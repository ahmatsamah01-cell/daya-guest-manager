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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({
    meta: [
      { title: "Facturation — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Factures clients de LE DAYA Guest House : détail des lignes, taxe et règlements.",
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
  
  // États pour les filtres
  const [recherche, setRecherche] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<string>("toutes");
  const [periodeFiltre, setPeriodeFiltre] = useState<string>("mois-en-cours");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [limitePage, setLimitePage] = useState(10);
  
  // États pour les dialogs
  const [detail, setDetail] = useState<string | null>(null);
  const [factureEmail, setFactureEmail] = useState<string | null>(null);
  const [factureWhatsApp, setFactureWhatsApp] = useState<string | null>(null);
  const [remiseFacture, setRemiseFacture] = useState<string | null>(null);
  const [remiseForm, setRemiseForm] = useState({ type: "montant", valeur: "", motif: "" });
  const [emailForm, setEmailForm] = useState({ destinataire: "", message: "" });
  const [whatsappForm, setWhatsappForm] = useState({ telephone: "", message: "" });

  // Récupération des factures
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

  // Récupération des lignes de facture (pour le détail)
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

  // Filtrage des factures
  const facturesFiltrees = (factures ?? []).filter((f) => {
    // Filtre par recherche
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

    // Filtre par statut
    if (statutFiltre !== "toutes" && f.statut !== statutFiltre) {
      return false;
    }

    // Filtre par période
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

  // Pagination
  const totalPages = Math.ceil(facturesFiltrees.length / limitePage);
  const facturesPage = facturesFiltrees.slice(
    (pageActuelle - 1) * limitePage,
    pageActuelle * limitePage
  );

  // Calcul des statistiques
  const totalFacture = facturesFiltrees.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalPaye = facturesFiltrees
    .filter((f) => f.statut === "payee")
    .reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalImpaye = facturesFiltrees
    .filter((f) => f.statut !== "payee")
    .reduce((sum, f) => sum + Number(f.montant_total), 0);
  const nbFactures = facturesFiltrees.length;

  // Mutation pour appliquer une remise
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

  // Mutation pour encaisser une facture
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

  // Mutation pour envoyer par email
  const envoyerEmail = useMutation({
    mutationFn: async (factureId: string) => {
      const f = (factures ?? []).find((x) => x.id === factureId);
      if (!f) throw new Error("Facture introuvable");
      
      // Ici, tu devras intégrer un service d'envoi d'email (ex: Supabase Edge Function, SendGrid, etc.)
      // Pour l'instant, on simule
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Exemple avec Supabase Edge Function (à implémenter)
      // const { error } = await supabase.functions.invoke('envoyer-email', {
      //   body: {
      //     to: emailForm.destinataire,
      //     subject: `Facture ${f.numero} - LE DAYA Guest House`,
      //     message: emailForm.message,
      //     factureId: f.id,
      //   },
      // });
      // if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setFactureEmail(null);
      setEmailForm({ destinataire: "", message: "" });
      toast.success("Facture envoyée par email.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation pour envoyer par WhatsApp
  const envoyerWhatsApp = useMutation({
    mutationFn: async (factureId: string) => {
      const f = (factures ?? []).find((x) => x.id === factureId);
      if (!f) throw new Error("Facture introuvable");
      
      // Ouvrir WhatsApp avec le message pré-rempli
      const telephone = whatsappForm.telephone || f.clients?.telephone;
      if (!telephone) throw new Error("Numéro de téléphone requis");
      
      const message = encodeURIComponent(
        `Bonjour ${f.clients?.prenom ?? ''},

Votre facture ${f.numero} d'un montant de ${formatFCFA(f.montant_total)} est disponible.

Merci de votre confiance.

LE DAYA Guest House`
      );
      
      window.open(`https://wa.me/${telephone}?text=${message}`, '_blank');
      
      // Ici, tu pourrais aussi logger l'envoi dans une table "facture_envois"
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setFactureWhatsApp(null);
      setWhatsappForm({ telephone: "", message: "" });
      toast.success("Facture envoyée par WhatsApp.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Fonction pour imprimer
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

  // Données pour le document de facture
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

  // Réinitialiser la pagination quand les filtres changent
  useState(() => {
    setPageActuelle(1);
  }, [recherche, statutFiltre, periodeFiltre, limitePage]);

  return (
    <div>
      <PageHeader
        title="Facturation"
        description={`Factures émises${etab ? ` — ${etab.nom}` : ""}`}
      />

      {/* CARTES DE SYNTHÈSE */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
  {/* Total facturé */}
  <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 border-blue-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Total facturé
          </p>
          <p className="text-2xl font-bold mt-1">
            {formatFCFA(totalFacture)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {nbFactures} facture{nbFactures > 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_24px_rgba(59,130,246,0.7)] transition-shadow duration-300">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Total payé */}
  <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-emerald-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Total payé
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatFCFA(totalPaye)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {facturesFiltrees.filter(f => f.statut === 'payee').length} payée{facturesFiltrees.filter(f => f.statut === 'payee').length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] transition-shadow duration-300">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Total impayé */}
  <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 via-white to-red-100 border-red-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Total impayé
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatFCFA(totalImpaye)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {facturesFiltrees.filter(f => f.statut !== 'payee').length} impayée{facturesFiltrees.filter(f => f.statut !== 'payee').length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_24px_rgba(239,68,68,0.7)] transition-shadow duration-300">
          <AlertCircle className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Nombre de factures */}
  <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 border-purple-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Nombre de factures
          </p>
          <p className="text-2xl font-bold mt-1">
            {nbFactures}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Période sélectionnée
          </p>
        </div>
        <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_0_16px_rgba(147,51,234,0.5)] group-hover:shadow-[0_0_24px_rgba(147,51,234,0.7)] transition-shadow duration-300">
          <FileText className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
</div>

      {/* BARRE DE FILTRES */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Recherche */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (n°, client, email, téléphone)..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9"
                />
                {recherche && (
                  <button
                    onClick={() => setRecherche("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              {/* Période */}
              <Select value={periodeFiltre} onValueChange={setPeriodeFiltre}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                  <SelectItem value="mois-en-cours">Ce mois-ci</SelectItem>
                  <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                  <SelectItem value="tout">Toute période</SelectItem>
                </SelectContent>
              </Select>

              {/* Statut */}
              <Select value={statutFiltre} onValueChange={setStatutFiltre}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Tous statuts</SelectItem>
                  <SelectItem value="payee">Payées</SelectItem>
                  <SelectItem value="impayee">Impayées</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset filtres */}
              {(recherche || statutFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecherche("");
                    setStatutFiltre("toutes");
                    setPeriodeFiltre("mois-en-cours");
                  }}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Badges des filtres actifs */}
          {(recherche || statutFiltre !== "toutes" || periodeFiltre !== "mois-en-cours") && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {recherche && (
                <Badge variant="secondary" className="gap-1">
                  Recherche: {recherche}
                  <button onClick={() => setRecherche("")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {statutFiltre !== "toutes" && (
                <Badge variant="secondary" className="gap-1">
                  Statut: {statutFiltre === "payee" ? "Payées" : "Impayées"}
                  <button onClick={() => setStatutFiltre("toutes")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {periodeFiltre !== "mois-en-cours" && (
                <Badge variant="secondary" className="gap-1">
                  Période: {periodeFiltre === "aujourd'hui" ? "Aujourd'hui" : periodeFiltre === "mois-dernier" ? "Mois dernier" : "Toute période"}
                  <button onClick={() => setPeriodeFiltre("mois-en-cours")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABLEAU DES FACTURES */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturesPage.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.numero}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {f.clients?.prenom} {f.clients?.nom}
                      </div>
                      {f.clients?.email && (
                        <div className="text-xs text-muted-foreground">
                          {f.clients?.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(f.date_facture)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatFCFA(f.montant_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.statut === "payee" ? "secondary" : "destructive"}>
                      {f.statut === "payee" ? "Payée" : "Impayée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetail(f.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFactureEmail(f.id)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFactureWhatsApp(f.id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetail(f.id);
                        setTimeout(() => imprimerFacture(), 600);
                      }}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    {f.statut !== "payee" && (
                      <Button
                        size="sm"
                        onClick={() => payer.mutate(f)}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Encaisser
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {facturesPage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {facturesFiltrees.length === 0
                      ? "Aucune facture ne correspond aux filtres."
                      : "Aucune facture."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {pageActuelle} sur {totalPages} ({facturesFiltrees.length} factures)
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(limitePage)}
                onValueChange={(v) => setLimitePage(Number(v))}
              >
                <SelectTrigger className="w-[100px]">
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
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPageActuelle(pageActuelle + 1)}
                disabled={pageActuelle === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* DIALOG - DÉTAIL FACTURE */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="no-print">
            <DialogTitle>Facture {facture?.numero}</DialogTitle>
          </DialogHeader>
          {factureData ? <FactureDocument data={factureData} /> : null}
          <div className="no-print flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFactureEmail(facture?.id ?? null);
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFactureWhatsApp(facture?.id ?? null);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Envoyer par WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={imprimerFacture}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer / PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG - ENVOYER PAR EMAIL */}
      <Dialog open={!!factureEmail} onOpenChange={(o) => !o && setFactureEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer la facture par email</DialogTitle>
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
              <Label>Destinataire</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={emailForm.destinataire}
                onChange={(e) => setEmailForm({ ...emailForm, destinataire: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Bonjour, voici votre facture..."
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={envoyerEmail.isPending}>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG - ENVOYER PAR WHATSAPP */}
      <Dialog open={!!factureWhatsApp} onOpenChange={(o) => !o && setFactureWhatsApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer la facture par WhatsApp</DialogTitle>
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
              <Label>Numéro de téléphone</Label>
              <Input
                type="tel"
                placeholder="+241 XX XX XX XX"
                value={whatsappForm.telephone}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, telephone: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser le numéro du client
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={envoyerWhatsApp.isPending}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Ouvrir WhatsApp
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG - APPLIQUER REMISE */}
      <Dialog open={!!remiseFacture} onOpenChange={(o) => !o && setRemiseFacture(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer une réduction</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              appliquerRemise.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Type de réduction</Label>
              <Select
                value={remiseForm.type}
                onValueChange={(v) => setRemiseForm({ ...remiseForm, type: v })}
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
              <Label>Valeur</Label>
              <Input
                type="number"
                min="0"
                required
                value={remiseForm.valeur}
                onChange={(e) => setRemiseForm({ ...remiseForm, valeur: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Motif (facultatif)</Label>
              <Input
                value={remiseForm.motif}
                onChange={(e) => setRemiseForm({ ...remiseForm, motif: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={appliquerRemise.isPending}>
                Appliquer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}