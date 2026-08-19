import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA, formatDate, today, nbNuits } from "@/lib/format";
import { 
  CalendarCheck, Wallet, TrendingDown, ArrowDown, ArrowUp, 
  Bell, CheckCircle, XCircle, AlertCircle, Info, Search, 
  Filter, Download, Printer, RefreshCw, Clock, Calendar,
  Home, DollarSign, TrendingUp, Users, FileText, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Notifications et alertes de LE DAYA Guest House : arrivées, départs, encaissements, dépenses et alertes diverses.",
      },
      { property: "og:title", content: "Notifications — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Toutes les alertes et notifications de l'établissement." },
    ],
  }),
  component: NotificationsPage,
});

const TYPES_NOTIFICATIONS = [
  { id: "tous", label: "Toutes", icone: Bell },
  { id: "arrivees", label: "Arrivées", icone: ArrowDown },
  { id: "departs", label: "Départs", icone: ArrowUp },
  { id: "encaissements", label: "Encaissements", icone: Wallet },
  { id: "depenses", label: "Dépenses", icone: TrendingDown },
  { id: "alertes", label: "Alertes", icone: AlertCircle },
];

const PERIODES = [
  { id: "aujourd'hui", label: "Aujourd'hui" },
  { id: "hier", label: "Hier" },
  { id: "semaine", label: "Cette semaine" },
  { id: "mois", label: "Ce mois-ci" },
  { id: "personnalisee", label: "Personnalisée" },
];

function NotificationsPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState<string>("aujourd'hui");
  const [debut, setDebut] = useState(today());
  const [fin, setFin] = useState(today());
  const [filtreType, setFiltreType] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<string>("date-desc");
  const [afficherLues, setAfficherLues] = useState<boolean>(true);
  const [tabActif, setTabActif] = useState<string>("toutes");

  // Calcul des dates selon la période
  useEffect(() => {
    const aujourdhui = new Date();
    let newDebut = new Date();
    let newFin = new Date();
    
    switch (periode) {
      case "aujourd'hui":
        newDebut = aujourdhui;
        newFin = aujourdhui;
        break;
      case "hier":
        newDebut = new Date(aujourdhui);
        newDebut.setDate(aujourdhui.getDate() - 1);
        newFin = newDebut;
        break;
      case "semaine":
        newDebut = new Date(aujourdhui);
        newDebut.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1);
        newFin = aujourdhui;
        break;
      case "mois":
        newDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
        newFin = aujourdhui;
        break;
    }
    
    setDebut(newDebut.toISOString().split('T')[0]);
    setFin(newFin.toISOString().split('T')[0]);
  }, [periode]);

  // Récupération des données
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", debut, fin],
    queryFn: async () => {
      const [resas, ops, deps, factures, chambres] = await Promise.all([
        supabase
          .from("reservations")
          .select("*, clients(nom, prenom, telephone), chambres(nom)")
          .neq("statut", "annulee")
          .gte("date_arrivee", debut)
          .lte("date_depart", fin)
          .order("date_arrivee", { ascending: false }),
        supabase
          .from("caisse_operations")
          .select("*")
          .gte("date_operation", `${debut}T00:00:00`)
          .lte("date_operation", `${fin}T23:59:59`)
          .order("date_operation", { ascending: false }),
        supabase
          .from("depenses")
          .select("*")
          .gte("date_depense", debut)
          .lte("date_depense", fin)
          .order("date_depense", { ascending: false }),
        supabase
          .from("factures")
          .select("*, clients(nom, prenom)")
          .gte("date_facture", debut)
          .lte("date_facture", fin)
          .order("date_facture", { ascending: false }),
        supabase
          .from("chambres")
          .select("id, nom, statut_nettoyage")
          .eq("actif", true)
          .order("nom"),
      ]);
      for (const r of [resas, ops, deps, factures, chambres]) if (r.error) throw r.error;
      return {
        reservations: resas.data ?? [],
        operations: ops.data ?? [],
        depenses: deps.data ?? [],
        factures: factures.data ?? [],
        chambres: chambres.data ?? [],
      };
    },
  });

  // Marquer notification comme lue
  const marquerCommeLue = useMutation({
    mutationFn: async ({ id, lue }: { id: string; lue: boolean }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ lue: lue })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification mise à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Marquer toutes comme lues
  const marquerToutesCommeLues = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ lue: true })
        .eq("lue", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Toutes les notifications ont été marquées comme lues.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Export CSV
  const exporterCSV = () => {
    if (!data) return;
    
    const headers = ["Type", "Date", "Description", "Montant", "Statut"];
    const rows: string[][] = [];
    
    data.reservations.forEach((r) => {
      rows.push([
        "Arrivée",
        formatDate(r.date_arrivee),
        `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
        "",
        r.statut,
      ]);
      rows.push([
        "Départ",
        formatDate(r.date_depart),
        `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
        "",
        r.statut,
      ]);
    });
    
    data.operations.forEach((o) => {
      rows.push([
        o.sens === "entree" ? "Encaissement" : "Décaissement",
        formatDate(o.date_operation),
        o.motif ?? "",
        formatFCFA(Number(o.montant)),
        o.statut ?? "",
      ]);
    });
    
    data.depenses.forEach((d) => {
      rows.push([
        "Dépense",
        formatDate(d.date_depense),
        d.libelle ?? "",
        formatFCFA(Number(d.montant)),
        d.categorie ?? "",
      ]);
    });
    
    data.factures.forEach((f) => {
      rows.push([
        "Facture",
        formatDate(f.date_facture),
        `${f.clients?.prenom ?? ""} ${f.clients?.nom ?? "Client"}`,
        formatFCFA(Number(f.montant_total)),
        f.statut ?? "",
      ]);
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("
");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notifications_${debut}_au_${fin}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Notifications exportées.");
  };

  // Filtrage et tri des notifications
  const notifications = useMemo(() => {
    if (!data) return [];
    
    const notifs: any[] = [];
    
    // Arrivées
    data.reservations.forEach((r) => {
      notifs.push({
        id: `arrivee-${r.id}`,
        type: "arrivees",
        date: r.date_arrivee,
        texte: `Check-in : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
        sousTexte: r.clients?.telephone ?? "",
        icone: ArrowDown,
        couleur: "text-green-600",
        bgCouleur: "bg-green-50",
        borderCouleur: "border-green-200",
        montant: null,
        lue: false,
      });
    });
    
    // Départs
    data.reservations.forEach((r) => {
      notifs.push({
        id: `depart-${r.id}`,
        type: "departs",
        date: r.date_depart,
        texte: `Check-out : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
        sousTexte: r.statut,
        icone: ArrowUp,
        couleur: "text-orange-600",
        bgCouleur: "bg-orange-50",
        borderCouleur: "border-orange-200",
        montant: null,
        lue: false,
      });
    });
    
    // Encaissements
    data.operations
      .filter((o) => o.sens === "entree")
      .forEach((o) => {
        notifs.push({
          id: `encaissement-${o.id}`,
          type: "encaissements",
          date: o.date_operation,
          texte: `Encaissement : ${o.motif ?? "Sans motif"}`,
          sousTexte: o.moyen_paiement ?? "",
          icone: Wallet,
          couleur: "text-blue-600",
          bgCouleur: "bg-blue-50",
          borderCouleur: "border-blue-200",
          montant: Number(o.montant),
          lue: false,
        });
      });
    
    // Dépenses
    data.depenses.forEach((d) => {
      notifs.push({
        id: `depense-${d.id}`,
        type: "depenses",
        date: d.date_depense,
        texte: `Dépense : ${d.libelle ?? "Sans libellé"}`,
        sousTexte: d.categorie ?? "",
        icone: TrendingDown,
        couleur: "text-red-500",
        bgCouleur: "bg-red-50",
        borderCouleur: "border-red-200",
        montant: Number(d.montant),
        lue: false,
      });
    });
    
    // Factures impayées
    data.factures
      .filter((f) => f.statut !== "payee")
      .forEach((f) => {
        notifs.push({
          id: `facture-${f.id}`,
          type: "alertes",
          date: f.date_facture,
          texte: `Facture impayée : ${f.clients?.prenom ?? ""} ${f.clients?.nom ?? "Client"}`,
          sousTexte: `N° ${f.numero}`,
          icone: AlertCircle,
          couleur: "text-amber-600",
          bgCouleur: "bg-amber-50",
          borderCouleur: "border-amber-200",
          montant: Number(f.montant_total),
          lue: false,
        });
      });
    
    // Chambres à nettoyer
    data.chambres
      .filter((c) => c.statut_nettoyage === "a_nettoyer")
      .forEach((c) => {
        notifs.push({
          id: `nettoyage-${c.id}`,
          type: "alertes",
          date: today(),
          texte: `Chambre à nettoyer : ${c.nom}`,
          sousTexte: "Statut: À nettoyer",
          icone: Info,
          couleur: "text-purple-600",
          bgCouleur: "bg-purple-50",
          borderCouleur: "border-purple-200",
          montant: null,
          lue: false,
        });
      });
    
    // Filtrage par type
    let filtered = notifs.filter((n) => {
      if (filtreType !== "tous" && n.type !== filtreType) return false;
      if (!afficherLues && n.lue) return false;
      if (recherche) {
        const terme = recherche.toLowerCase();
        return n.texte.toLowerCase().includes(terme) || n.sousTexte.toLowerCase().includes(terme);
      }
      return true;
    });
    
    // Tri
    filtered.sort((a, b) => {
      switch (tri) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "type":
          return a.type.localeCompare(b.type);
        case "montant-desc":
          return (b.montant ?? 0) - (a.montant ?? 0);
        case "montant-asc":
          return (a.montant ?? 0) - (b.montant ?? 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [data, filtreType, recherche, tri, afficherLues]);

  // Statistiques
  const stats = useMemo(() => {
    if (!data) return null;
    
    const arrivees = data.reservations.filter((r) => r.date_arrivee === today()).length;
    const departs = data.reservations.filter((r) => r.date_depart === today()).length;
    const encaissements = data.operations
      .filter((o) => o.sens === "entree")
      .reduce((s, o) => s + Number(o.montant), 0);
    const depenses = data.depenses.reduce((s, d) => s + Number(d.montant), 0);
    const facturesImpayees = data.factures.filter((f) => f.statut !== "payee").length;
    const chambresANettoyer = data.chambres.filter((c) => c.statut_nettoyage === "a_nettoyer").length;
    
    return {
      arrivees,
      departs,
      encaissements,
      depenses,
      facturesImpayees,
      chambresANettoyer,
      totalNotifications: notifications.length,
    };
  }, [data, notifications]);

  // Cartes de statistiques
  const kpis = [
    { 
      label: "Arrivées", 
      valeur: String(stats?.arrivees ?? 0), 
      icone: ArrowDown,
      couleur: "from-green-50 to-green-100",
      texteCouleur: "text-green-600",
      iconeCouleur: "from-green-500 to-green-600",
    },
    { 
      label: "Départs", 
      valeur: String(stats?.departs ?? 0), 
      icone: ArrowUp,
      couleur: "from-orange-50 to-orange-100",
      texteCouleur: "text-orange-600",
      iconeCouleur: "from-orange-500 to-orange-600",
    },
    { 
      label: "Encaissements", 
      valeur: formatFCFA(stats?.encaissements ?? 0), 
      icone: Wallet,
      couleur: "from-blue-50 to-blue-100",
      texteCouleur: "text-blue-600",
      iconeCouleur: "from-blue-500 to-blue-600",
    },
    { 
      label: "Dépenses", 
      valeur: formatFCFA(stats?.depenses ?? 0), 
      icone: TrendingDown,
      couleur: "from-red-50 to-red-100",
      texteCouleur: "text-red-600",
      iconeCouleur: "from-red-500 to-red-600",
    },
    { 
      label: "Factures impayées", 
      valeur: String(stats?.facturesImpayees ?? 0), 
      icone: AlertCircle,
      couleur: "from-amber-50 to-amber-100",
      texteCouleur: "text-amber-600",
      iconeCouleur: "from-amber-500 to-amber-600",
    },
    { 
      label: "Chambres à nettoyer", 
      valeur: String(stats?.chambresANettoyer ?? 0), 
      icone: Info,
      couleur: "from-purple-50 to-purple-100",
      texteCouleur: "text-purple-600",
      iconeCouleur: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-bg">
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <PageHeader 
          title="Notifications" 
          description="Toutes les alertes et notifications de l'établissement"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={exporterCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </div>
          }
        />

        {/* STATISTIQUES */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-6">
          {kpis.map((k, index) => {
            const Icone = k.icone;
            return (
              <Card key={index} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br border-0">
                <CardContent className={`p-4 bg-gradient-to-br ${k.couleur}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {k.label}
                      </p>
                      <p className={`text-xl font-bold mt-1 ${k.texteCouleur}`}>
                        {k.valeur}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full bg-gradient-to-br ${k.iconeCouleur} text-white shadow-lg`}>
                      <Icone className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FILTRES ET RECHERCHE */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Période */}
              <div className="flex flex-wrap gap-2">
                {PERIODES.map((p) => (
                  <Button
                    key={p.id}
                    variant={periode === p.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriode(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {/* Période personnalisée */}
              {periode === "personnalisee" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Du</Label>
                    <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Au</Label>
                    <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Recherche et filtres */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Rechercher une notification..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-9"
                  />
                  {recherche && (
                    <button
                      onClick={() => setRecherche("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={filtreType} onValueChange={setFiltreType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_NOTIFICATIONS.map((t) => {
                        const Icone = t.icone;
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <Icone className="w-4 h-4" />
                              {t.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Select value={tri} onValueChange={setTri}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (récent)</SelectItem>
                      <SelectItem value="date-asc">Date (ancien)</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="montant-desc">Montant (↑)</SelectItem>
                      <SelectItem value="montant-asc">Montant (↓)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={afficherLues ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAfficherLues(!afficherLues)}
                  >
                    {afficherLues ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Lues
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Non lues
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => marquerToutesCommeLues.mutate()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tout marquer lu
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LISTE DES NOTIFICATIONS */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">Aucune notification</p>
                <p className="text-sm text-gray-500 mt-1">
                  Aucune notification trouvée pour cette période.
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((n) => {
              const Icone = n.icone;
              return (
                <Card 
                  key={n.id}
                  className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 ${n.borderCouleur}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-full ${n.bgCouleur}`}>
                        <Icone className={`w-5 h-5 ${n.couleur}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{n.texte}</p>
                            {n.sousTexte && (
                              <p className="text-sm text-gray-600 mt-0.5">{n.sousTexte}</p>
                            )}
                            {n.montant && (
                              <p className="text-sm font-semibold text-gray-700 mt-1">
                                {formatFCFA(n.montant)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {formatDate(n.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={n.couleur}>
                              {n.type}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => marquerCommeLue.mutate({ id: n.id, lue: !n.lue })}
                            >
                              {n.lue ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-blue-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* TOTAL */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              <strong>{notifications.length}</strong> notification{notifications.length > 1 ? "s" : ""} affichée{notifications.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}