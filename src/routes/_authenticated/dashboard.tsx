import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BedDouble,
  CalendarCheck,
  Wallet,
  TrendingDown,
  Users,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  X,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/AppLayout";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { formatFCFA, formatDate, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Vue d'ensemble quotidienne de LE DAYA Guest House : occupation, arrivées, recettes, dépenses et taxe de séjour.",
      },
      { property: "og:title", content: "Tableau de bord — LE DAYA Hotel Manager" },
      {
        property: "og:description",
        content: "Occupation, recettes et activité du jour de LE DAYA Guest House.",
      },
    ],
  }),
  component: Dashboard,
});

// ============================================================
// COMPOSANT STAT CARD
// ============================================================
function StatCard({
  titre,
  valeur,
  detail,
  icon: Icon,
  to,
  variation,
  couleur,
}: {
  titre: string;
  valeur: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  variation?: { texte: string; hausse: boolean } | null;
  couleur: {
    from: string;
    to: string;
    shadow: string;
  };
}) {
  const contenu = (
    <Card className="group h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
      <CardContent className="flex h-full items-start gap-4 p-5">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${couleur.from} ${couleur.to} shadow-lg ${couleur.shadow} transition-transform group-hover:scale-110`}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {titre}
            </p>
            {variation ? (
              <span
                className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  variation.hausse
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                }`}
              >
                {variation.hausse ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {variation.texte}
              </span>
            ) : null}
          </div>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {valeur}
          </p>
          {detail ? (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {detail}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded-3xl"
      >
        {contenu}
      </Link>
    );
  }

  return contenu;
}

