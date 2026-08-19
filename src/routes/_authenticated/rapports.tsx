import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, Download, TrendingUp, TrendingDown, Wallet, FileText, Calendar, Home, DollarSign, AlertCircle, CheckCircle, XCircle, Clock, PieChart, BarChart3, Users } from "lucide-react";
import { useEtablissement } from "@/hooks/use-hotel";
import { PageHeader } from "@/components/AppLayout";
import { DocumentHeader } from "@/components/Brand";
import { formatFCFA, formatDate, today, nbNuits } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Rapports d'activité de LE DAYA Guest House : chiffre d'affaires, dépenses, taxe et occupation.",
      },
      { property: "og:title", content: "Rapports — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Synthèse financière et taux d'occupation par période." },
    ],
  }),
  component: RapportsPage,
});

const COULEURS_CATEGORIES = {
  "Achats": "#3b82f6",
  "Énergie & eau": "#f59e0b",
  "Salaires": "#10b981",
  "Entretien": "#8b5cf6",
  "Transport": "#ef4444",
  "Taxes & impôts": "#6b7280",
  "Divers": "#64748b",
};

function RapportsPage() {
  const { data: etab } = useEtablissement();
  
  // États pour les filtres
  const [debut, setDebut] = useState(`${today().slice(0, 7)}-01`);
  const [fin, setFin] = useState(today());
  const [periodePredefinie, setPeriodePredefinie] = useState<string>("mois-en-cours");
  const [chambreFiltre, setChambreFiltre] = useState<string>("toutes");
  
  // Récupération des données
  const { data, isLoading } = useQuery({
    queryKey: ["rapports", debut, fin],
    queryFn: async () => {
      const [factures, depenses, taxes, chambres, reservations, pcs] = await Promise.all([
        supabase
          .from("factures")
          .select("*")
          .gte("date_facture", debut)
          .lte("date_facture", fin),
        supabase
          .from("depenses")
          .select("*")
          .gte("date_depense", debut)
          .lte("date_depense", fin),
        supabase
          .from("taxes_sejour")
          .select("*")
          .gte("date_nuitee", debut)
          .lte("date_nuitee", fin),
        supabase.from("chambres").select("id, nom, actif").eq("actif", true),
        supabase
          .from("reservations")
          .select("*, chambres(nom)")
          .neq("statut", "annulee")
          .gte("date_arrivee", debut)
          .lte("date_arrivee", fin),
        supabase
          .from("pieces_caisse")
          .select("*")
          .gte("date_piece", debut)
          .lte("date_piece", fin),
      ]);
      if (factures.error) throw factures.error;
      if (depenses.error) throw depenses.error;
      if (taxes.error) throw taxes.error;
      if (chambres.error) throw chambres.error;
      if (reservations.error) throw reservations.error;
      if (pcs.error) throw pcs.error;
      return {
        factures: factures.data,
        depenses: depenses.data,
        taxes: taxes.data,
        chambres: chambres.data,
        reservations: reservations.data,
        pcs: pcs.data,
      };
    },
  });

  // Calcul des KPI
  const ca = (data?.factures ?? []).reduce((s, f) => s + Number(f.montant_hebergement), 0);
  const caTotal = (data?.factures ?? []).reduce((s, f) => s + Number(f.montant_total), 0);
  const impayes = (data?.factures ?? [])
    .filter((f) => f.statut !== "payee")
    .reduce((s, f) => s + Number(f.montant_total), 0);
  const totalDepenses = (data?.depenses ?? []).reduce((s, d) => s + Number(d.montant), 0);
  const totalTaxe = (data?.taxes ?? []).reduce((s, t) => s + Number(t.montant_total), 0);
  const resultat = ca - totalDepenses;

  const joursPeriode = Math.max(1, nbNuits(debut, fin) || 1);
  const nbChambres = (data?.chambres ?? []).length || 1;
  const nuitsVendues = (data?.reservations ?? []).reduce(
    (s, r) => s + nbNuits(r.date_arrivee, r.date_depart),
    0,
  );
  const occupation = Math.round((nuitsVendues / (joursPeriode * nbChambres)) * 100);

  // Performance par chambre
  const parChambre = useMemo(() => {
    return (data?.chambres ?? [])
      .filter((c) => chambreFiltre === "toutes" || c.id === chambreFiltre)
      .map((c) => {
        const resas = (data?.reservations ?? []).filter((r) => r.chambre_id === c.id);
        const nuits = resas.reduce((s, r) => s + nbNuits(r.date_arrivee, r.date_depart), 0);
        const revenu = resas.reduce(
          (s, r) => s + nbNuits(r.date_arrivee, r.date_depart) * Number(r.prix_nuit),
          0,
        );
        return { nom: c.nom, sejours: resas.length, nuits, revenu };
      })
      .sort((a, b) => b.revenu - a.revenu);
  }, [data?.chambres, data?.reservations, chambreFiltre]);

  // Dépenses par catégorie
  const depensesParCategorie = useMemo(() => {
    const categories = Object.keys(COULEURS_CATEGORIES);
    return categories.map((cat) => ({
      categorie: cat,
      total: (data?.depenses ?? [])
        .filter((d) => d.categorie === cat)
        .reduce((s, d) => s + Number(d.montant), 0),
    })).filter((c) => c.total > 0);
  }, [data?.depenses]);

  // Évolution du CA par jour
  const evolutionCA = useMemo(() => {
    const jours = [];
    const debutDate = new Date(debut);
    const finDate = new Date(fin);
    
    for (let d = new Date(debutDate); d <= finDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const caJour = (data?.factures ?? [])
        .filter((f) => f.date_facture === dateStr)
        .reduce((s, f) => s + Number(f.montant_hebergement), 0);
      const depensesJour = (data?.depenses ?? [])
        .filter((d) => d.date_depense === dateStr)
        .reduce((s, d) => s + Number(d.montant), 0);
      jours.push({
        date: formatDate(dateStr),
        ca: caJour,
        depenses: depensesJour,
        resultat: caJour - depensesJour,
      });
    }
    
    return jours.slice(-30); // Max 30 jours
  }, [data?.factures, data?.depenses, debut, fin]);

  // KPIs
  const kpis = [
    { 
      label: "CA hébergement", 
      valeur: formatFCFA(ca), 
      icone: DollarSign,
      couleur: "from-emerald-50 to-emerald-100",
      texteCouleur: "text-emerald-600",
      iconeCouleur: "from-emerald-500 to-emerald-600",
    },
    { 
      label: "Encaissements facturés", 
      valeur: formatFCFA(caTotal), 
      icone: Wallet,
      couleur: "from-blue-50 to-blue-100",
      texteCouleur: "text-blue-600",
      iconeCouleur: "from-blue-500 to-blue-600",
    },
    { 
      label: "Factures impayées", 
      valeur: formatFCFA(impayes), 
      icone: AlertCircle,
      couleur: "from-red-50 to-red-100",
      texteCouleur: "text-red-600",
      iconeCouleur: "from-red-500 to-red-600",
    },
    { 
      label: "Dépenses", 
      valeur: formatFCFA(totalDepenses), 
      icone: TrendingDown,
      couleur: "from-orange-50 to-orange-100",
      texteCouleur: "text-orange-600",
      iconeCouleur: "from-orange-500 to-orange-600",
    },
    { 
      label: "Taxe de séjour", 
      valeur: formatFCFA(totalTaxe), 
      icone: FileText,
      couleur: "from-purple-50 to-purple-100",
      texteCouleur: "text-purple-600",
      iconeCouleur: "from-purple-500 to-purple-600",
    },
    { 
      label: "Résultat", 
      valeur: formatFCFA(resultat), 
      icone: resultat >= 0 ? TrendingUp : TrendingDown,
      couleur: resultat >= 0 ? "from-emerald-50 to-emerald-100" : "from-red-50 to-red-100",
      texteCouleur: resultat >= 0 ? "text-emerald-600" : "text-red-600",
      iconeCouleur: resultat >= 0 ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600",
    },
    { 
      label: "Taux d'occupation", 
      valeur: `${isFinite(occupation) ? occupation : 0} %`, 
      icone: Home,
      couleur: "from-cyan-50 to-cyan-100",
      texteCouleur: "text-cyan-600",
      iconeCouleur: "from-cyan-500 to-cyan-600",
    },
    { 
      label: "Nuits vendues", 
      valeur: String(nuitsVendues), 
      icone: Calendar,
      couleur: "from-pink-50 to-pink-100",
      texteCouleur: "text-pink-600",
      iconeCouleur: "from-pink-500 to-pink-600",
    },
  ];

  // Export CSV
  const exporterCSV = () => {
    const headers = ["KPI", "Valeur"];
    const rows = kpis.map((k) => [k.label, k.valeur]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_${debut}_au_${fin}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Gestion des périodes prédéfinies
  const appliquerPeriode = (periode: string) => {
    setPeriodePredefinie(periode);
    const aujourdhui = new Date();
    let newDebut = new Date();
    let newFin = new Date();
    
    switch (periode) {
      case "aujourd'hui":
        newDebut = aujourdhui;
        newFin = aujourdhui;
        break;
      case "semaine":
        newDebut = new Date(aujourdhui);
        newDebut.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1);
        break;
      case "mois-en-cours":
        newDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
        break;
      case "mois-dernier":
        newDebut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
        newFin = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);
        break;
      case "annee":
        newDebut = new Date(aujourdhui.getFullYear(), 0, 1);
        break;
    }
    
    setDebut(newDebut.toISOString().split('T')[0]);
    setFin(newFin.toISOString().split('T')[0]);
  };

  // Données pour le graphique en camembert
  const dataPieChart = depensesParCategorie.map((c) => ({
    name: c.categorie,
    value: c.total,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-bg">
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Rapports"
          description="Synthèse d'activité sur la période choisie"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exporterCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" className="no-print" onClick={() => window.print()}>
                <Printer className="size-4 mr-2" /> Imprimer / PDF
              </Button>
            </div>
          }
        />

        {/* FILTRES */}
        <Card className="no-print mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Période prédéfinie */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodePredefinie === "aujourd'hui" ? "default" : "outline"}
                  size="sm"
                  onClick={() => appliquerPeriode("aujourd'hui")}
                >
                  Aujourd'hui
                </Button>
                <Button
                  variant={periodePredefinie === "semaine" ? "default" : "outline"}
                  size="sm"
                  onClick={() => appliquerPeriode("semaine")}
                >
                  Cette semaine
                </Button>
                <Button
                  variant={periodePredefinie === "mois-en-cours" ? "default" : "outline"}
                  size="sm"
                  onClick={() => appliquerPeriode("mois-en-cours")}
                >
                  Ce mois-ci
                </Button>
                <Button
                  variant={periodePredefinie === "mois-dernier" ? "default" : "outline"}
                  size="sm"
                  onClick={() => appliquerPeriode("mois-dernier")}
                >
                  Mois dernier
                </Button>
                <Button
                  variant={periodePredefinie === "annee" ? "default" : "outline"}
                  size="sm"
                  onClick={() => appliquerPeriode("annee")}
                >
                  Cette année
                </Button>
              </div>

              {/* Période personnalisée */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Du</Label>
                  <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Au</Label>
                  <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Chambre</Label>
                  <Select value={chambreFiltre} onValueChange={setChambreFiltre}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">Toutes chambres</SelectItem>
                      {(data?.chambres ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DOCUMENT HEADER */}
        <div className="print-area">
          <DocumentHeader
            titre="Rapport d'activité"
            sousTitre={`Période du ${formatDate(debut)} au ${formatDate(fin)}`}
            etablissement={etab}
          />

          {/* CARTES DE SYNTHÈSE */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {kpis.map((k, index) => {
              const Icone = k.icone;
              return (
                <Card key={index} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br border-0">
                  <CardContent className={`p-6 bg-gradient-to-br ${k.couleur}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {k.label}
                        </p>
                        <p className={`text-2xl font-bold mt-1 ${k.texteCouleur}`}>
                          {k.valeur}
                        </p>
                      </div>
                      <div className={`p-4 rounded-full bg-gradient-to-br ${k.iconeCouleur} text-white shadow-lg`}>
                        <Icone className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* GRAPHIQUES */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Évolution du CA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Évolution du CA et des dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionCA.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionCA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatFCFA(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ca" name="CA" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="resultat" name="Résultat" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée sur la période
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Répartition des dépenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Répartition des dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dataPieChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={dataPieChart}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatFCFA(value)}`}
                      >
                        {dataPieChart.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COULEURS_CATEGORIES[entry.name as keyof typeof COULEURS_CATEGORIES] || "#64748b"} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatFCFA(value)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucune dépense sur la période
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PERFORMANCE PAR CHAMBRE */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="w-4 h-4" />
                Performance par chambre
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chambre</TableHead>
                    <TableHead>Séjours</TableHead>
                    <TableHead>Nuits</TableHead>
                    <TableHead className="text-right">Revenu hébergement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parChambre.map((c) => (
                    <TableRow key={c.nom}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {c.nom[0]}
                          </div>
                          {c.nom}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.sejours}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {c.nuits}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {formatFCFA(c.revenu)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parChambre.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucune donnée sur la période.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ALERTES */}
          {(impayes > caTotal * 0.2 || totalDepenses > ca * 0.7 || !isFinite(occupation) || occupation < 30) && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  Alertes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-amber-700">
                  {impayes > caTotal * 0.2 && (
                    <li className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Nombre élevé de factures impayées ({formatFCFA(impayes)})
                    </li>
                  )}
                  {totalDepenses > ca * 0.7 && (
                    <li className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Dépenses élevées par rapport au CA ({Math.round((totalDepenses / ca) * 100)}%)
                    </li>
                  )}
                  {(!isFinite(occupation) || occupation < 30) && (
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Taux d'occupation faible ({isFinite(occupation) ? occupation : 0}%)
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}