// ============================================================
// COMPOSANT POUR L'ÉTAT DES CHAMBRES
// ============================================================
function ChambreItem({
  nom,
  type,
  statut,
  prix,
  couleur,
  bgCouleur,
}: {
  nom: string;
  type: string;
  statut: string;
  prix: string;
  couleur: string;
  bgCouleur: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${bgCouleur} transition-colors min-h-[48px]`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {nom}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {type}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium ${couleur}`}>{statut}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {prix}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
function Dashboard() {
  const jour = today();
  const debutMoisDernierGlobal = new Date(
    new Date(jour).getFullYear(),
    new Date(jour).getMonth() - 1,
    1
  )
    .toISOString()
    .slice(0, 10);
  const finMoisDernierGlobal = new Date(
    new Date(jour).getFullYear(),
    new Date(jour).getMonth(),
    0
  )
    .toISOString()
    .slice(0, 10);
  const [periode, setPeriode] = useState("jour");
  const [rapportPeriode, setRapportPeriode] = useState("mois_actuel");
  const [evolutionVue, setEvolutionVue] = useState<"mois" | "annee">("mois");
  const [actionsRapides, setActionsRapides] = useState([
    { id: 1, label: "Réservation", to: "/reservations", icon: CalendarCheck, color: "from-red-500 to-rose-600" },
    { id: 2, label: "Client", to: "/clients", icon: Users, color: "from-blue-500 to-indigo-600" },
    { id: 3, label: "Encaissement", to: "/caisse", icon: Wallet, color: "from-emerald-500 to-teal-600" },
    { id: 4, label: "Dépense", to: "/depenses", icon: TrendingDown, color: "from-amber-500 to-orange-600" },
  ]);

  const [showAddAction, setShowAddAction] = useState(false);

  const actionsDisponibles = [
    { label: "Chambres", to: "/chambres", icon: BedDouble, color: "from-purple-500 to-violet-600" },
    { label: "Facturation", to: "/factures", icon: FileText, color: "from-cyan-500 to-blue-600" },
    { label: "Rapports", to: "/rapports", icon: BarChart3, color: "from-indigo-500 to-purple-600" },
    { label: "Paramètres", to: "/parametres", icon: Settings, color: "from-slate-500 to-gray-600" },
  ];

  const ajouterAction = (action: any) => {
    const nouvelleAction = {
      id: Date.now(),
      label: action.label,
      to: action.to,
      icon: action.icon,
      color: action.color,
    };
    setActionsRapides([...actionsRapides, nouvelleAction]);
    setShowAddAction(false);
  };

  const supprimerAction = (id: number) => {
    setActionsRapides(actionsRapides.filter((a) => a.id !== id));
  };

  const dateDebut =
    periode === "semaine"
      ? new Date(new Date(jour).setDate(new Date(jour).getDate() - 6))
          .toISOString()
          .slice(0, 10)
      : periode === "mois"
      ? `${jour.slice(0, 7)}-01`
      : periode === "annee"
      ? `${jour.slice(0, 4)}-01-01`
      : jour;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", jour, dateDebut],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const [chambres, resas, ops, deps, taxes, clients] = await Promise.all([
        supabase.from("chambres").select("*").eq("actif", true).order("nom"),
        supabase
          .from("reservations")
          .select("*, clients(nom, prenom), chambres(nom)")
          .neq("statut", "annulee")
          .order("date_arrivee"),
        supabase
          .from("caisse_operations")
          .select("*")
          .gte(
            "date_operation",
            `${new Date(new Date(dateDebut).getTime() - 86400000)
              .toISOString()
              .slice(0, 10)}T00:00:00`
          ),
        supabase
          .from("depenses")
          .select("*")
          .gte("date_depense", dateDebut)
          .lte("date_depense", jour),
        supabase.from("taxes_sejour").select("*").lte("date_nuitee", jour),
        supabase.from("clients").select("id"),
      ]);
      for (const r of [chambres, resas, ops, deps, taxes, clients])
        if (r.error) throw r.error;
      return {
        chambres: chambres.data ?? [],
        reservations: resas.data ?? [],
        operations: ops.data ?? [],
        depenses: deps.data ?? [],
        taxes: taxes.data ?? [],
        clients: clients.data ?? [],
      };
    },
  });

  const { data: caMoisDernierData } = useQuery({
    queryKey: ["ca-mois-dernier", jour],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisse_operations")
        .select("montant")
        .eq("sens", "entree")
        .gte("date_operation", `${debutMoisDernierGlobal}T00:00:00`)
        .lte("date_operation", `${finMoisDernierGlobal}T23:59:59`);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: evolutionData } = useQuery({
    queryKey: ["evolution-ca", evolutionVue, jour],
    queryFn: async () => {
      const depuis =
        evolutionVue === "mois"
          ? new Date(
              new Date(jour).getFullYear(),
              new Date(jour).getMonth() - 11,
              1
            )
              .toISOString()
              .slice(0, 10)
          : `${new Date(jour).getFullYear() - 5}-01-01`;
      const { data, error } = await supabase
        .from("caisse_operations")
        .select("montant, date_operation")
        .eq("sens", "entree")
        .gte("date_operation", `${depuis}T00:00:00`);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Chargement du tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // CALCULS
  // ============================================================
  const enCours = data.reservations.filter(
    (r) =>
      r.statut === "en_cours" ||
      (r.date_arrivee <= jour && r.date_depart > jour)
  );
  const occupees = new Set(enCours.map((r) => r.chambre_id));
  const arrivees = data.reservations.filter(
    (r) => r.date_arrivee >= dateDebut && r.date_arrivee <= jour
  );
  const departs = data.reservations.filter(
    (r) => r.date_depart >= dateDebut && r.date_depart <= jour
  );

  const totalChambres = data.chambres.length;

  const nuitsDisponibles =
    totalChambres *
    (Math.floor(
      (new Date(jour).getTime() - new Date(dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1);

  const nuitsOccupees = data.reservations.reduce((total, r) => {
    const debutReservation = new Date(r.date_arrivee);
    const finReservation = new Date(r.date_depart);
    const debutPeriode = new Date(dateDebut);
    const finPeriode = new Date(new Date(jour).getTime() + 24 * 60 * 60 * 1000);

    const debutEffectif =
      debutReservation > debutPeriode ? debutReservation : debutPeriode;

    const finEffectif =
      finReservation < finPeriode ? finReservation : finPeriode;

    const nuits = Math.max(
      0,
      Math.floor(
        (finEffectif.getTime() - debutEffectif.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    return total + nuits;
  }, 0);

  const hier = new Date(new Date(jour).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  const occupeesHier = new Set(
    data.reservations
      .filter((r) => r.date_arrivee <= hier && r.date_depart > hier)
      .map((r) => r.chambre_id)
  );
  const arriveesHier = data.reservations.filter(
    (r) => r.date_arrivee === hier
  ).length;
  const departsHier = data.reservations.filter((r) => r.date_depart === hier)
    .length;
  const enCoursHier = occupeesHier.size;

  const debutMoisActuel = `${jour.slice(0, 7)}-01`;
  const caMoisActuel = data.operations
    .filter(
      (o) =>
        o.sens === "entree" &&
        o.date_operation.slice(0, 10) >= debutMoisActuel
    )
    .reduce((s, o) => s + Number(o.montant), 0);

  const caMoisDernier = (caMoisDernierData ?? []).reduce(
    (s, o) => s + Number(o.montant),
    0
  );

  function variation(actuel: number, precedent: number): {
    texte: string;
    hausse: boolean;
  } | null {
    if (precedent === 0 && actuel === 0) return null;
    if (precedent === 0) return { texte: "Nouveau", hausse: true };
    const pct = Math.round(((actuel - precedent) / precedent) * 100);
    return { texte: `${pct >= 0 ? "+" : ""}${pct}%`, hausse: pct >= 0 };
  }

  const varOccupation =
    periode === "jour" ? variation(occupees.size, occupeesHier.size) : null;
  const varArrivees =
    periode === "jour" ? variation(arrivees.length, arriveesHier) : null;
  const varDeparts =
    periode === "jour" ? variation(departs.length, departsHier) : null;
  const varCA = variation(caMoisActuel, caMoisDernier);
  const varEnCours =
    periode === "jour" ? variation(enCours.length, enCoursHier) : null;

  const maintenant = new Date(jour);
  let rapportDebut: Date;
  let rapportFin: Date;
  let rapportLabel: string;

  if (rapportPeriode === "mois_actuel") {
    rapportDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    rapportFin = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() + 1,
      1
    );
    rapportLabel = maintenant.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } else if (rapportPeriode === "mois_dernier") {
    rapportDebut = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() - 1,
      1
    );
    rapportFin = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    rapportLabel = rapportDebut.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } else if (rapportPeriode === "annee_actuelle") {
    rapportDebut = new Date(maintenant.getFullYear(), 0, 1);
    rapportFin = new Date(maintenant.getFullYear() + 1, 0, 1);
    rapportLabel = String(maintenant.getFullYear());
  } else {
    rapportDebut = new Date(maintenant.getFullYear() - 1, 0, 1);
    rapportFin = new Date(maintenant.getFullYear(), 0, 1);
    rapportLabel = String(maintenant.getFullYear() - 1);
  }

  const nuitsVenduesPeriode = data.reservations.reduce((total, r) => {
    const debutR = new Date(r.date_arrivee);
    const finR = new Date(r.date_depart);
    const debutEff = debutR > rapportDebut ? debutR : rapportDebut;
    const finEff = finR < rapportFin ? finR : rapportFin;
    const nuits = Math.max(
      0,
      Math.round(
        (finEff.getTime() - debutEff.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    return total + nuits;
  }, 0);

  const joursDansRapport = Math.max(
    1,
    Math.round((rapportFin.getTime() - rapportDebut.getTime()) / 86400000)
  );

  const nuitsDisponiblesRapport = totalChambres * joursDansRapport;
  const tauxOccupationRapport =
    nuitsDisponiblesRapport > 0
      ? Math.round((nuitsVenduesPeriode / nuitsDisponiblesRapport) * 100)
      : 0;

  const groupesCA: Record<string, number> = {};
  (evolutionData ?? []).forEach((o) => {
    const d = o.date_operation.slice(0, 10);
    const cle = evolutionVue === "mois" ? d.slice(0, 7) : d.slice(0, 4);
    groupesCA[cle] = (groupesCA[cle] ?? 0) + Number(o.montant);
  });

  const evolutionCA = Object.entries(groupesCA)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, montant]) => ({
      label:
        evolutionVue === "mois"
          ? new Date(`${cle}-01`).toLocaleDateString("fr-FR", {
              month: "short",
              year: "2-digit",
            })
          : cle,
      montant,
    }));

  const activiteRecente = [...data.reservations]
    .filter((r) => r.created_at)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5)
    .map((r) => ({
      texte: `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${
        r.chambres?.nom ?? ""
      }`,
      heure: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      statut: r.statut,
    }));

  const statutColors: Record<string, string> = {
    reservee: "bg-amber-500",
    en_cours: "bg-emerald-500",
    terminee: "bg-blue-500",
    annulee: "bg-red-500",
  };

  // ============================================================
  // COULEURS DES STAT CARDS
  // ============================================================
  const couleursStatCards = [
    {
      from: "from-emerald-500",
      to: "to-emerald-600",
      shadow: "shadow-emerald-500/25",
    },
    {
      from: "from-amber-500",
      to: "to-amber-600",
      shadow: "shadow-amber-500/25",
    },
    {
      from: "from-blue-500",
      to: "to-blue-600",
      shadow: "shadow-blue-500/25",
    },
    {
      from: "from-red-500",
      to: "to-red-600",
      shadow: "shadow-red-500/25",
    },
    {
      from: "from-purple-500",
      to: "to-purple-600",
      shadow: "shadow-purple-500/25",
    },
  ];

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="space-y-6">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {formatDate(jour)} — Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-red-200/30 px-3 py-1.5 text-xs font-medium rounded-full">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />
            En direct
          </Badge>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[140px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-white/20 dark:border-slate-700/50 rounded-2xl">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jour">Aujourd'hui</SelectItem>
              <SelectItem value="semaine">Cette semaine</SelectItem>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="annee">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          titre="Occupation"
          valeur={`${occupees.size}/${totalChambres}`}
          detail={`${totalChambres - occupees.size} disponible(s)`}
          icon={BedDouble}
          to="/chambres"
          variation={varOccupation}
          couleur={couleursStatCards[0]}
        />
        <StatCard
          titre="Arrivées"
          valeur={String(arrivees.length)}
          detail={arrivees.length === 0 ? "Aucune" : "Prévue(s)"}
          icon={ArrowDown}
          to="/reservations"
          variation={varArrivees}
          couleur={couleursStatCards[1]}
        />
        <StatCard
          titre="Départs"
          valeur={String(departs.length)}
          detail={departs.length === 0 ? "Aucun" : "Prévu(s)"}
          icon={ArrowUp}
          to="/reservations"
          variation={varDeparts}
          couleur={couleursStatCards[2]}
        />
        <StatCard
          titre="CA du mois"
          valeur={formatFCFA(caMoisActuel)}
          detail={`vs ${formatFCFA(caMoisDernier)}`}
          icon={Wallet}
          to="/caisse"
          variation={varCA}
          couleur={couleursStatCards[3]}
        />
        <StatCard
          titre="En cours"
          valeur={String(enCours.length)}
          detail={`${enCours.length} réservation(s)`}
          icon={Users}
          to="/reservations"
          variation={varEnCours}
          couleur={couleursStatCards[4]}
        />
      </div>

      {/* GRAPHIQUE CA + NUITS VENDUES */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Évolution CA */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25">
                <Wallet className="size-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                Évolution du CA
              </CardTitle>
            </div>
            <Select
              value={evolutionVue}
              onValueChange={(v) => setEvolutionVue(v as "mois" | "annee")}
            >
              <SelectTrigger className="w-[120px] bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/50 rounded-xl text-xs dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois">Par mois</SelectItem>
                <SelectItem value="annee">Par année</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="w-full overflow-hidden">
            <ChartContainer
              config={{ montant: { label: "CA", color: "#ef4444" } }}
              className="h-[220px] w-full"
            >
              <AreaChart
                data={evolutionCA}
                margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={11}
                  tick={{ fill: "#94A3B8" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  fontSize={11}
                  width={35}
                  tick={{ fill: "#94A3B8" }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatFCFA(Number(value))}
                      className="bg-slate-900/95 text-white border-slate-800 rounded-xl dark:bg-slate-900 dark:text-white"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="montant"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#caGradient)"
                  animationDuration={900}
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
            {evolutionCA.length === 0 && (
              <p className="mt-2 text-center text-sm text-slate-400 dark:text-slate-500">
                Aucune donnée pour cette période.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Nuits vendues */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <BedDouble className="size-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
                Nuits vendues
              </CardTitle>
            </div>
            <Select value={rapportPeriode} onValueChange={setRapportPeriode}>
              <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/50 rounded-xl text-xs dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois_actuel">Ce mois</SelectItem>
                <SelectItem value="mois_dernier">Mois dernier</SelectItem>
                <SelectItem value="annee_actuelle">Cette année</SelectItem>
                <SelectItem value="annee_derniere">Année dernière</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
              <div className="relative h-[160px] w-[160px]">
                <ChartContainer config={{}} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Vendues",
                          value: nuitsVenduesPeriode,
                          couleur: "#ef4444",
                        },
                        {
                          name: "Disponibles",
                          value: Math.max(
                            0,
                            nuitsDisponiblesRapport - nuitsVenduesPeriode
                          ),
                          couleur: "#E5E7EB",
                        },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={2}
                      cornerRadius={4}
                      animationDuration={800}
                    >
                      <Cell fill="#ef4444" stroke="none" />
                      <Cell fill="#E5E7EB" stroke="none" />
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {tauxOccupationRapport}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Occupation
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {nuitsVenduesPeriode}{" "}
                    <span className="text-base font-normal text-slate-400 dark:text-slate-500">
                      / {nuitsDisponiblesRapport}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                    nuit(s) — {rapportLabel}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-500 dark:text-slate-400">Vendues</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {nuitsVenduesPeriode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-gray-300 dark:bg-slate-600" />
                  <span className="text-slate-500 dark:text-slate-400">Disponibles</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {Math.max(0, nuitsDisponiblesRapport - nuitsVenduesPeriode)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ÉTAT DES CHAMBRES + ACTIVITÉ RÉCENTE + ACTIONS */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* État des chambres */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
              État des chambres
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <BedDouble className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Dispo
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" /> Réservée
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" /> Occupée
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-400" /> Nettoyage
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-purple-500" /> Maintenance
              </span>
            </div>

            <div className="space-y-1.5">
              {data.chambres.slice(0, 5).map((c) => {
                const occupee = occupees.has(c.id);
                const reservee = data.reservations.some(
                  (r) => r.chambre_id === c.id && r.statut === "reservee"
                );
                const statut = occupee
                  ? "Occupée"
                  : reservee
                  ? "Réservée"
                  : "Disponible";
                const couleur = occupee
                  ? "text-red-500 dark:text-red-400"
                  : reservee
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-500 dark:text-emerald-400";
                const bgCouleur = occupee
                  ? "bg-red-50 dark:bg-red-900/20"
                  : reservee
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-emerald-50 dark:bg-emerald-900/20";

                return (
                  <ChambreItem
                    key={c.id}
                    nom={c.nom}
                    type={c.type || ""}
                    statut={statut}
                    prix={formatFCFA(c.prix_nuit)}
                    couleur={couleur}
                    bgCouleur={bgCouleur}
                  />
                );
              })}
              {data.chambres.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Aucune chambre.</p>
              )}
            </div>

            {data.chambres.length > 5 && (
              <Link
                to="/chambres"
                className="mt-3 flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                Voir toutes <Eye className="size-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
              Activité récente
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activiteRecente.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                Aucune activité récente
              </p>
            ) : (
              activiteRecente.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors min-h-[48px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`size-2 rounded-full ${
                        statutColors[a.statut] || "bg-slate-300"
                      }`}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {a.texte}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {a.heure}
                  </span>
                </div>
              ))
            )}
            <Link
              to="/reservations"
              className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors pt-1"
            >
              Voir tout <Eye className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">
              Actions rapides
            </CardTitle>
            <button
              onClick={() => setShowAddAction(!showAddAction)}
              className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            >
              <Plus className="size-4" />
            </button>
          </CardHeader>
          <CardContent>
            {showAddAction && (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Ajouter une action :
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {actionsDisponibles
                    .filter(
                      (a) =>
                        !actionsRapides.some(
                          (existing) => existing.label === a.label
                        )
                    )
                    .map((action) => (
                      <button
                        key={action.label}
                        onClick={() => ajouterAction(action)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-600/30"
                      >
                        <action.icon className="size-3.5" />
                        {action.label}
                      </button>
                    ))}
                  {actionsDisponibles.filter(
                    (a) =>
                      !actionsRapides.some(
                        (existing) => existing.label === a.label
                      )
                  ).length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 col-span-2 text-center py-2">
                      Toutes les actions sont déjà ajoutées
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {actionsRapides.map((action) => (
                <div key={action.id} className="relative group">
                  <Link
                    to={action.to}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50 px-2 py-4 text-center hover:bg-red-50/50 dark:hover:bg-red-900/20 hover:border-red-200/30 dark:hover:border-red-800/30 transition-all group w-full"
                  >
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <action.icon className="size-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {action.label}
                    </span>
                  </Link>
                  <button
                    onClick={() => supprimerAction(action.id)}
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}